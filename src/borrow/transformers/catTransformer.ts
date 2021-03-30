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
import { parseBytes32String } from 'ethers/utils';
import BigNumber from 'bignumber.js';
import { Ilk } from '../services/getIlkInfo';

const catAbi = require('../../../abis/cat.json');
async function handleBite(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
): Promise<void> {
  const values = {
    auction_id: params.id.toString(),
    ilk: parseBytes32String(params.ilk),
    urn: params.urn.toLowerCase(),
    ink: params.ink.toString(),
    art: params.art.toString(),
    tab: params.tab.toString(),
    flip: params.flip.toLowerCase(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO auctions.bite(
          ilk, urn, ink, art, tab, flip, auction_id,
          log_index, tx_id, block_id
        ) VALUES (
          \${ilk}, \${urn}, \${ink}, \${art}, \${tab}, \${flip}, \${auction_id},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
}

async function handleAuctionStarted(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
  dependencies: CatTransformerDependencies,
): Promise<void> {
  const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
      block_id: log.block_id,
    },
  );

  const ilkData = await dependencies.getIlkInfo(params.ilk, services);

  const event = {
    kind: 'AUCTION_STARTED',
    collateral: ilkData.symbol,
    collateral_amount: new BigNumber(params.ink)
      .div(new BigNumber(10).pow(ilkData.dec.toNumber()))
      .toString(),
    dai_amount: new BigNumber(params.art).div(new BigNumber(10).pow(18)).toString(),
    auction_id: params.id.toString(),
    urn: params.urn.toLowerCase(),
    timestamp: timestamp.timestamp,

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO vault.events(
          kind, collateral, collateral_amount, dai_amount, timestamp, auction_id, urn,
          log_index, tx_id, block_id
        ) VALUES (
          \${kind}, \${collateral}, \${collateral_amount}, \${dai_amount}, \${timestamp}, \${auction_id}, \${urn},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    event,
  );
}

const handlers = (dependencies: CatTransformerDependencies) => ({
  async Bite(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleBite(event.params, log, services);
    await handleAuctionStarted(event.params, log, services, dependencies);
  },
});

export const getCatTransformerName = (address: string) => `catTransformer-${address}`;

interface CatTransformerDependencies {
  getIlkInfo: (ilk: string, services: LocalServices) => Promise<Ilk>;
}
export const catTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
  dependencies: CatTransformerDependencies,
) => BlockTransformer[] = (addresses, dependencies) => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getCatTransformerName(deps.address),
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, catAbi, flatten(logs), handlers(dependencies));
      },
    };
  });
};
