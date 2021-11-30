import { flatten } from 'lodash';
import { Dictionary } from 'ts-essentials';

import {
  handleEvents,
  FullEventInfo,
  FullNoteEventInfo,
  handleDsNoteEvents,
  DsNoteHandlers,
} from '@oasisdex/spock-utils/dist/transformers/common';
import {
  getExtractorName,
  PersistedLog,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { getAddressesFromConfig, normalizeAddressDefinition } from '../../utils';
import { Provider } from 'ethers/providers';

const cdpManagerAbi = require('../../../abis/dss-cdp-manager.json');

const handleNewCdp = async (
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
  dependencies: OpenCdpTransformerDependencies,
) => {
  const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
      block_id: log.block_id,
    },
  );

  const urn = await dependencies.getUrnForCdp(
    (services as any).provider as Provider,
    params.cdp.toString(),
    log.address,
  );

  const values = {
    creator: params.usr.toLowerCase(),
    owner: params.own.toLowerCase(),
    address: log.address,
    cdp_id: params.cdp.toString(),
    urn: urn.toLowerCase(),
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
    created_at: timestamp.timestamp,
  };

  const eventValues = {
    kind: 'OPEN',
    urn: urn.toLowerCase(),
    vault_creator: params.usr.toLowerCase(),
    timestamp: timestamp.timestamp,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
    cdp_id: params.cdp.toString(),
  };

  await services.tx.none(
    `
    INSERT INTO vault.events(
      kind,
      urn,
      vault_creator,
      timestamp,
      log_index,
      tx_id, 
      block_id,
      cdp_id
    ) VALUES (
      \${kind}, 
      \${urn}, 
      \${vault_creator}, 
      \${timestamp}, 
      \${log_index},
      \${tx_id}, 
      \${block_id},
      \${cdp_id}
    )
  `,
    eventValues,
  );

  await services.tx.none(
    `INSERT INTO manager.cdp(
       creator, owner, address, cdp_id, urn, log_index, tx_id, block_id, created_at
     ) VALUES (
       \${creator}, \${owner}, \${address}, \${cdp_id}, \${urn}, \${log_index},
       \${tx_id}, \${block_id}, \${created_at}
     );`,
    values,
  );
};

const handlers = (dependencies: OpenCdpTransformerDependencies) => ({
  async NewCdp(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleNewCdp(event.params, log, services, dependencies);
  },
});

interface OpenCdpTransformerDependencies {
  getUrnForCdp: (provider: Provider, id: string, managerAddress: string) => Promise<string>;
}

export function getOpenCdpTransformerName(manager: SimpleProcessorDefinition): string {
  return `openCdpTransformer-${manager.address}`;
}

export const openCdpTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
  dependencies: OpenCdpTransformerDependencies,
) => BlockTransformer[] = (addresses, dependencies) => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getOpenCdpTransformerName(deps),
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, cdpManagerAbi, flatten(logs), handlers(dependencies));
      },
    };
  });
};

function cdpManagerGiveNoteHandlers(migrationAddress: string): DsNoteHandlers {
  return {
    async 'give(uint256,address)'(
      services: LocalServices,
      { note, log }: FullNoteEventInfo,
    ): Promise<void> {
      const cdp = await services.tx.oneOrNone(
        `
      SELECT * FROM manager.cdp WHERE cdp_id = \${cdp_id}
    `,
        { cdp_id: note.params.cdp.toString() },
      );

      const timestamp = await services.tx.oneOrNone(
        `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
        {
          block_id: log.block_id,
        },
      );

      const values = {
        kind: note.caller.toLowerCase() === migrationAddress.toLowerCase() ? 'MIGRATE' : 'TRANSFER',
        cdp_id: note.params.cdp.toString(),
        transfer_from: note.caller.toLowerCase(),
        transfer_to: note.params.dst.toLowerCase(),
        urn: cdp.urn,
        timestamp: timestamp.timestamp,

        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
      };

      await services.tx.none(
        `INSERT INTO vault.events(
        kind, transfer_from, transfer_to, cdp_id, urn, timestamp,
        log_index, tx_id, block_id
      ) VALUES (
        \${kind}, \${transfer_from}, \${transfer_to}, \${cdp_id}, \${urn}, \${timestamp},
        \${log_index}, \${tx_id}, \${block_id}
      );`,
        values,
      );
    },
  };
}

export const managerGiveTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: `managerGiveNoteTransformer-${deps.address}`,
      dependencies: [getExtractorName(deps.address)],
      transformerDependencies: [`openCdpTransformer-${deps.address}`],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        const addresses = getAddressesFromConfig(services);
        await handleDsNoteEvents(
          services,
          cdpManagerAbi,
          flatten(logs),
          cdpManagerGiveNoteHandlers(addresses.MIGRATION),
          2,
        );
      },
    };
  });
};
