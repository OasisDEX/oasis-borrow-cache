import { BigNumber } from 'bignumber.js';
import { flatten } from 'lodash';

import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { ethers } from 'ethers';

const otcAbi = require('../../../abis/matching-market.json');

export const otcTransformer: BlockTransformer = {
  name: 'OtcTransformer',
  dependencies: [
    'raw_log_0x39755357759ce0d7f32dc8dc45414cca409ae24e_extractor',
    'raw_log_0xb7ac09c2c0217b07d7c103029b4918a2c401eecb_extractor',
    'raw_log_0x14fbca95be7e99c15cc2996c6c9d841e54b79425_extractor',
  ],
  transform: async (services, logs) => {
    await handleEvents(services, otcAbi, flatten(logs), handlers);
  },
};

const handlers = {
  async LogMake({ tx }: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const values = {
      offer_id: ethers.utils.bigNumberify(event.params.id).toNumber(),
      pair: event.params.pair,
      maker: event.params.maker.toLowerCase(),
      pay_gem: event.params.pay_gem.toLowerCase(),
      buy_gem: event.params.buy_gem.toLowerCase(),
      pay_amt: new BigNumber(event.params.pay_amt).div(new BigNumber('1e18')).toString(),
      buy_amt: new BigNumber(event.params.buy_amt).div(new BigNumber('1e18')).toString(),
      log_index: log.log_index,
      timestamp: new Date(new BigNumber(event.params.timestamp).toNumber() * 1000),
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await tx.none(
      `INSERT INTO oasis.log_make(
         offer_id, pair, maker, pay_gem, buy_gem, pay_amt, buy_amt, timestamp, log_index, tx_id, block_id
       ) VALUES (
         \${offer_id}, \${pair}, \${maker}, \${pay_gem}, \${buy_gem}, \${pay_amt}, \${buy_amt}, \${timestamp}, \${log_index}, \${tx_id}, \${block_id}
       );`,
      values,
    );
  },

  async LogTake({ tx }: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const values = {
      offer_id: ethers.utils.bigNumberify(event.params.id).toNumber(),
      pair: event.params.pair,
      maker: event.params.maker.toLowerCase(),
      pay_gem: event.params.pay_gem.toLowerCase(),
      buy_gem: event.params.buy_gem.toLowerCase(),
      taker: event.params.taker.toLowerCase(),
      take_amt: new BigNumber(event.params.take_amt).div(new BigNumber('1e18')).toString(),
      give_amt: new BigNumber(event.params.give_amt).div(new BigNumber('1e18')).toString(),
      log_index: log.log_index,
      timestamp: new Date(new BigNumber(event.params.timestamp).toNumber() * 1000),
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await tx.none(
      `INSERT INTO oasis.log_take(
         offer_id, pair, maker, pay_gem, buy_gem, taker, take_amt, give_amt, timestamp, log_index, tx_id, block_id
       ) VALUES (
         \${offer_id}, \${pair}, \${maker}, \${pay_gem}, \${buy_gem}, \${taker}, \${take_amt}, \${give_amt}, \${timestamp}, \${log_index}, \${tx_id}, \${block_id}
       );`,
      values,
    );
  },

  async LogKill({ tx }: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const values = {
      offer_id: ethers.utils.bigNumberify(event.params.id).toNumber(),
      pair: event.params.pair,
      maker: event.params.maker.toLowerCase(),
      pay_gem: event.params.pay_gem.toLowerCase(),
      buy_gem: event.params.buy_gem.toLowerCase(),
      buy_amt: new BigNumber(event.params.buy_amt).div(new BigNumber('1e18')).toString(),
      pay_amt: new BigNumber(event.params.pay_amt).div(new BigNumber('1e18')).toString(),
      log_index: log.log_index,
      timestamp: new Date(new BigNumber(event.params.timestamp).toNumber() * 1000),
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await tx.none(
      `INSERT INTO oasis.log_kill(
         offer_id, pair, maker, pay_gem, buy_gem, buy_amt, pay_amt, timestamp, log_index, tx_id, block_id
       ) VALUES (
         \${offer_id}, \${pair}, \${maker}, \${pay_gem}, \${buy_gem}, \${buy_amt}, \${pay_amt}, \${timestamp}, \${log_index}, \${tx_id}, \${block_id}
       );`,
      values,
    );
  },

  async LogTrade({ tx }: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const values = {
      pay_amt: new BigNumber(event.params.pay_amt).div(new BigNumber('1e18')).toString(),
      pay_gem: event.params.pay_gem.toLowerCase(),
      buy_amt: new BigNumber(event.params.buy_amt).div(new BigNumber('1e18')).toString(),
      buy_gem: event.params.buy_gem.toLowerCase(),
      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await tx.none(
      `INSERT INTO oasis.log_trade(
         pay_amt, pay_gem, buy_amt, buy_gem, log_index, tx_id, block_id
       ) VALUES (
         \${pay_amt}, \${pay_gem}, \${buy_amt}, \${buy_gem}, \${log_index}, \${tx_id}, \${block_id}
       );`,
      values,
    );
  },
};
