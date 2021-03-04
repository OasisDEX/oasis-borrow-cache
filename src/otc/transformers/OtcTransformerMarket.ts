import { ethers } from 'ethers';
import { BigNumber } from 'bignumber.js';
import { flatten } from 'lodash';

import { getExtractorName } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import { offerParams, getOfferParams, getAddressesFromConfig } from './utils';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { getTokenDecimals } from './tokens';

const otcAbi = require('../../../abis/matching-market.json');

export const otcTransformerMarket: (addresses: string[]) => BlockTransformer = otcAddresses => ({
  name: 'otcTransformerMarket',
  dependencies: otcAddresses.map(getExtractorName),
  transform: async (services, logs) => {
    await handleEvents(services, otcAbi, flatten(logs), handlers);
  },
});

const handlers = {
  async LogMake(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const { tx } = services;
    const addresses = getAddressesFromConfig(services);

    const { quoteBasePair, quote_amt, base_amt, type, price }: offerParams = getOfferParams(
      addresses,
      event,
      'buy_amt',
      'pay_amt',
      await getTokenDecimals(services, event.params.buy_gem.toLowerCase()),
      await getTokenDecimals(services, event.params.pay_gem.toLowerCase()),
    );

    const values = {
      offer_id: ethers.utils.bigNumberify(event.params.id).toNumber(),
      address: log.address,
      maker: event.params.maker.toLowerCase(),
      quote_gem: quoteBasePair[0],
      base_gem: quoteBasePair[1],
      quote_amt: quote_amt,
      base_amt: base_amt,
      type: type,
      price: price,
      log_index: log.log_index,
      timestamp: new Date(event.params.timestamp.toNumber() * 1000),
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await tx.none(
      `INSERT INTO oasis_market.log_make(
         offer_id, address, maker, quote_gem, base_gem, quote_amt, base_amt, type, price, timestamp, log_index, tx_id, block_id
       ) VALUES (
         \${offer_id}, \${address}, \${maker}, \${quote_gem}, \${base_gem}, \${quote_amt}, \${base_amt}, \${type}, \${price}, \${timestamp}, \${log_index}, \${tx_id}, \${block_id}
       );`,
      values,
    );
  },

  async LogTake(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const { tx } = services;
    const addresses = getAddressesFromConfig(services);
    const { quoteBasePair, quote_amt, base_amt, type, price } = getOfferParams(
      addresses,
      event,
      'give_amt',
      'take_amt',
      await getTokenDecimals(services, event.params.buy_gem.toLowerCase()),
      await getTokenDecimals(services, event.params.pay_gem.toLowerCase()),
    );

    const values = {
      offer_id: ethers.utils.bigNumberify(event.params.id).toNumber(),
      address: log.address,
      maker: event.params.maker.toLowerCase(),
      taker: event.params.taker.toLowerCase(),
      quote_gem: quoteBasePair[0],
      base_gem: quoteBasePair[1],
      quote_amt: quote_amt,
      base_amt: base_amt,
      type: type,
      price: price,
      log_index: log.log_index,
      timestamp: new Date(new BigNumber(event.params.timestamp).toNumber() * 1000),
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await tx.none(
      `INSERT INTO oasis_market.log_take(
         offer_id, address, maker, taker, quote_gem, base_gem, quote_amt, base_amt, type, price, timestamp, log_index, tx_id, block_id
       ) VALUES (
         \${offer_id}, \${address}, \${maker}, \${taker}, \${quote_gem}, \${base_gem}, \${quote_amt}, \${base_amt}, \${type}, \${price}, \${timestamp}, \${log_index}, \${tx_id}, \${block_id}
       );`,
      values,
    );
  },

  async LogKill(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const { tx } = services;
    const addresses = getAddressesFromConfig(services);

    const { quoteBasePair, quote_amt, base_amt, type, price } = getOfferParams(
      addresses,
      event,
      'buy_amt',
      'pay_amt',
      await getTokenDecimals(services, event.params.buy_gem),
      await getTokenDecimals(services, event.params.pay_gem),
    );

    const values = {
      offer_id: ethers.utils.bigNumberify(event.params.id).toNumber(),
      address: log.address,
      maker: event.params.maker.toLowerCase(),
      quote_gem: quoteBasePair[0],
      base_gem: quoteBasePair[1],
      quote_amt: quote_amt,
      base_amt: base_amt,
      type: type,
      price: price,
      log_index: log.log_index,
      timestamp: new Date(event.params.timestamp.toNumber() * 1000),
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await tx.none(
      `INSERT INTO oasis_market.log_kill(
         offer_id, address, maker, quote_gem, base_gem, quote_amt, base_amt, type, price, timestamp, log_index, tx_id, block_id
       ) VALUES (
         \${offer_id}, \${address}, \${maker}, \${quote_gem}, \${base_gem}, \${quote_amt}, \${base_amt}, \${type}, \${price}, \${timestamp}, \${log_index}, \${tx_id}, \${block_id}
       );`,
      values,
    );
  },

  async LogTrade(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    const { tx } = services;
    const addresses = getAddressesFromConfig(services);

    const { quoteBasePair, quote_amt, base_amt, type, price } = getOfferParams(
      addresses,
      event,
      'buy_amt',
      'pay_amt',
      await getTokenDecimals(services, event.params.buy_gem),
      await getTokenDecimals(services, event.params.pay_gem),
    );
    const values = {
      quote_gem: quoteBasePair[0],
      base_gem: quoteBasePair[1],
      quote_amt: quote_amt,
      base_amt: base_amt,
      type: type,
      price: price,
      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await tx.none(
      `INSERT INTO oasis_market.log_trade(
         quote_gem, base_gem, quote_amt, base_amt, type, price, log_index, tx_id, block_id
       ) VALUES (
          \${quote_gem}, \${base_gem}, \${quote_amt}, \${base_amt}, \${type}, \${price}, \${log_index}, \${tx_id}, \${block_id}
       );`,
      values,
    );
  },
};
