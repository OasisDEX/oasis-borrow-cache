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
import { Ilk } from '../dependencies/getIlkInfo';
import BigNumber from 'bignumber.js';
import { clipperTransformerName } from './clipperTransformer';
import { rad, wad } from '../../utils/precision';
import { cleanUpString } from '../../utils/cleanUpString';
import { MessageNames, MessageTypes, sendMessage } from '../../utils/awsQueue';

const dogAbi = require('../../../abis/dog.json');
async function handleBark(
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
    due: params.due.toString(),
    clip: params.clip.toLowerCase(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO dog.bark(
            auction_id, ilk, urn, ink, art, due, clip,
            log_index, tx_id, block_id
        ) VALUES (
            \${auction_id}, \${ilk}, \${urn}, \${ink}, \${art}, \${due}, \${clip},
            \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
}

const dogHandlers = {
  async Bark(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleBark(event.params, log, services);
  },
};

async function handleLiq2AuctionStarted(
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
  dependencies: auctionsTransformerDependencies,
): Promise<void> {
  const kick = await services.tx.oneOrNone(
    `SELECT * FROM clipper.kick WHERE block_id = \${block_id} AND log_index = \${log_index}`,
    {
      log_index: log.log_index - 1,
      block_id: log.block_id,
    },
  );

  if (kick === null) {
    throw new Error('Missing corresponding Kick event for Bark event');
  }

  const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
      block_id: log.block_id,
    },
  );

  const ilkData = await dependencies.getIlkInfo(params.ilk, services);

  const event = {
    kind: 'AUCTION_STARTED_V2',
    collateral: cleanUpString(ilkData.symbol),
    collateral_amount: new BigNumber(params.ink).div(wad).toString(),
    dai_amount: new BigNumber(kick.tab).div(rad).toString(),
    auction_id: params.id.toString(),
    urn: params.urn.toLowerCase(),
    timestamp: timestamp.timestamp,
    liq_penalty: new BigNumber(kick.tab)
      .minus(params.due)
      .div(rad)
      .toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO vault.events(
            kind, collateral, collateral_amount, dai_amount, timestamp, auction_id, urn, liq_penalty,
            log_index, tx_id, block_id
          ) VALUES (
            \${kind}, \${collateral}, \${collateral_amount}, \${dai_amount}, \${timestamp}, \${auction_id}, \${urn}, \${liq_penalty},
            \${log_index}, \${tx_id}, \${block_id}
          );`,
    event,
  );
  sendMessage(
    MessageNames.AUCTION_STARTED_V2,
    MessageTypes.VAULT,
    params.urn.toLowerCase(),
    `${MessageNames.AUCTION_STARTED_V2}-${params.urn.toLowerCase()}`,
    `${MessageNames.AUCTION_STARTED_V2}-${params.urn.toLowerCase()}-${log.block_id.toString()}`,
    `${params.urn.toLowerCase()}`,
  );
}

interface auctionsTransformerDependencies {
  getIlkInfo: (ilk: string, services: LocalServices) => Promise<Ilk>;
}

const handlersLiq2 = (dependencies: auctionsTransformerDependencies) => ({
  async Bark(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleLiq2AuctionStarted(event.params, log, services, dependencies);
  },
});

export const getDogTransformerName = (address: string) => `dogTransformer-${address}`;
export const dogTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getDogTransformerName(deps.address),
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, dogAbi, flatten(logs), dogHandlers);
      },
    };
  });
};

export const getAuctions2TransformerName = (deps: SimpleProcessorDefinition) =>
  `auctionTransformer-V3-lig2.0-${deps.address}`;

export const auctionLiq2Transformer: (
  addresses: (string | SimpleProcessorDefinition)[],
  dependencies: auctionsTransformerDependencies,
) => BlockTransformer[] = (addresses, dependencies) => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getAuctions2TransformerName(deps),
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transformerDependencies: [getDogTransformerName(deps.address), clipperTransformerName],
      transform: async (services, logs) => {
        await handleEvents(services, dogAbi, flatten(logs), handlersLiq2(dependencies));
      },
    };
  });
};
