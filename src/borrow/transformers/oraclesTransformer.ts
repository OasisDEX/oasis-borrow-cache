import { flatten } from 'lodash';

import {
  handleEvents,
  FullEventInfo,
} from '@oasisdex/spock-utils/dist/transformers/common';
import { getExtractorName, PersistedLog } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { getExtractorName as getExtractorNameBasedOnTopic } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';

import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';

import config from '../../config';
import { Dictionary } from 'ts-essentials';
import BigNumber from 'bignumber.js';
import { wad } from '../../utils/precision';
import { getTokensForOracle } from '../../utils/addresses';

const oracleAbi = require('../../../abis/oracle.json');

const handleLogValue = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
        block_id: log.block_id,
    },
    );
  const tokens = getTokensForOracle(log.address, ((services.config as any).addresses as typeof config))
  const price = new BigNumber(params.val).div(wad)

  const prices = tokens.length > 0 
  ? tokens.map(token => ({
    price: price.toString(),
    token,
    timestamp: timestamp.timestamp,
    osm_address: log.address,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  })) : [{
    price: price.toString(),
    token: "UNKNOWN_OSM_FEED",
    timestamp: timestamp.timestamp,
    osm_address: log.address,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  }]

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

  const query = services.pg.helpers.insert(prices, cs);
  await services.tx.none(query);
};

const handlers = {
  async LogValue(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleLogValue(event.params, log, services);
  },
}

export const oraclesTransformer: () => BlockTransformer = () => {return {
        name: 'oracles_transformer',
        dependencies: [getExtractorNameBasedOnTopic('oracle')],
        transform: async (services, logs) => {
          await handleEvents(services, oracleAbi, flatten(logs), handlers);
        },
    }
};


