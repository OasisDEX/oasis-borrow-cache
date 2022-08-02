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

const lidoAbi = require('../../../abis/lido.json');

async function handlePostTotalShares(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
): Promise<void> {
  const values = {
    postTotalPooledEther: params.postTotalPooledEther.toString(),
    preTotalPooledEther: params.preTotalPooledEther.toString(),
    timeElapsed: params.timeElapsed.toString(),
    totalShares: params.totalShares.toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO lido.post_total_shares(
          post_total_pooled_ether, pre_total_pooled_ether, time_elapsed, total_shares,
          log_index, tx_id, block_id
        ) VALUES (
          \${postTotalPooledEther}, \${preTotalPooledEther}, \${timeElapsed}, \${totalShares},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
}

const lidoHandlers = {
  async PostTotalShares(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handlePostTotalShares(event.params, log, services);
  },
};

export const getLidoTransformerName = (address: string) => `lido-transformer-${address}`;
export const lidoTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getLidoTransformerName(deps.address),
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, lidoAbi, flatten(logs), lidoHandlers);
      },
    };
  });
};
