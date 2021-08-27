import { flatten } from 'lodash';

import {
  handleEvents,
  FullEventInfo,
} from '@oasisdex/spock-utils/dist/transformers/common';
import { getExtractorName, PersistedLog } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';

import { Dictionary } from 'ts-essentials';
import BigNumber from 'bignumber.js';
import { wad } from '../../utils/precision';

const oracleAbi = require('../../../abis/oracle.json');

const handleLogValue = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices, token: string) => {
const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
        block_id: log.block_id,
    },
    );
  
  const price = new BigNumber(params.val).div(wad)

  await services.tx.none(
    `INSERT INTO oracles.prices(
          price, token, timestamp,
          log_index, tx_id, block_id
        ) VALUES (
          \${price}, \${token}, \${timestamp},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    {
        price: price.toString(),
        token,
        timestamp: timestamp.timestamp,
        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
    },
  );
};

const handlers = (token: string) => ({
  async LogValue(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleLogValue(event.params, log, services, token);
  },
})

function getDogTransformerName(address: string) {
    return `oracle_transformer_${address}`
}

export const oraclesTransformer: (
    deps: {address: string, token: string, startingBlock: number}[],
  ) => BlockTransformer[] = deps => {
    return deps.map(dep => {
      
      return {
        name: getDogTransformerName(dep.address),
        dependencies: [getExtractorName(dep.address)],
        startingBlock: dep.startingBlock,
        transform: async (services, logs) => {
          await handleEvents(services, oracleAbi, flatten(logs), handlers(dep.token));
        },
      };
    });
  };