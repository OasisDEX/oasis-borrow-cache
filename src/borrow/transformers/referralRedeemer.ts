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

const redeemerAbi = require('../../../abis/redeemer.json');

async function handleClaim(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
): Promise<void> {
  const values = {
    user: params.user.toLowerCase(),
    week: params.week.toString(),
    amount: params.amount.toString(),
    redeemer: log.address.toLocaleLowerCase(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO redeemer.claim(
          "user", week, amount, redeemer,
          log_index, tx_id, block_id
        ) VALUES (
          \${user}, \${week}, \${amount}, \${redeemer},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
}

const redeemerHandlers = {
  async Claimed(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleClaim(event.params, log, services);
  },
};

export const getRedeemerTransformerName = (address: string) => `redeemerTransformer-${address}`;
export const redeemerTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getRedeemerTransformerName(deps.address),
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, redeemerAbi, flatten(logs), redeemerHandlers);
      },
    };
  });
};
