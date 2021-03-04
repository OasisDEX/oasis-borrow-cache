import { ParsedEvent } from '@oasisdex/spock-utils/dist/transformers/common';
import { BigNumber } from 'bignumber.js';
import { Addresses } from '../../addresses-utils';
import { SpockConfig } from '@oasisdex/spock-etl/dist/services/config';
import config from '../../config';
import { Dictionary, assert } from 'ts-essentials';
import { toPairs, fromPairs, groupBy, List, mapValues } from 'lodash';

export const symbolWeight: Dictionary<number> = {
  USDC: 5,
  TUSD: 5,
  PAX: 5,
  MCD_DAI: 4, // on mainnet we use tmp MCD_DAI tmp naming
  DAI: 3,
  SAI: 2,
  WETH: 1,
};

/**
 * @argument tokens are ADDRESSES
 */
export function getQuoteBaseTokensPair(addresses: Addresses, tokens: [string, string]): string[] {
  const addressWeight: Dictionary<number> = fromPairs(
    toPairs(symbolWeight)
      .map(([symbol, weight]) => {
        return [addresses.tokens[symbol]?.key, weight];
      })
      .filter(([symbol, _]) => !!symbol),
  );

  return tokens.sort((a, b) => {
    const aWeight = addressWeight[a] || 0;
    const bWeight = addressWeight[b] || 0;

    // fallback to lexicographic order
    if (aWeight === 0 && bWeight === 0) {
      return a.localeCompare(b);
    }

    if (aWeight > bWeight) {
      return -1;
    }
    if (aWeight === bWeight) {
      return 0;
    }
    return 1;
  });
}

/**
 * @argument tokens are symbols
 */
export function getQuoteBaseSymbolsPair(tokens: [string, string]): string[] {
  return tokens.sort((a, b) => {
    const aWeight = symbolWeight[a] || 0;
    const bWeight = symbolWeight[b] || 0;

    if (aWeight === bWeight) {
      throw new Error(`Can't find quote or base tokens! Symbols ${tokens} have the same weight!`);
    }

    if (aWeight > bWeight) {
      return -1;
    } else {
      return 1;
    }
  });
}

export interface offerParams {
  quoteBasePair: string[];
  quote_amt: string;
  base_amt: string;
  type: string;
  price: string;
}

export function getOfferParams(
  addresses: Addresses,
  event: ParsedEvent,
  buy_field: string,
  pay_field: string,
  buy_token_decimals: number,
  pay_token_decimals: number,
): offerParams {
  const quoteBasePair = getQuoteBaseTokensPair(addresses, [
    event.params.pay_gem.toLowerCase(),
    event.params.buy_gem.toLowerCase(),
  ]);
  const quote_amt =
    quoteBasePair[0] === event.params.pay_gem.toLowerCase()
      ? new BigNumber(event.params[pay_field])
          .div(new BigNumber(`1e${pay_token_decimals}`))
          .toString()
      : new BigNumber(event.params[buy_field])
          .div(new BigNumber(`1e${buy_token_decimals}`))
          .toString();

  const base_amt =
    quoteBasePair[0] === event.params.buy_gem.toLowerCase()
      ? new BigNumber(event.params[pay_field])
          .div(new BigNumber(`1e${pay_token_decimals}`))
          .toString()
      : new BigNumber(event.params[buy_field])
          .div(new BigNumber(`1e${buy_token_decimals}`))
          .toString();

  return {
    quoteBasePair,
    quote_amt,
    base_amt,
    type: quoteBasePair[0] === event.params.buy_gem.toLowerCase() ? 'buy' : 'sell',
    price: new BigNumber(quote_amt).div(new BigNumber(base_amt)).toString(),
  };
}

export function getAddressesFromConfig(services: { config: SpockConfig }): Addresses {
  return ((services.config as any) as typeof config).addresses;
}

export function groupIndividualsBy<T>(
  collection: List<T> | null | undefined,
  iteratee?: keyof T,
): Dictionary<T> {
  return mapValues(groupBy(collection, iteratee), v => {
    assert(v.length === 1, 'Trying to group not individual');
    return v[0];
  });
}
