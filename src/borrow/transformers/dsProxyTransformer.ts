import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { PersistedLog } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import { FullEventInfo, handleEvents } from '@oasisdex/spock-utils/dist/transformers/common';
import { flatten } from 'lodash';
import { Dictionary } from 'ts-essentials';
import { getCustomExtractorNameBasedOnTopicIgnoreConflicts } from '../customExtractors';

const automationBotAbi = require('../../../abis/automation-bot.json');

async function handleApprovalGranted(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) {
  const values = {
    cdp_id: params.cdpId.toString(),
    approved_entity: params.approvedEntity.toLowerCase(),
    emitter: log.address.toLowerCase(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO automation_bot.approval_granted_events(
        cdp_id, approved_entity, emitter, log_index, tx_id, block_id
      ) VALUES (
          \${cdp_id}, \${approved_entity}, \${emitter}, \${log_index}, \${tx_id}, \${block_id}
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
    emitter: log.address.toLowerCase(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO automation_bot.approval_removed_events(
        cdp_id, approved_entity, emitter, log_index, tx_id, block_id
      ) VALUES (
        \${cdp_id}, \${approved_entity}, \${emitter}, \${log_index}, \${tx_id}, \${block_id}
      );`,
    values,
  );
}

const dsProxyAutomationBotHandlers = {
  async ApprovalGranted(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleApprovalGranted(event.params, log, services);
  },
  async ApprovalRemoved(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleApprovalRemoved(event.params, log, services);
  },
};

export const dsProxyTransformer: () => BlockTransformer[] = () => {
  return [
    {
      name: 'dsProxyAutomationBotTransformer',
      dependencies: [getCustomExtractorNameBasedOnTopicIgnoreConflicts('automation-bot')],
      transform: async (services, logs) => {
        await handleEvents(services, automationBotAbi, flatten(logs), dsProxyAutomationBotHandlers);
      },
    },
  ];
};
