import { Dictionary } from 'ts-essentials';
import { flatten } from 'lodash';
import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
  getExtractorName,
  PersistedLog,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { normalizeAddressDefinition } from '../../utils';
import { getMultiplyTransformerName } from './multiply';

const automationBotAbi = require('../../../abis/automation-bot.json');

interface Dependencies {
  automationBot: {
    address: string;
    startingBlock: number;
  };
  automationAggregatorBot: {
    address: string;
    startingBlock: number;
  };
}

async function handleTriggerExecuted(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) {
  // Closed event exist for multiply vaults but not for borrow vaults.
  // User can payback DAI and withdraw collateral, but it doesn't mean vault is closed.
  // One can deposit collateral and generate again on existing vault. ~ŁW
  const matchingVaultClosedEvent = await services.tx.oneOrNone(
    `SELECT * FROM vault.multiply_events me WHERE
       (kind = 'CLOSE_VAULT_TO_COLLATERAL' or kind = 'CLOSE_VAULT_TO_DAI') and tx_id = ${log.tx_id}
      LIMIT 1;`,
  );

  const values = {
    trigger_id: params.triggerId.toString(),
    cdp_id: params.cdpId.toString(),
    close_event_id: matchingVaultClosedEvent?.id,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };
  // we get the event where replaced trigger has been added - to get the group type
  const executedTriggerAddedEvent = await services.tx.oneOrNone(
    `SELECT * FROM automation_bot.trigger_added_events me WHERE
       cdp_id = ${values.cdp_id} and trigger_id = ${values.trigger_id}`,
  );

  if (executedTriggerAddedEvent?.group_id != null) {
    // we get the event where the new (replacing) trigger has been added to get its trigger_id
    const newTriggerAddedEvent = await services.tx.oneOrNone(
      `SELECT * FROM automation_bot.trigger_added_events me WHERE
       cdp_id = ${values.cdp_id} and tx_id = ${values.tx_id} and log_index=${values.log_index - 1}`,
    );

    const triggerAddedEventsUpdateData: object = {
      group_id: executedTriggerAddedEvent.group_id,
      trigger_id: newTriggerAddedEvent.trigger_id,
    };

    const triggerAddedEventsUpdateCs = new services.pg.helpers.ColumnSet(
      ['group_id', '?trigger_id', '?tx_id'],
      {
        table: {
          schema: 'automation_bot',
          table: 'trigger_added_events',
        },
      },
    );

    const triggerAddedEventsUpdateQuery =
      services.pg.helpers.update(triggerAddedEventsUpdateData, triggerAddedEventsUpdateCs) +
      ` WHERE trigger_id = ${newTriggerAddedEvent.trigger_id} and tx_id = ${values.tx_id}`;

    await services.tx.none(triggerAddedEventsUpdateQuery);
  }
}

const automationBotExecutedHandlers = {
  async TriggerExecuted(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTriggerExecuted(event.params, log, services);
  },
};

export const getAutomationBotExecutedTransformerName = (address: string) =>
  `automationBotExecutedTransformer-${address}`;
export const automationBotExecutedTransformer: (
  address: string | SimpleProcessorDefinition,
  dependencies: Dependencies,
) => BlockTransformer = (address, dependencies) => {
  const deps = normalizeAddressDefinition(address);

  return {
    name: getAutomationBotExecutedTransformerName(deps.address),
    dependencies: [getExtractorName(deps.address)],
    transformerDependencies: [
      `automationBotTransformer-${dependencies.automationBot.address}`,
      `automationAggregatorBotTransformer-${dependencies.automationAggregatorBot.address}`,
    ],
    transform: async (services, logs) => {
      await handleEvents(services, automationBotAbi, flatten(logs), automationBotExecutedHandlers);
    },
  };
};
