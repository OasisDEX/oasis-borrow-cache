import { flatten } from 'lodash';

import {
  handleEvents,
  FullEventInfo,
} from '@oasisdex/spock-utils/dist/transformers/common';
import { getExtractorName, PersistedLog, SimpleProcessorDefinition } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';

import { Dictionary } from 'ts-essentials';
import { normalizeAddressDefinition } from '../../utils';

const exchange = require('../../../abis/exchange.json');

const handleAssetSwap = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
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

const handlers = {
  async AssetSwap(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleAssetSwap(event.params, log, services);
  },
};

export const exchangeTransformer: (
    addresses: (string | SimpleProcessorDefinition)[],
  ) => BlockTransformer[] = (addresses) => {
    return addresses.map(_deps => {
      const deps = normalizeAddressDefinition(_deps);
  
      return {
        name: `exchange-${deps.address}`,
        dependencies: [getExtractorName(deps.address)],
        startingBlock: deps.startingBlock,
        transform: async (services, logs) => {
          await handleEvents(services, exchange, flatten(logs), handlers);
        },
      };
    });
  };