import { flatten } from 'lodash';

import {
  handleEvents,
  FullEventInfo,
} from '@oasisdex/spock-utils/dist/transformers/common';
import { PersistedLog, SimpleProcessorDefinition } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { getExtractorName as getExtractorNameBasedOnTopic } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';

import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';

import { Dictionary } from 'ts-essentials';
import BigNumber from 'bignumber.js';
import { wad } from '../../utils/precision';
import { normalizeAddressDefinition } from '../../utils';

const oracleAbi = require('../../../abis/oracle.json');

const handleLogValue = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices, token: string) => {

const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
        block_id: log.block_id,
    },
    );
  const price = new BigNumber(params.val).div(wad)

  const row = {
    price: price.toString(),
    token,
    timestamp: timestamp.timestamp,
    osm_address: log.address,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  }

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
};

const handlers = (token: string) => ({
  async LogValue(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleLogValue(event.params, log, services, token);
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
      dependencies: [getExtractorNameBasedOnTopic('oracle')],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        const logsFromOSM = flatten(logs).filter(log => log.address.toLowerCase() === _deps.address.toLowerCase())
        await handleEvents(services, oracleAbi, logsFromOSM, handlers(_deps.token));
      },
    };
  });
};
