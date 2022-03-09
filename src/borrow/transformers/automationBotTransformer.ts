import { Dictionary } from 'ts-essentials';
import { flatten, max, min } from 'lodash';
import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
  getExtractorName,
  PersistedLog,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { getAddressesFromConfig, normalizeAddressDefinition } from '../../utils';
import { getMultiplyTransformerName } from './multiply';
import { Provider } from 'ethers/providers';

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
       (kind = 'exit_collateral' or kind = 'exit_dai') and tx_id = ${log.tx_id}
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

export const getAutomationBotTransformerName = (address: string) =>
  `automationBotTransformer-${address}`;
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

export function getTriggerEventsCombineTransformerName(automationBot: SimpleProcessorDefinition) : string {
  return `triggerEventsCombineTransformer-${automationBot.address}`
}

interface TriggerAdded {
  id: number;
  trigger_id: number;
  cdp_id: number;
  trigger_data: number;
  log_index: number;
  tx_id: number;
  block_id: number;
  timestamp: Date;
}

interface TriggerExecuted {
  id: number;
  trigger_id: number;
  cdp_id: number;
  vault_closed_event: number;
  log_index: number;
  tx_id: number;
  block_id: number;
  timestamp: Date;
}

interface TriggerRemoved {
  id: number;
  trigger_id: number;
  cdp_id: number;
  log_index: number;
  tx_id: number;
  block_id: number;
}

interface CombineTransformerDependencies {
  managerAddress: string,
  getUrnForCdp: (
    provider: Provider,
    id: string,
    managerAddress: string
    ) => Promise<string>
}

export function triggerEventsCombineTransformer (
  addresses: string | SimpleProcessorDefinition,
  dependencies: CombineTransformerDependencies
) : BlockTransformer{
  const deps = normalizeAddressDefinition(addresses);

  return {
    name: getTriggerEventsCombineTransformerName(deps),
    dependencies: [getExtractorName(deps.address)],
    transformerDependencies: [`automationBotTransformer-${deps.address}`],
    startingBlock: deps.startingBlock,
    transform: async (services, _logs) => {
      const logs = flatten(_logs);
      if (logs.length === 0) {
        return;
      }
      const blocks = Array.from(new Set(logs.map(log => log.block_id)));

      const minBlock = min(blocks);
      const maxBlock = max(blocks);
      
      const trigger_added_events = flatten(
        await services.tx.multi<TriggerAdded>(
          `
          select *
          from automation_bot.trigger_added_events tae 
          where block_id >= ${minBlock} and block_id <= ${maxBlock};
          `,
        ),
      );

      const trigger_executed_events = flatten(
        await services.tx.multi<TriggerExecuted>(
          `
          select *
          from automation_bot.trigger_executed_events tee
          where block_id >= ${minBlock} and block_id <= ${maxBlock};
          `,
        ),
      );

      const trigger_removed_events = flatten(
        await services.tx.multi<TriggerRemoved>(
          `
          select *
          from automation_bot.trigger_removed_events tre 
          where block_id >= ${minBlock} and block_id <= ${maxBlock};
          `,
        ),
      );

     const triggerAddedVaultEvents = await Promise.all(loadAsVaultEvents(trigger_added_events, services, 'TRIGGER_ADDED'));
     const triggerExecutedVaultEvents = await Promise.all(loadAsVaultEvents(trigger_executed_events, services, 'TRIGGER_EXECUTED'));
     const triggerRemovedVaultEvents = await Promise.all(loadAsVaultEvents(trigger_removed_events, services, 'TRIGGER_REMOVED'));

      const vaultEventsColumnSet = createVaultEventsColumnSet(services)
      const allTriggerEvents = triggerAddedVaultEvents.concat(triggerExecutedVaultEvents, triggerRemovedVaultEvents)
      const query = services.pg.helpers.insert(allTriggerEvents, vaultEventsColumnSet)
      await services.tx.none(query);
    }
  }

  function loadAsVaultEvents(trigger_events: TriggerAdded[] | TriggerExecuted[] | TriggerRemoved[], services: LocalServices, kindOfEvent: string): Promise<{ kind: string; collateral_amount: number; dai_amount: number; urn: string; ilk: string; timestamp: Date; tx_id: number; block_id: number; log_index: number; }>[] {
    return trigger_events.map(async (event) => {

      const timestampOfTransaction = await services.tx.one<{ timestamp: Date; }>(
        `select timestamp from vulcan2x.block b where id = ${event.block_id};`
      );

      const urn = await dependencies.getUrnForCdp(
        (services as any).provider as Provider,
        event.cdp_id.toString(),
        dependencies.managerAddress
      );

      return {
        kind: kindOfEvent,
        collateral_amount: 0,
        dai_amount: 0,
        urn: urn,
        ilk: '',
        timestamp: timestampOfTransaction.timestamp,
        tx_id: event.tx_id,
        block_id: event.block_id,
        log_index: event.log_index,
      };
    });
  }
}

function createVaultEventsColumnSet(services: LocalServices) {
  return new services.pg.helpers.ColumnSet(
    [
      'kind',
      'collateral_amount',
      'dai_amount',
      'urn',
      'timestamp',
      'tx_id',
      'block_id',
      'log_index',
      'ilk',
    ],
    {
      table: {
        table: 'events',
        schema: 'vault',
      },
    }
  );
}
