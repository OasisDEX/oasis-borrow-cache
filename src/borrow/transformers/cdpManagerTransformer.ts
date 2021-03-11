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
import { normalizeAddressDefinition } from 'cache/src/utils';

const cdpManagerAbi = require('../../../abis/dss-cdp-manager.json');

const handleNewCdp = async (
  _type: string,
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
  dependencies: { getUrnForCdp: (id: string) => Promise<string> }
) => {
  const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
      block_id: log.block_id,
    },
  );
  const urn = await dependencies.getUrnForCdp(params.cdp.toString())

  const values = {
    creator: params.usr.toLowerCase(),
    owner: params.own.toLowerCase(),
    address: log.address,
    cdp_id: params.cdp.toString(),
    urn,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
    created_at: timestamp.timestamp,
  };


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

const handlers = (dependencies: { getUrnForCdp: (id: string) => Promise<string> }) => ({
  async NewCdp(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleNewCdp('NewCdp', event.params, log, services, dependencies);
  },
});

export const openCdpTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {

  return addresses.map(_deps => {
    const provider = ethers.getDefaultProvider()
    const deps = normalizeAddressDefinition(_deps);

    const contract = new ethers.Contract(deps.address, cdpManagerAbi, provider)

    const getUrnForCdp = async (id: string) => {
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

const cdpManagerFrobNoteHandlers = {
  async 'frob(uint256,int256,int256)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ) {
    const values = {
      cdp_id: note.params.cdp.toString(),
      dink: note.params.dink.toString(),
      dart: note.params.dart.toString(),
      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    }
    services.tx.none(
      `INSERT INTO manager.frob(
        cdp_id, dink, dart, log_index, tx_id, block_id
      ) VALUES (
        \${cdp_id}, \${dink}, \${dart}, \${log_index},
        \${tx_id}, \${block_id}
      );`,
      values)
  }
}

export const managerFrobTransformer: (
  addresses: (string | SimpleProcessorDefinition)[]
) => BlockTransformer[] = (addresses) => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: `managerFrobNoteTransformer-${deps.address}`,
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleDsNoteEvents(services, cdpManagerAbi, flatten(logs), cdpManagerFrobNoteHandlers, 2);
      },
    };
  });
}

const cdpManagerGiveNoteHandlers = {
  async 'give(uint256,address)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ) {

    debugger
    const values = {
      cdp_id: note.params.cdp.toString(),
      src: note.caller,
      dst: note.params.dst,

      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    }

    services.tx.none(
      `INSERT INTO manager.give(
        cdp_id, src, dst, log_index, tx_id, block_id
      ) VALUES (
        \${cdp_id}, \${src}, \${dst}, \${log_index},
        \${tx_id}, \${block_id}
      );`,
      values)
  }
}

export const managerGiveTransformer: (
  addresses: (string | SimpleProcessorDefinition)[]
) => BlockTransformer[] = (addresses) => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: `managerGiveNoteTransformer-${deps.address}`,
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleDsNoteEvents(services, cdpManagerAbi, flatten(logs), cdpManagerGiveNoteHandlers, 2);
      },
    };
  });
}