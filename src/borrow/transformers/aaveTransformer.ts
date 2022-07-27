import { flatten } from 'lodash';
import { Dictionary } from 'ts-essentials';

import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
  getExtractorName,
  PersistedLog,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { normalizeAddressDefinition } from '../../utils';

const lendingPoolAbi = require('../../../abis/lendingPool.json');

async function handleReserveDataUpdated(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
): Promise<void> {
  const values = {
    liquidityRate: params.liquidityRate.toString(),
    stableBorrowRate: params.stableBorrowRate.toString(),
    variableBorrowRate: params.variableBorrowRate.toString(),
    liquidityIndex: params.liquidityIndex.toString(),
    variableBorrowIndex: params.variableBorrowIndex.toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO aave.reserve_data_updated(
          liquidity_rate, stable_borrow_rate, variable_borrow_rate, liquidity_index, variable_borrow_index,
          log_index, tx_id, block_id
        ) VALUES (
          \${liquidityRate}, \${stableBorrowRate}, \${variableBorrowRate}, \${liquidityIndex}, \${variableBorrowIndex},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
}

const landingPoolHandlers = {
  async ReserveDataUpdated(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleReserveDataUpdated(event.params, log, services);
  },
};

export const getAaveLendingPoolTransformerName = (address: string) => `aave-lending-pool-transformer-${address}`;
export const aaveLendingPoolTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getAaveLendingPoolTransformerName(deps.address),
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, lendingPoolAbi, flatten(logs), landingPoolHandlers);
      },
    };
  });
};
