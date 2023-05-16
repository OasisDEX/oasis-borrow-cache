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

const stethAbi = require('../../../abis/steth.json');

async function handleTokenRebased(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
): Promise<void> {
  const values = {
    postTotalEther: params.postTotalEther.toString(),
    postTotalShares: params.postTotalShares.toString(),
    preTotalEther: params.preTotalEther.toString(),
    preTotalShares: params.preTotalShares.toString(),
    reportTimestamp: params.reportTimestamp.toString(),
    sharesMintedAsFees: params.sharesMintedAsFees.toString(),
    timeElapsed: params.timeElapsed.toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO lido.token_rebased(
          postTotalEther, postTotalShares, preTotalEther, preTotalShares, reportTimestamp, sharesMintedAsFees, timeElapsed,
          log_index, tx_id, block_id
        ) VALUES (
          \${postTotalEther}, \${postTotalShares}, \${preTotalEther}, \${preTotalShares}, \${reportTimestamp}, \${sharesMintedAsFees}, \${timeElapsed},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
}

const stethHandlers = {
  async TokenRebased(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTokenRebased(event.params, log, services);
  },
};

export const getStethTransformerName = (address: string) => `steth-transformer-${address}`;
export const stethTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getStethTransformerName(deps.address),
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, stethAbi, flatten(logs), stethHandlers);
      },
    };
  });
};
