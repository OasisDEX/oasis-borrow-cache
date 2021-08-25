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

const multiplyAbi = require('../../../abis/multiply-proxy-actions.json');

const handleMultiply = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
  const values = {
    method_name: params.methodName,
    cdp_id: params.cdpId.toString(),
    swap_min_amount: params.swapMinAmount.toString(),
    swap_optimist_amount: params.swapOptimistAmount.toString(),
    collateral_left: params.collateralLeft.toString(),
    dai_left: params.daiLeft.toString(),
    urn: '',

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO multiply.method_called(
          method_name, cdp_id, swap_min_amount, swap_optimist_amount, collateral_left, dai_left, urn,
          log_index, tx_id, block_id
        ) VALUES (
          \${method_name}, \${cdp_id}, \${swap_min_amount}, \${swap_optimist_amount}, \${collateral_left}, \${dai_left}, \${urn},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
};

const handleFL = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
      const values = {
        borrowed: params.borrowed.toString(),
        due: params.due.toString(),
    
        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
      };
    
      await services.tx.none(
        `INSERT INTO multiply.flashloan(
              borrowed, due,
              log_index, tx_id, block_id
            ) VALUES (
              \${borrowed}, \${due},
              \${log_index}, \${tx_id}, \${block_id}
            );`,
        values,
      );
    };

const handlers = {
  async MultipleActionCalled(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleMultiply(event.params, log, services);
  },
  async FLData(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleFL(event.params, log, services);
  },
};

export const multiplyTransformer: (
    addresses: (string | SimpleProcessorDefinition)[],
  ) => BlockTransformer[] = (addresses) => {
    return addresses.map(_deps => {
      const deps = normalizeAddressDefinition(_deps);
  
      return {
        name: `multiplyActions-${deps.address}`,
        dependencies: [getExtractorName(deps.address)],
        startingBlock: deps.startingBlock,
        transform: async (services, logs) => {
          await handleEvents(services, multiplyAbi, flatten(logs), handlers);
        },
      };
    });
  };