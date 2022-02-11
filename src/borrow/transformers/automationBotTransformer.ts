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

const automationBotAbi = require('../../../abis/automation-bot.json');

async function handleTriggerAdded(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) {
  const values = {
    trigger_id: params.triggerId.toString(),
    cdp_id: params.cdpId.toString(),
    command_address: params.commandAddress.toLowerCase(),
    trigger_data: params.triggerData.toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO automation_bot.trigger_added_events(
      trigger_id, cdp_id, command_address, trigger_data, log_index, tx_id, block_id
    ) VALUES (
        \${trigger_id}, \${cdp_id}, \${command_address}, \${trigger_data}, \${log_index}, \${tx_id}, \${block_id}
    );`,
    values,
  );

  console.log(arguments.callee.name);
  console.log({values});
  
}

async function handleTriggerRemoved(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) {
  const values = {
    trigger_id: params.triggerId.toString(),
    cdp_id: params.cdpId.toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO automation_bot.trigger_removed_events(
        trigger_id, cdp_id, log_index, tx_id, block_id
    ) VALUES (
        \${trigger_id}, \${cdp_id}, \${log_index}, \${tx_id}, \${block_id}
    );`,
    values,
  );

  console.log(arguments.callee.name);
  console.log({values});

}

async function handleTriggerExecuted(
  params:Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
  ) {
    const values = {
      trigger_id: params.triggerId.toString(),
      cdp_id: params.cdpId.toString(),
  
      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

  await services.tx.none(
    `INSERT INTO automation_bot.trigger_removed_events(
        trigger_id, cdp_id, log_index, tx_id, block_id
    ) VALUES (
        \${trigger_id}, \${cdp_id}, \${log_index}, \${tx_id}, \${block_id}
    );`,
    values,
  );

  console.log(arguments.callee.name);
  console.log({values})

}

const automationBotHandlers = {
  async TriggerAdded(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTriggerAdded(event.params, log, services);
  },
  async TriggerRemoved(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTriggerRemoved(event.params, log, services);
  },
  async TriggerExecuted(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTriggerExecuted(event.params, log, services);
  },
};

export const getAutomationBotTransformerName = (address: string) =>
  `automationBotTransformer-${address}`;
export const automationBotTransformer: (
  address: string | SimpleProcessorDefinition,
) => BlockTransformer = address => {
  const deps = normalizeAddressDefinition(address);

  return {
    name: getAutomationBotTransformerName(deps.address),
    dependencies: [getExtractorName(deps.address)],
    transform: async (services, logs) => {
      await handleEvents(services, automationBotAbi, flatten(logs), automationBotHandlers);
    },
  };
};
