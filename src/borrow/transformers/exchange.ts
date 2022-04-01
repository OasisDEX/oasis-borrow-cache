import { flatten } from 'lodash';

import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
  getExtractorName,
  PersistedLog,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';

import { Dictionary } from 'ts-essentials';
import { normalizeAddressDefinition } from '../../utils';

const exchange = require('../../../abis/exchange.json');

const handleAssetSwap = async (
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) => {
  const values = {
    asset_in: params.assetIn,
    asset_out: params.assetOut,
    amount_in: params.amountIn.toString(),
    amount_out: params.amountOut.toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO exchange.asset_swap(
        asset_in, asset_out, amount_in, amount_out,
          log_index, tx_id, block_id
        ) VALUES (
          \${asset_in}, \${asset_out}, \${amount_in}, \${amount_out},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
};

const handleFeePaid = async (
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) => {
  const values = {
    beneficiary: params.beneficiary,
    amount: params.amount.toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO exchange.fee_paid(
          beneficiary, amount,
          log_index, tx_id, block_id
        ) VALUES (
          \${beneficiary}, \${amount},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
};

const handleSlippageSaved = async (
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) => {
  const values = {
    minimumPossible: params.minimumPossible.toString(),
    actualAmount: params.actualAmount.toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO exchange.slippage_saved(
          minimum_possible, actual_amount,
          log_index, tx_id, block_id
        ) VALUES (
          \${minimumPossible}, \${actualAmount},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
};

const handlers = {
  async AssetSwap(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleAssetSwap(event.params, log, services);
  },
  async FeePaid(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleFeePaid(event.params, log, services);
  },
  async SlippageSaved(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleSlippageSaved(event.params, log, services);
  },
};

export function getExchangeTransformerName(deps: SimpleProcessorDefinition): string {
  return `exchange-${deps.address}`;
}

export const exchangeTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getExchangeTransformerName(deps),
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, exchange, flatten(logs), handlers);
      },
    };
  });
};
