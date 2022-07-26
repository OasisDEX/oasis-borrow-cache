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

const AutomationAggregatorBotAbi = require('../../../abis/automation-aggragator-bot.json');

async function handleTriggerGroupAdded(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) {
  const values = {
    group_id: params.groupId.toString(),
    group_type: params.groupTypeId.toString(),
    cdp_id: (1).toString(), // TODO: params.cdpId.toString(),
    trigger_ids: params.triggerIds.map((item: BigInt) => Number(item)),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO automation_aggregator_bot.trigger_group_added_events(
      group_id, group_type, cdp_id, trigger_ids, log_index, tx_id, block_id
    ) VALUES (
        \${group_id}, \${group_type}, \${cdp_id}, \array[\${trigger_ids}], \${log_index}, \${tx_id}, \${block_id}
    );`,
    values,
  );

  values.trigger_ids.map(async (item: BigInt) => {
    await services.tx.none(
      `INSERT INTO automation_bot.groupped_triggers(
      group_id, trigger_id
    ) VALUES (
        \${group_id}, ${Number(item)}
    );`,
      values,
    );
  });
}

async function handleTriggerGroupRemoved(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) {
  const values = {
    group_id: params.groupId.toString(),
    trigger_ids: params.triggerIds.map((item: BigInt) => Number(item)),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO automation_aggregator_bot.trigger_group_removed_events(
      group_id, trigger_ids, log_index, tx_id, block_id
    ) VALUES (
        \${group_id},  \array[\${trigger_ids}], \${log_index}, \${tx_id}, \${block_id}
    );`,
    values,
  );
}

const automationAggregatorBotHandlers = {
  async TriggerGroupAdded(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTriggerGroupAdded(event.params, log, services);
  },
  async TriggerGroupRemoved(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTriggerGroupRemoved(event.params, log, services);
  },
};

export const getAutomationAggregatorBotTransformerName = (address: string) =>
  `automationAggregatorBotTransformer-${address}`;
export const automationAggregatorBotTransformer: (
  address: string | SimpleProcessorDefinition,
  multiplyProxyActionsAddress: SimpleProcessorDefinition[],
) => BlockTransformer = (address, multiplyProxyActionsAddress) => {
  const deps = normalizeAddressDefinition(address);

  return {
    name: getAutomationAggregatorBotTransformerName(deps.address),
    dependencies: [getExtractorName(deps.address)],
    transformerDependencies: multiplyProxyActionsAddress.map(mpa =>
      getMultiplyTransformerName(mpa),
    ),
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
