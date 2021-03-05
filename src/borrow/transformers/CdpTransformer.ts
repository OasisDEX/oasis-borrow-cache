import { flatten } from 'lodash';
import { parseBytes32String } from 'ethers/utils';
import { Dictionary } from 'ts-essentials'

import { handleEvents, FullEventInfo, handleDsNoteEvents, FullNoteEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
  getExtractorName,
  PersistedLog,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { normalizeAddressDefinition } from 'cache/src/utils';

const cdpManagerAbi = require('../../../abis/dss-cdp-manager.json');
const vatAbi = require('../../../abis/vat.json');

const handle = async (
  _type: string,
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) => {
  const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
      block_id: log.block_id,
    },
  );
  const values = {
    creator: params.usr.toLowerCase(),
    owner: params.own.toLowerCase(),
    address: log.address,
    cdp_id: params.cdp.toString(),
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
    timestamp: timestamp.timestamp,
  };

  await services.tx.none(
    `INSERT INTO borrow.cdp(
       creator, owner, address, cdp_id, log_index, tx_id, block_id, timestamp
     ) VALUES (
       \${creator}, \${owner}, \${address}, \${cdp_id}, \${log_index},
       \${tx_id}, \${block_id}, \${timestamp}
     );`,
    values,
  );
};

const handlers = {
  async NewCdp(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('NewCdp', event.params, log, services);
  },
};

export const cdpTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: `cdpTransformer-${deps.address}`,
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, cdpManagerAbi, flatten(logs), handlers);
      },
    };
  });
};

const noteHandlers = {
  async 'open(bytes32,address)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ) {
    await services.tx.oneOrNone(
      `UPDATE borrow.cdp SET ilk = \${ilk} WHERE log_index = \${log_index} AND block_id = \${block_id}`,
      {
        ilk: parseBytes32String(note.params.ilk),
        log_index: log.log_index - 1,
        block_id: log.block_id
      },
    );
  },
  async 'hope(address)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ) {
    debugger
    await services.tx.oneOrNone(
      `UPDATE borrow.cdp SET urn = \${urn} WHERE block_id = \${block_id}`,
      {
        urn: note.caller,
        // log_index: log.log_index - 1,
        block_id: log.block_id
      },
    );
  },
}

export const cdpTransformerNote: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: `cdpTransformerNote-${deps.address}`,
      dependencies: [getExtractorName(deps.address)],
      transformerDependencies: [`cdpTransformer-${deps.address}`],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleDsNoteEvents(services, cdpManagerAbi, flatten(logs), noteHandlers, 2);
      },
    };
  });
}

export const makeCDPNoteDependencies = (addresses: (string | SimpleProcessorDefinition)[]) => {
  return addresses
    .map(normalizeAddressDefinition)
    .map(deps => `cdpTransformerNote-${deps.address}`)
}

export const vatUrnTransformerNote: (
  addresses: (string | SimpleProcessorDefinition),
  transformerDependencies: string[],
) => BlockTransformer = (addresses, transformerDependencies) => {
  const deps = normalizeAddressDefinition(addresses);

  return {
    name: `vatUrnTransformerNote-${deps.address}`,
    dependencies: [getExtractorName(deps.address)],
    transformerDependencies: [...transformerDependencies],
    startingBlock: deps.startingBlock,
    transform: async (services, logs) => {
      await handleDsNoteEvents(services, vatAbi, flatten(logs), noteHandlers, 2);
    },
  }
}