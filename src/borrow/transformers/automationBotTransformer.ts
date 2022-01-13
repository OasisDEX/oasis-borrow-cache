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
    trigger_type: params.triggerType.toString(),
    cdp_id: params.cdpId.toString(),
    trigger_data: params.triggerData.toString(),
    active: true,

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO automation_bot.triggers(
          trigger_id, trigger_type, cdp_id, trigger_data, active,
          log_index, tx_id, block_id
        ) VALUES (
            \${trigger_id}, \${trigger_type}, \${cdp_id}, \${trigger_data}, \${active},
            \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
}

async function handleTriggerRemoved(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) {
  const values = {
    trigger_id: params.triggerId.toString(),
    cdp_id: params.cdpId.toString(),
    active: false,

    removed_log_index: log.log_index,
    removed_tx_id: log.tx_id,
    removed_block_id: log.block_id,
  };

  await services.tx.none(
    `UPDATE automation_bot.triggers
      SET active = \${active}, removed_log_index = \${removed_log_index}, removed_tx_id = \${removed_tx_id}, removed_block_id = \${removed_block_id}
      WHERE cdp_id = \${cdp_id} AND trigger_id = \${trigger_id}`,
    values,
  );
}

async function handleApprovalGranted(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) {
  const values = {
    cdp_id: params.cdpId.toString(),
    approved_entity: params.approvedEntity.toLowerCase(),
    active: true,

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO automation_bot.approvals(
      cdp_id, approved_entity, active,
      log_index, tx_id, block_id
    ) VALUES (
        \${cdp_id}, \${approved_entity}, \${active},
        \${log_index}, \${tx_id}, \${block_id}
    );`,
    values,
  );
}

async function handleApprovalRemoved(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) {
  const values = {
    cdp_id: params.cdpId.toString(),
    approved_entity: params.approvedEntity.toLowerCase(),
    active: false,

    removed_log_index: log.log_index,
    removed_tx_id: log.tx_id,
    removed_block_id: log.block_id,
  };

  await services.tx.none(
    `UPDATE automation_bot.approvals
      SET active = \${active}, removed_log_index = \${removed_log_index}, removed_tx_id = \${removed_tx_id}, removed_block_id = \${removed_block_id}
      WHERE cdp_id = \${cdp_id} AND approved_entity = \${approved_entity}`,
    values,
  );
}

const automationBotHandlers = {
  async TriggerAdded(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTriggerAdded(event.params, log, services);
  },
  async TriggerRemoved(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTriggerRemoved(event.params, log, services);
  },
  async ApprovalGranted(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleApprovalGranted(event.params, log, services);
  },
  async ApprovalRemoved(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleApprovalRemoved(event.params, log, services);
  },
};

export const getAutomationBotTransformerName = (address: string) =>
  `automationBotTransformer-${address}`;
export const automationBotTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getAutomationBotTransformerName(deps.address),
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, automationBotAbi, flatten(logs), automationBotHandlers);
      },
    };
  });
};
