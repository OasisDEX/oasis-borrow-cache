import { flatten, max, min } from 'lodash';
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

const aavePool = require('../../../abis/aave-v3-pool.json');

async function handleReserveDataUpdated(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
  isRebuilding: boolean,
): Promise<void> {
  const values = {
    reserve: params.reserve.toString().toLowerCase(),
    liquidityRate: params.liquidityRate.toString(),
    stableBorrowRate: params.stableBorrowRate.toString(),
    variableBorrowRate: params.variableBorrowRate.toString(),
    liquidityIndex: params.liquidityIndex.toString(),
    variableBorrowIndex: params.variableBorrowIndex.toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  const returned: { id: number } = await services.tx.one(
    `INSERT INTO aave_v3.reserve_data_updated(liquidity_rate, stable_borrow_rate, variable_borrow_rate,
                                             liquidity_index, variable_borrow_index,
                                             log_index, tx_id, block_id, reserve)
       VALUES (\${liquidityRate}, \${stableBorrowRate}, \${variableBorrowRate}, \${liquidityIndex},
               \${variableBorrowIndex},
               \${log_index}, \${tx_id}, \${block_id}, \${reserve}) returning id;`,
    values,
  );

  const shouldRefresh = !isRebuilding && returned.id % 10 === 0; // refresh view takes around 12 seconds, so don't refresh when rebuilding from scratch // refresh every approx. 6 minutes

  if (shouldRefresh) {
    await services.tx.none(`refresh materialized view aave_v3.reserve_data_daily_averages;`);
  }
}

const landingPoolHandlers = (isRebuilding: boolean) => ({
  async ReserveDataUpdated(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleReserveDataUpdated(event.params, log, services, isRebuilding);
  },
});

export const getAavev3LendingPoolTransformerName = (address: string) =>
  `aavev3-lending-pool-transformer-${address}`;
export const aavev3LendingPoolTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getAavev3LendingPoolTransformerName(deps.address),
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, _logs) => {
        const logs = flatten(_logs);
        if (logs.length === 0) {
          return;
        }

        const blocks = Array.from(new Set(logs.map(log => log.block_id)));
        const minBlock: number = min(blocks);
        const maxBlock: number = max(blocks);

        const isRebuilding = minBlock !== maxBlock;

        await handleEvents(
          services,
          aavePool,
          flatten(_logs),
          landingPoolHandlers(isRebuilding),
        );
      },
    };
  });
};
