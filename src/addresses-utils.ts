import { Dictionary } from 'ts-essentials';
import { mapValues, fromPairs } from 'lodash';

export interface Addresses {
  tokens: Dictionary<Token>;

  // used by Rest API
  // NOTE: must be uppercased, matching tokens symbols, can't use eth (use WETH), must be base, quote order
  markets: [string, string][];

  contracts: Dictionary<string>;
  ilks: Dictionary<string>;
}

export interface Token {
  key: string;
  symbol: string;
  decimals: number;
  hidden?: boolean;
}

export const lowercaseValues = (obj: Dictionary<string>): Dictionary<string> => {
  return mapValues(obj, v => v.toLowerCase());
};

export function asMap<D>(key: keyof D, data: D[]): { [key: string]: D } {
  return fromPairs(data.map((row: D) => [row[key], row]));
}

export const makeToken = (a: Token[]): Dictionary<Token> => {
  const lowerCasedTokens = a.map(t => ({ ...t, key: t.key.toLowerCase() }));

  return asMap('symbol', lowerCasedTokens);
};
