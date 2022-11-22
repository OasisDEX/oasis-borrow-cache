import { flatten } from 'lodash';

import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import { PersistedLog } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { Dictionary } from 'ts-essentials';
import BigNumber from 'bignumber.js';
import { rad, ray, wad } from '../../utils/precision';
import { getCustomExtractorNameBasedOnTopicIgnoreConflicts } from '../customExtractors';
import { MessageNames, MessageTypes, sendMessage } from '../../utils/awsQueue';

const clipperAbi = require('../../../abis/clipper.json');

const handleKick = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
  const values = {
    auction_id: params.id.toString(),
    coin: params.coin.toString(),
    kpr: params.kpr.toLowerCase(),
    lot: params.lot.toString(),
    tab: params.tab.toString(),
    top: params.top.toString(),
    usr: params.usr.toLowerCase(),
    clipper: log.address.toLowerCase(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO clipper.kick(
            auction_id, coin, kpr, lot, tab, top, usr, clipper,
            log_index, tx_id, block_id
        ) VALUES (
          \${auction_id}, \${coin}, \${kpr}, \${lot}, \${tab}, \${top}, \${usr}, \${clipper},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
};

const handleTake = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
  const values = {
    auction_id: params.id.toString(),
    lot: params.lot.toString(),
    max: params.max.toString(),
    owe: params.owe.toString(),
    price: params.price.toString(),
    tab: params.tab.toString(),
    usr: params.usr.toLowerCase(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO clipper.take(
            auction_id, lot, max, owe, price, tab, usr,
            log_index, tx_id, block_id
        ) VALUES (
          \${auction_id}, \${lot}, \${max}, \${owe}, \${price}, \${tab}, \${usr},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
};

const handleAuctionTake = async (
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) => {
  const bark = await services.tx.oneOrNone(`
        SELECT * FROM dog.bark WHERE auction_id = '${params.id.toString()}' AND clip = '${log.address.toLowerCase()}';
    `);
  const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
      block_id: log.block_id,
    },
  );
  const auctionFinished = params.lot.toString() === '0' || params.tab.toString() === '0';
  const slice = new BigNumber(params.owe).div(params.price);

  const event = {
    kind: 'TAKE',
    auction_id: params.id.toString(),
    urn: bark.urn,
    timestamp: timestamp.timestamp,
    remaining_debt: new BigNumber(params.tab).div(rad).toString(),
    remaining_collateral: new BigNumber(params.lot).div(wad).toString(),
    collateral_price: new BigNumber(params.price).div(ray).toString(),
    covered_debt: new BigNumber(params.owe).div(rad).toString(),
    collateral_taken: slice.div(wad).toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO vault.events(
                kind, auction_id, remaining_collateral, remaining_debt, urn, timestamp, collateral_price, covered_debt, collateral_taken,
                log_index, tx_id, block_id
            ) VALUES (
                \${kind}, \${auction_id}, \${remaining_collateral}, \${remaining_debt}, \${urn}, \${timestamp}, \${collateral_price}, \${covered_debt}, \${collateral_taken},
                \${log_index}, \${tx_id}, \${block_id}
            );`,
    event,
  );

  if (auctionFinished) {
    const auctionFinishedEvent = {
      kind: 'AUCTION_FINISHED_V2',
      auction_id: params.id.toString(),
      urn: bark.urn,
      timestamp: timestamp.timestamp,
      remaining_debt: new BigNumber(params.tab).div(rad).toString(),
      remaining_collateral: new BigNumber(params.lot).div(wad).toString(),

      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await services.tx.none(
      `INSERT INTO vault.events(
                    kind, auction_id, remaining_collateral, remaining_debt, urn, timestamp,
                    log_index, tx_id, block_id
                ) VALUES (
                    \${kind}, \${auction_id}, \${remaining_collateral}, \${remaining_debt}, \${urn}, \${timestamp},
                    \${log_index}, \${tx_id}, \${block_id}
                );`,
      auctionFinishedEvent,
    );
    sendMessage(
      MessageNames.AUCTION_FINISHED_V2,
      MessageTypes.VAULT,
      bark.urn.toLowerCase(),
      `${MessageNames.AUCTION_FINISHED_V2}-${bark.urn.toLowerCase()}`,
      `${
        MessageNames.AUCTION_FINISHED_V2
      }-${bark.urn.toLowerCase()}-${log.block_id.toString()}`,
      `${bark.urn.toLowerCase()}`,
    );
  }
};

const handleRedo = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
  const values = {
    auction_id: params.id.toString(),
    coin: params.lot.toString(),
    kpr: params.kpr.toLowerCase(),
    lot: params.lot.toString(),
    tab: params.tab.toString(),
    top: params.top.toString(),
    usr: params.usr.toLowerCase(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO clipper.redo(
            auction_id, coin, kpr, lot, tab, top, usr,
            log_index, tx_id, block_id
        ) VALUES (
          \${auction_id}, \${coin}, \${kpr}, \${lot}, \${tab}, \${top}, \${usr},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
};

const handleYank = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
  const values = {
    auction_id: params.id.toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO clipper.yank(
            auction_id,
            log_index, tx_id, block_id
        ) VALUES (
          \${auction_id},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
};

const handlers = {
  async Kick(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleKick(event.params, log, services);
  },
  async Take(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleTake(event.params, log, services);
    await handleAuctionTake(event.params, log, services);
  },
  async Redo(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleRedo(event.params, log, services);
  },
  async Yank(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleYank(event.params, log, services);
  },
};

async function filterClipperLogs(
  services: LocalServices,
  logs: PersistedLog[],
): Promise<PersistedLog[]> {
  if (logs.length === 0) {
    return logs;
  }

  const clippers = await services.tx.manyOrNone(`SELECT DISTINCT clip FROM dog.bark`);
  const clippersAddresses = clippers.map((result: { clip: string }) => result.clip.toLowerCase());

  if (clippersAddresses.length === 0) {
    return [];
  }
  return logs.filter(log => clippersAddresses.includes(log.address.toLowerCase()));
}

export const clipperTransformerName = 'clipperTransformerV3';
export const clipperTransformer: (
  transformerDependencies: string[],
) => BlockTransformer = transformerDependencies => {
  return {
    name: clipperTransformerName,
    dependencies: [getCustomExtractorNameBasedOnTopicIgnoreConflicts('clipper')],
    transformerDependencies,
    transform: async (services, logs) => {
      const allowedLogs = await filterClipperLogs(services, flatten(logs));
      await handleEvents(services, clipperAbi, allowedLogs, handlers);
    },
  };
};
