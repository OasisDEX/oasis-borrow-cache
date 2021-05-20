import { flatten } from 'lodash';

import {
  handleEvents,
  handleDsNoteEvents,
  FullNoteEventInfo,
  FullEventInfo,
} from '@oasisdex/spock-utils/dist/transformers/common';
import { PersistedLog } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { getExtractorName as getExtractorNameBasedOnTopic } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { getExtractorNameBasedOnDSNoteTopic } from '../customExtractors';
import { Dictionary } from 'ts-essentials';

const flipAbi = require('../../../abis/flipper.json');

const handleKick = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
  const values = {
    auction_id: params.id.toString(),
    lot: params.lot.toString(),
    bid: params.bid.toString(),
    tab: params.tab.toString(),
    usr: params.usr.toLowerCase(),
    gal: params.gal.toLowerCase(),
    flipper: log.address.toLowerCase(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO flipper.kick(
          lot, bid, tab, usr, gal, auction_id, flipper,
          log_index, tx_id, block_id
        ) VALUES (
          \${lot}, \${bid}, \${tab}, \${usr}, \${gal}, \${auction_id}, \${flipper},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
    values,
  );
};

const handlers = {
  async Kick(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleKick(event.params, log, services);
  },
};

const flipperTransformer = 'flipperTransformer';
export const flipTransformer: () => BlockTransformer = () => {
  return {
    name: flipperTransformer,
    dependencies: [getExtractorNameBasedOnTopic('flipper')],
    transform: async (services, logs) => {
      await handleEvents(services, flipAbi, flatten(logs), handlers);
    },
  };
};

const handleNote = {
  async 'tend(uint256,uint256,uint256)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ): Promise<void> {
    const values = {
      auction_id: note.params.id.toString(),
      lot: note.params.lot.toString(),
      bid: note.params.bid.toString(),
      flipper: log.address.toLowerCase(),

      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await services.tx.none(
      `INSERT INTO flipper.tend(
              lot, bid, auction_id, flipper,
              log_index, tx_id, block_id
            ) VALUES (
              \${lot}, \${bid}, \${auction_id}, \${flipper},
              \${log_index}, \${tx_id}, \${block_id}
            );`,
      values,
    );
  },
  async 'dent(uint256,uint256,uint256)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ): Promise<void> {
    const values = {
      auction_id: note.params.id.toString(),
      lot: note.params.lot.toString(),
      bid: note.params.bid.toString(),
      flipper: log.address.toLowerCase(),

      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await services.tx.none(
      `INSERT INTO flipper.dent(
              lot, bid, auction_id, flipper,
              log_index, tx_id, block_id
            ) VALUES (
              \${lot}, \${bid}, \${auction_id}, \${flipper},
              \${log_index}, \${tx_id}, \${block_id}
            );`,
      values,
    );
  },
  async 'deal(uint256)'(services: LocalServices, { note, log }: FullNoteEventInfo): Promise<void> {
    const values = {
      auction_id: note.params.id.toString(),
      flipper: log.address.toLowerCase(),

      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await services.tx.none(
      `INSERT INTO flipper.deal(
              auction_id, flipper,
              log_index, tx_id, block_id
            ) VALUES (
              \${auction_id},  \${flipper},
              \${log_index}, \${tx_id}, \${block_id}
            );`,
      values,
    );
  },
};

export const flipNoteTransformer: () => BlockTransformer = () => {
  return {
    name: `flipperNoteTransformer`,
    dependencies: [getExtractorNameBasedOnDSNoteTopic('flipper')],
    transform: async (services, logs) => {
      await handleDsNoteEvents(services, flipAbi, flatten(logs), handleNote, 2);
    },
  };
};
