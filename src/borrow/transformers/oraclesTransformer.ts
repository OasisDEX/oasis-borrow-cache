import { flatten } from 'lodash';

import {
  handleEvents,
  FullEventInfo,
} from '@oasisdex/spock-utils/dist/transformers/common';
import { PersistedLog, SimpleProcessorDefinition } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';

import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';

import BigNumber from 'bignumber.js';
import { wad } from '../../utils/precision';
import { normalizeAddressDefinition } from '../../utils';
import { getCustomExtractorNameBasedOnDSNoteTopicIgnoreConflicts } from '../customExtractors';

const oracleAbi = require('../../../abis/oracle.json');
const lpOracleAbi = require('../../../abis/lp-oracle.json');

interface Price {
  price: string
  token: string
  timestamp: string,
  osm_address: string,
  log_index: number,
  tx_id: number,
  block_id: number,
}

function isLPToken(token: string) {
  return token.startsWith('UNIV2')
}

async function getTimeStamp(services: LocalServices, block_id: number): Promise<string> {
  const value = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
        block_id: block_id,
    },
  )

  return value.timestamp
}

async function savePriceToDb(services: LocalServices, row: Price) {
  const cs = new services.pg.helpers.ColumnSet(
    [
      'price',
      'token',
      'timestamp',
      'osm_address',
      'tx_id',
      'block_id',
      'log_index',
    ],
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

const savePrice = async (services: LocalServices, log: PersistedLog, price: BigNumber, token: string) => {
  const timestamp = await getTimeStamp(services, log.block_id)
  const row = {
    price: price.toString(),
    token,
    timestamp: timestamp,
    osm_address: log.address,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  }
  await savePriceToDb(services, row)
}

const handlers = (token: string) => ({
  async LogValue(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const price = new BigNumber(event.params.val).div(wad)
    await savePrice(services, log, price, token)
  },
  async Value(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const price = new BigNumber(event.params.curVal).div(wad)
    await savePrice(services, log, price, token)
  },
})

export function getOracleTransformerName(oracle: SimpleProcessorDefinition & {token: string}) {
  return `oracles_transformer_${oracle.address}_${oracle.token}`
}

export const oraclesTransformer: (
  addresses: (SimpleProcessorDefinition & {token: string})[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getOracleTransformerName(_deps),
      dependencies: [
        getCustomExtractorNameBasedOnDSNoteTopicIgnoreConflicts('oracle'), 
        getCustomExtractorNameBasedOnDSNoteTopicIgnoreConflicts('lp-oracle')
      ],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        const logsFromOSM = flatten(logs).filter(log => log.address.toLowerCase() === _deps.address.toLowerCase())
        const abi = isLPToken(_deps.token) ? lpOracleAbi : oracleAbi;
        await handleEvents(services, abi, logsFromOSM, handlers(_deps.token));
      },
    };
  });
};
