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
import { decodeTriggerDataAsJson } from '@oasisdex/automation';

const automationBotAbi = require('../../../abis/automation-bot.json');
const automationBotV2Abi = require('../../../abis/automation-bot-v2.json');

async function handleTriggerAdded(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) {
  const chainId = process.env.VL_CHAIN_NAME === 'mainnet' ? 1 : 5;
  const { positionAddress } = decodeTriggerDataAsJson(params.commandAddress.toLowerCase(), chainId, params.triggerData.toString())

  const values = {
    trigger_id: params.triggerId.toString(),
    cdp_id: params.cdpId?params.cdpId.toString():"0",
    command_address: params.commandAddress.toLowerCase(),
    proxy_address: positionAddress ? positionAddress.toLowerCase() : undefined,
    continous: params.continous,
    trigger_type: params.triggerType?params.triggerType.toString():undefined,
    trigger_data: params.triggerData.toString(),
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO automation_bot.trigger_added_events(
      trigger_id, cdp_id, command_address, proxy_address, continous, trigger_type, trigger_data, log_index, tx_id, block_id
    ) VALUES (
        \${trigger_id}, \${cdp_id}, \${command_address}, \${proxy_address}, \${continous}, \${trigger_type}, \${trigger_data}, \${log_index}, \${tx_id}, \${block_id}
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
    cdp_id: params.cdpId?params.cdpId.toString():"0",

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
    cdp_id: params.cdpId?params.cdpId.toString():"0",
    close_event_id: matchingVaultClosedEvent?.id,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };
  await services.tx.none(
    `INSERT INTO automation_bot.trigger_executed_events(
        trigger_id, cdp_id, vault_closed_event, log_index, tx_id, block_id
    ) VALUES (
        \${trigger_id}, \${cdp_id}, \${close_event_id}, \${log_index}, \${tx_id}, \${block_id}
    );`,
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
  async TriggerExecuted(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTriggerExecuted(event.params, log, services);
  },
};

const automationBotV2Handlers = {
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

export const getAutomationBotV2TransformerName = (address: string) =>
  `automationBotV2Transformer-${address}`;

export const automationBotTransformer: (
  address: string | SimpleProcessorDefinition,
  multiplyProxyActionsAddress: SimpleProcessorDefinition[],
) => BlockTransformer = (address, multiplyProxyActionsAddress) => {
  const deps = normalizeAddressDefinition(address);

  return {
    name: getAutomationBotTransformerName(deps.address),
    dependencies: [getExtractorName(deps.address)],
    transformerDependencies: multiplyProxyActionsAddress.map(mpa =>
      getMultiplyTransformerName(mpa),
    ),
    transform: async (services, logs) => {
      await handleEvents(services, automationBotAbi, flatten(logs), automationBotHandlers);
    },
  };
};

export const automationBotV2Transformer: (
  address: string | SimpleProcessorDefinition,
  multiplyProxyActionsAddress: SimpleProcessorDefinition[],
) => BlockTransformer = (address, multiplyProxyActionsAddress) => {
  const deps = normalizeAddressDefinition(address);

  return {
    name: getAutomationBotV2TransformerName(deps.address),
    dependencies: [getExtractorName(deps.address)],
    transformerDependencies: multiplyProxyActionsAddress.map(mpa =>
      getMultiplyTransformerName(mpa),
    ),
    transform: async (services, logs) => {
      await handleEvents(services, automationBotV2Abi, flatten(logs), automationBotV2Handlers);
    },
  };
};
