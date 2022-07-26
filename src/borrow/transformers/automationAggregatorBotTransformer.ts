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
    group_type: params.groupTypeId.toString(),
    cdp_id: (1).toString(), // TODO: params.cdpId.toString(),
    trigger_ids: params.triggerIds.map((item: BigInt) => Number(item)),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  const data: object[] = [];
  values.trigger_ids.forEach((element: number) => {
    data.push({
      group_id: values.group_id,
      trigger_id: element,
      group_type: values.group_type,
      cdp_id: values.cdp_id,
    });
  });
  const cs = new services.pg.helpers.ColumnSet(['group_id', 'trigger_id', 'group_type', 'cdp_id'], {
    table: {
      schema: 'automation_bot',
      table: 'trigger_group_added',
    },
  });
  const query = services.pg.helpers.insert(data, cs);

  const updateData: object[] = [];
  values.trigger_ids.forEach((element: number) => {
    updateData.push({
      group_id: values.group_id,
      trigger_id: element,
    });
  });

  const updateCs = new services.pg.helpers.ColumnSet(['group_id', '?trigger_id'], {
    table: {
      schema: 'automation_bot',
      table: 'trigger_added_events',
    },
  });
  const updateQuery =
    services.pg.helpers.update(updateData, updateCs) + ' WHERE v.trigger_id = t.trigger_id';

  await services.tx.none(query);
  await services.tx.none(updateQuery);
  await services.tx.none(
    `INSERT INTO automation_aggregator_bot.trigger_group_added_events(
      group_id, group_type, cdp_id, trigger_ids, log_index, tx_id, block_id
    ) VALUES (
        \${group_id}, \${group_type}, \${cdp_id}, \array[\${trigger_ids}], \${log_index}, \${tx_id}, \${block_id}
    );`,
    values,
  );
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
