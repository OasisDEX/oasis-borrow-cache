import { flatten } from 'lodash';
import { Dictionary } from 'ts-essentials'
import { ethers } from 'ethers';

import { handleEvents, FullEventInfo, FullNoteEventInfo, handleDsNoteEvents } from '@oasisdex/spock-utils/dist/transformers/common';
import {
  getExtractorName,
  PersistedLog,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { normalizeAddressDefinition } from '../../utils';
import { Provider } from 'ethers/providers';

const cdpManagerAbi = require('../../../abis/dss-cdp-manager.json');

const handleNewCdp = async (
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
  dependencies: { getUrnForCdp: (provider: Provider, id: string) => Promise<string> }
) => {
  const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
      block_id: log.block_id,
    },
  );

  try {
    const urn = await dependencies.getUrnForCdp((services as any).provider as Provider, params.cdp.toString())

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
    }

    services.tx.none(`
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
  `, eventValues)

    services.tx.none(
      `INSERT INTO manager.cdp(
       creator, owner, address, cdp_id, urn, log_index, tx_id, block_id, created_at
     ) VALUES (
       \${creator}, \${owner}, \${address}, \${cdp_id}, \${urn}, \${log_index},
       \${tx_id}, \${block_id}, \${created_at}
     );`,
      values,
    );
  } catch (e) {
    console.log('unknown cdp')
  };
}

const handlers = (dependencies: { getUrnForCdp: (provider: Provider, id: string) => Promise<string> }) => ({
  async NewCdp(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleNewCdp(event.params, log, services, dependencies);
  },
});

export const openCdpTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {

  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);


    const getUrnForCdp = async (provider: Provider, id: string) => {
      const contract = new ethers.Contract(deps.address, cdpManagerAbi, provider)
      return contract.urns(id)
    }

    return {
      name: `openCdpTransformer-${deps.address}`,
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, cdpManagerAbi, flatten(logs), handlers({ getUrnForCdp }));
      },
    };
  });
};

const cdpManagerGiveNoteHandlers = (migrationAddress: string) => ({
  async 'give(uint256,address)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ) {

    const cdp = await services.tx.oneOrNone(`
      SELECT * FROM manager.cdp WHERE cdp_id = \${cdp_id}
    `, { cdp_id: note.params.cdp.toString() })

    const timestamp = await services.tx.oneOrNone(
      `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
      {
        block_id: log.block_id,
      },
    );

    const values = {
      kind: note.caller.toLowerCase() === migrationAddress.toLowerCase() ? 'MIGRATE' : "TRANSFER",
      cdp_id: cdp.cdp_id,
      transfer_from: note.caller.toLowerCase(),
      transfer_to: note.params.dst.toLowerCase(),
      urn: cdp.urn,
      timestamp: timestamp.timestamp,

      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    }

    services.tx.none(
      `INSERT INTO vault.events(
        kind, transfer_from, transfer_to, cdp_id, urn, timestamp,
        log_index, tx_id, block_id
      ) VALUES (
        \${kind}, \${transfer_from}, \${transfer_to}, \${transfer_from}, \${urn}, \${timestamp},
        \${log_index}, \${tx_id}, \${block_id}
      );`,
      values
    )
  }
})

export const managerGiveTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
  migrationAddress: string,
) => BlockTransformer[] = (addresses, migrationAddress) => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: `managerGiveNoteTransformer-${deps.address}`,
      dependencies: [getExtractorName(deps.address)],
      transformerDependencies: [`openCdpTransformer-${deps.address}`],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleDsNoteEvents(services, cdpManagerAbi, flatten(logs), cdpManagerGiveNoteHandlers(migrationAddress), 2);
      },
    };
  });
}