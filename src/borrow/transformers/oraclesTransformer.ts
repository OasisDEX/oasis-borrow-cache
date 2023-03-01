import { flatten } from 'lodash';

import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
  PersistedLog,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';

import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';

import BigNumber from 'bignumber.js';
import { wad } from '../../utils/precision';
import { normalizeAddressDefinition } from '../../utils';
import { getCustomExtractorNameBasedOnTopicIgnoreConflicts } from '../customExtractors';
import { providers } from 'ethers';
import { MessageNames, MessageTypes, sendMessage } from '../../utils/awsQueue';
import { eligibleTokens } from '../../types/discover';

const oracleAbi = require('../../../abis/oracle.json');
const lpOracleAbi = require('../../../abis/lp-oracle.json');

const OSM_NEXT_PRICE_STORAGE_SLOT = 4;

interface Price {
  price: string;
  next_price: string;
  token: string;
  timestamp: string;
  osm_address: string;
  log_index: number;
  tx_id: number;
  block_id: number;
}

function isLPToken(token: string): boolean {
  return token.startsWith('UNIV2') || token.startsWith('GUNIV3');
}

function storageHexToBigNumber(uint256: string) {
  const matches = uint256.match(/^0x(\w+)$/);
  if (!matches?.length) {
    throw new Error(`invalid uint256: ${uint256}`);
  }

  const match = matches[0];
  return match.length <= 32
    ? new BigNumber(uint256)
    : new BigNumber(`0x${match.substring(match.length - 32, match.length)}`);
}

async function savePrices(
  services: LocalServices,
  log: PersistedLog,
  token: string,
  price: BigNumber,
  nextPrice: BigNumber,
  timestamp: string,
): Promise<void> {
  const row: Price = {
    token,
    timestamp,
    price: price.toString(),
    next_price: nextPrice.toString(),
    osm_address: log.address,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  const cs = new services.pg.helpers.ColumnSet(
    ['price', 'next_price', 'token', 'timestamp', 'osm_address', 'tx_id', 'block_id', 'log_index'],
    {
      table: {
        schema: 'oracles',
        table: 'prices',
      },
    },
  );

  const query = services.pg.helpers.insert([row], cs);
  await services.tx.none(query);
}

async function getNextPriceFromStorage(
  services: LocalServices,
  log: PersistedLog,
  blockNumber: number,
) {
  const provider: providers.Provider = (services as any).provider;
  const priceHex = await provider.getStorageAt(
    log.address,
    OSM_NEXT_PRICE_STORAGE_SLOT,
    blockNumber,
  );
  return storageHexToBigNumber(priceHex).div(wad);
}

const handlers = (token: string) => ({
  async LogValue(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const block = await services.tx.oneOrNone(
      `select * from vulcan2x.block where id = ${log.block_id}`,
    );
    const [price, nextPrice] = [
      new BigNumber(event.params.val).div(wad),
      await getNextPriceFromStorage(services, log, block.number),
    ];
    await savePrices(services, log, token, price, nextPrice, block.timestamp);
    if (eligibleTokens.includes(token)) {
      sendMessage(
        MessageNames.OSM,
        MessageTypes.OSM,
        price.toString(),
        `OSM-${token}-${price}-${nextPrice}`,
        `${token}x${block.number}`,
        token,
      );
    }
  },
  async Value(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const block = await services.tx.oneOrNone(
      `select * from vulcan2x.block where id = ${log.block_id}`,
    );
    const [price, nextPrice] = [
      new BigNumber(event.params.curVal).div(wad),
      new BigNumber(event.params.nxtVal).div(wad),
    ];
    await savePrices(services, log, token, price, nextPrice, block.timestamp);
    if (eligibleTokens.includes(token)) {
      sendMessage(
        MessageNames.OSM,
        MessageTypes.OSM,
        price.toString(),
        `OSM-${token}-${price}-${nextPrice}`,
        `${token}x${block.number}`,
        token,
      );
    }
  },
});

export function getOracleTransformerName(
  oracle: SimpleProcessorDefinition & { token: string },
): string {
  return `oracles_transformer_${oracle.address}_${oracle.token}`;
}

export const oraclesTransformer: (
  addresses: (SimpleProcessorDefinition & { token: string })[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getOracleTransformerName(_deps),
      dependencies: [
        getCustomExtractorNameBasedOnTopicIgnoreConflicts('oracle'),
        getCustomExtractorNameBasedOnTopicIgnoreConflicts('lp-oracle'),
      ],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        const logsFromOSM = flatten(logs).filter(
          log => log.address.toLowerCase() === _deps.address.toLowerCase(),
        );
        const abi = isLPToken(_deps.token) ? lpOracleAbi : oracleAbi;
        await handleEvents(services, abi, logsFromOSM, handlers(_deps.token));
      },
    };
  });
};
