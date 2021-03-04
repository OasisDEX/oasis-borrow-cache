import { flatten } from 'lodash';
import { parseBytes32String } from 'ethers/utils';
import { BigNumber } from 'bignumber.js';

import {
  getExtractorName,
  PersistedLog,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import {
  handleEvents,
  handleDsNoteEvents,
  FullEventInfo,
  FullNoteEventInfo,
} from '@oasisdex/spock-utils/dist/transformers/common';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { getIlkPrecision } from './tokenPrecision';
import { Dictionary } from 'ts-essentials';
import { normalizeAddressDefinition } from 'cache/src/utils';

const catAbi = require('../../../abis/cat.json');
const flipperAbi = require('../../../abis/flipper.json');

const handle = async (
  type: string,
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) => {
  // note: can be null
  let ilk = params.ilk && parseBytes32String(params.ilk);
  if (!ilk) {
    const tryIlk = await services.tx.oneOrNone(
      `SELECT ilk FROM multiply.event WHERE auction_id = $1 AND ilk IS NOT NULL LIMIT 1`,
      params.id.toNumber(),
    );
    ilk = tryIlk?.ilk;
  }
  let urn = params.usr || params.urn;
  urn = urn && urn.toLowerCase();
  let owner: string | null; // note: can be null
  if (urn) {
    const tryOwner = await services.tx.oneOrNone(
      `SELECT owner FROM multiply.cdp WHERE urn = $1 LIMIT 1`,
      urn,
    );
    owner = tryOwner?.owner;
  } else {
    const tryOwner = await services.tx.oneOrNone(
      `SELECT owner FROM multiply.event WHERE auction_id = $1 AND owner IS NOT NULL LIMIT 1`,
      params.id.toNumber(),
    );
    owner = tryOwner?.owner;
  }
  if (!owner) {
    console.log(
      'Skipping unrelated event. This can happen for events for CDPs that we don`t track',
      log,
    );
    return;
  }
  const ilk_decimals = await getIlkPrecision(services, ilk);
  const dai_decimals = await getIlkPrecision(services, 'DAI');
  const ink =
    params.ink && new BigNumber(params.ink).div(new BigNumber(`1e${ilk_decimals}`)).toString();
  const lot =
    params.lot && new BigNumber(params.lot).div(new BigNumber(`1e${ilk_decimals}`)).toString();
  const bid =
    params.bid && new BigNumber(params.bid).div(new BigNumber(`1e${dai_decimals + 27}`)).toString();
  const tab =
    params.tab && new BigNumber(params.tab).div(new BigNumber(`1e${dai_decimals + 27}`)).toString();
  const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
      block_id: log.block_id,
    },
  );

  const values = {
    type,
    ilk,
    auction_id: params.id.toNumber(),
    ink,
    lot,
    bid,
    tab,
    owner,
    address: log.address,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
    timestamp: timestamp.timestamp,
  };

  await services.tx.none(
    `INSERT INTO multiply.event(
       type, ilk, auction_id, ink, lot, bid, tab, owner, address, log_index, tx_id, block_id, timestamp
     ) VALUES (
       \${type}, \${ilk}, \${auction_id}, \${ink}, \${lot}, \${bid}, \${tab}, \${owner}, \${address},
       \${log_index}, \${tx_id}, \${block_id}, \${timestamp}
     );`,
    values,
  );
};

const handlers = {
  async Kick(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('Kick', event.params, log, services);
  },
  async Bite(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('Bite', event.params, log, services);
  },
};

const dsNoteHandlers = {
  async 'tend(uint256,uint256,uint256)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ): Promise<void> {
    await handle('Tend', note.params, log, services);
  },
  async 'dent(uint256,uint256,uint256)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ): Promise<void> {
    await handle('Dent', note.params, log, services);
  },
  async 'deal(uint256)'(services: LocalServices, { note, log }: FullNoteEventInfo): Promise<void> {
    await handle('Deal', note.params, log, services);
  },
};

export const mcdTransformerCat: (
  cdpTransformers: string[],
  catAddresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = (cdpTransformers, catAddresses) => {
  return catAddresses.map(address => {
    const cats = normalizeAddressDefinition(address);
    return {
      name: `mcdTransformerCat-${cats.address}`,
      dependencies: [getExtractorName(cats.address)],
      startingBlock: cats.startingBlock,
      transformerDependencies: cdpTransformers.map(a => `cdpTransformer-${a}`),
      transform: async (services, logs) => {
        await handleEvents(services, catAbi, flatten(logs), handlers);
      },
    };
  });
};

export const mcdTransformerFlip: (
  addresses: { cat: string; flip: string | SimpleProcessorDefinition }[],
) => BlockTransformer[] = addresses => {
  return addresses.map(address => {
    const flipNormalized = normalizeAddressDefinition(address.flip);
    return {
      name: `mcdTransformerFlip-${flipNormalized.address}`,
      dependencies: [getExtractorName(flipNormalized.address)],
      startingBlock: flipNormalized.startingBlock,
      transformerDependencies: [`mcdTransformerCat-${address.cat}`],
      transform: async (services, logs) => {
        await handleEvents(services, flipperAbi, flatten(logs), handlers);
      },
    };
  });
};

export const mcdTransformerFlipDsNote: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_address => {
    const def = normalizeAddressDefinition(_address);
    return {
      name: `mcdTransformerFlipDsNote-${def.address}`,
      dependencies: [getExtractorName(def.address)],
      startingBlock: def.startingBlock,
      transformerDependencies: [`mcdTransformerFlip-${def.address}`],
      transform: async (services, logs) => {
        await handleDsNoteEvents(services, flipperAbi, flatten(logs), dsNoteHandlers, 2);
      },
    };
  });
};
