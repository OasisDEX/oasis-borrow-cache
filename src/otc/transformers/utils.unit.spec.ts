import { getQuoteBaseTokensPair } from './utils';
import { Addresses } from '../../addresses-utils';

const fakeAddresses: Addresses = {
  contracts: {},
  ilks: {},
  tokens: {
    USDC: { key: '0xUSDC', decimals: 6, symbol: 'USDC' },
    DAI: { key: '0xDAI', decimals: 18, symbol: 'DAI' },
    WETH: { key: '0xWETH', decimals: 18, symbol: 'WETH' },
    MKR: { key: '0xMKR', decimals: 18, symbol: 'MKR' },
  },
  markets: [],
};

const fakeEmptyAddresses: Addresses = {
  contracts: {},
  ilks: {},
  tokens: {},
  markets: [],
};

describe('getQuoteBaseTokensPair', () => {
  it('should return tokens in quote-base order for USDC-DAI markets', () => {
    const input: [string, string] = [fakeAddresses.tokens.DAI.key, fakeAddresses.tokens.USDC.key];
    const input2: [string, string] = [fakeAddresses.tokens.USDC.key, fakeAddresses.tokens.DAI.key];
    const market = getQuoteBaseTokensPair(fakeAddresses, input);
    const market2 = getQuoteBaseTokensPair(fakeAddresses, input2);

    expect(market).toEqual([fakeAddresses.tokens.USDC.key, fakeAddresses.tokens.DAI.key]);
    expect(market2).toEqual([fakeAddresses.tokens.USDC.key, fakeAddresses.tokens.DAI.key]);
  });

  it('should return tokens in quote-base order for USDC markets', () => {
    expect(getQuoteBaseTokensPair(fakeAddresses, ['0xabc', fakeAddresses.tokens.USDC.key]))
      .toMatchInlineSnapshot(`
Array [
  "0xUSDC",
  "0xabc",
]
`);
    expect(getQuoteBaseTokensPair(fakeAddresses, [fakeAddresses.tokens.USDC.key, '0xabc']))
      .toMatchInlineSnapshot(`
Array [
  "0xUSDC",
  "0xabc",
]
`);

    expect(
      getQuoteBaseTokensPair(fakeAddresses, [
        fakeAddresses.tokens.USDC.key,
        fakeAddresses.tokens.MKR.key,
      ]),
    ).toMatchInlineSnapshot(`
Array [
  "0xUSDC",
  "0xMKR",
]
`);
    expect(
      getQuoteBaseTokensPair(fakeAddresses, [
        fakeAddresses.tokens.USDC.key,
        fakeAddresses.tokens.MKR.key,
      ]),
    ).toMatchInlineSnapshot(`
Array [
  "0xUSDC",
  "0xMKR",
]
`);
  });

  it('should return tokens in quote-base order for DAI markets', () => {
    const input: [string, string] = [fakeAddresses.tokens.DAI.key, fakeAddresses.tokens.WETH.key];
    const input2: [string, string] = [fakeAddresses.tokens.WETH.key, fakeAddresses.tokens.DAI.key];
    const market = getQuoteBaseTokensPair(fakeAddresses, input);
    const market2 = getQuoteBaseTokensPair(fakeAddresses, input2);

    expect(market).toEqual([fakeAddresses.tokens.DAI.key, fakeAddresses.tokens.WETH.key]);
    expect(market2).toEqual([fakeAddresses.tokens.DAI.key, fakeAddresses.tokens.WETH.key]);
  });

  it('should return tokens in quote-base order for WETH markets', () => {
    const input: [string, string] = [fakeAddresses.tokens.MKR.key, fakeAddresses.tokens.WETH.key];
    const input2: [string, string] = [fakeAddresses.tokens.WETH.key, fakeAddresses.tokens.MKR.key];
    const market = getQuoteBaseTokensPair(fakeAddresses, input);
    const market2 = getQuoteBaseTokensPair(fakeAddresses, input2);

    expect(market).toEqual([fakeAddresses.tokens.WETH.key, fakeAddresses.tokens.MKR.key]);
    expect(market2).toEqual([fakeAddresses.tokens.WETH.key, fakeAddresses.tokens.MKR.key]);
  });

  it('should return tokens in alphabetical order for other markets', () => {
    const tokenA = '0xabc';
    const tokenB = '0xcef';
    const input: [string, string] = [tokenA, tokenB];
    const input2: [string, string] = [tokenB, tokenA];
    const market = getQuoteBaseTokensPair(fakeAddresses, input);
    const market2 = getQuoteBaseTokensPair(fakeAddresses, input2);

    expect(market).toEqual([tokenA, tokenB]);
    expect(market2).toEqual([tokenA, tokenB]);
  });

  it('should return tokens in alphabetical order for networks without token config', () => {
    const tokenA = '0xabc';
    const tokenB = '0xcef';
    const input: [string, string] = [tokenA, tokenB];
    const input2: [string, string] = [tokenB, tokenA];
    const market = getQuoteBaseTokensPair(fakeEmptyAddresses, input);
    const market2 = getQuoteBaseTokensPair(fakeEmptyAddresses, input2);

    expect(market).toEqual([tokenA, tokenB]);
    expect(market2).toEqual([tokenA, tokenB]);
  });
});
