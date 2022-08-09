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

const AutomationAggregatorBotAbi = require('../../../abis/automation-aggragator-bot.json');

interface Dependencies {
  automationBot: {
    address: string;
    startingBlock: number;
  };
}

async function handleTriggerGroupAdded(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) {
  const values = {
    group_id: params.groupId.toNumber(),
    group_type: params.groupType.toString(),
    cdp_id: params.cdpId.toString(),
    trigger_ids: params.triggerIds.map((item: BigInt) => Number(item)),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  const triggerAddedEventsUpdateData = values.trigger_ids.map((element: number) => {
    return {
      group_id: values.group_id,
      trigger_id: element,
      tx_id: values.tx_id,
    };
  });

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
    ' WHERE v.trigger_id = t.trigger_id AND v.tx_id = t.tx_id';

  await services.tx.none(triggerAddedEventsUpdateQuery);

  await services.tx.none(
    `INSERT INTO automation_aggregator_bot.trigger_group_added_events(
      group_id, group_type, cdp_id, trigger_ids, log_index, tx_id, block_id
    ) VALUES (
        \${group_id}, \${group_type}, \${cdp_id}, \array[\${trigger_ids}], \${log_index}, \${tx_id}, \${block_id}
    );`,
    values,
  );
}

const automationAggregatorBotHandlers = {
  async TriggerGroupAdded(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTriggerGroupAdded(event.params, log, services);
  },
};

export const getAutomationAggregatorBotTransformerName = (address: string) =>
  `automationAggregatorBotTransformer-${address}`;

export const automationAggregatorBotTransformer: (
  address: string | SimpleProcessorDefinition,
  dependencies: Dependencies,
) => BlockTransformer = (address, dependencies) => {
  const deps = normalizeAddressDefinition(address);

  return {
    name: getAutomationAggregatorBotTransformerName(deps.address),
    dependencies: [getExtractorName(deps.address)],
    transformerDependencies: [`automationBotTransformer-${dependencies.automationBot.address}`],
    transform: async (services, logs) => {
      await handleEvents(
        services,
        AutomationAggregatorBotAbi,
        flatten(logs),
        automationAggregatorBotHandlers,
      );
    },
  };
};
