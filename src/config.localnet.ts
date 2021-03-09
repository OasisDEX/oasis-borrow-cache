import { makeRawLogExtractors } from '@oasisdex/spock-utils/dist//extractors//rawEventDataExtractor';
import { makeRawEventBasedOnTopicExtractor } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';

import { join } from 'path';
import { values } from 'lodash';
import { Addresses, makeToken, lowercaseValues } from './addresses-utils';
import { UserProvidedSpockConfig } from '@oasisdex/spock-etl/dist/services/config';

const oasisContracts = ['0x177b74CB6679C145Bb428Cc3E16F4a3d3ED905a3'];
const cat = '0x4a81317A82Fc95f5180B827Ed3EBAe838Ad6BD1B';
const flippers = {
  WETH: '0x76fdFbdBaF5Ef599FBD6565e998D20A0C838d950',
  DGD: '0x6814473cB539B21E8bE07dd8e04D70c79c1dD13F',
};
const mcdContracts = [cat, ...values(flippers)];
const cdpManager = ['0xAFe25DF80A6Ce0890d1742767Fd6424bF845F39d'];

const proxyFactory = ['0xF52071224Fe0Ecd1E9776815CCc151fa4B79a16c']; // oasisProxyFactory
const proxyActionsAbis = [
  {
    name: 'oasis-multiply-proxy-actions',
    abi: require('../abis/oasis-multiply-proxy-actions.json'),
  },
];

const addresses: Addresses = {
  tokens: makeToken([
    // mcd dai
    {
      key: '0xafaa69de13bd8766d9d47c9205439b9b06e533c6',
      symbol: 'DAI',
      decimals: 18,
    },
    {
      key: '0x3a21ab4539e11f0c06b583796f3f0fd274efc369',
      symbol: 'MKR',
      decimals: 18,
    },
    {
      key: '0x200938bf7ff25ecf2eb7bc08e18b0892ed34c846',
      symbol: 'WETH',
      decimals: 18,
    },
    {
      key: '0xe8d4c2ab5782c697f06f17610cc03068180d0fac',
      symbol: 'REP',
      decimals: 18,
    },
    {
      key: '0x2c60cf08c07c212e21e6e2ee4626c478bace092a',
      symbol: 'ZRX',
      decimals: 18,
    },
    {
      key: '0xd80110e3c107eb206b556871cfe2532ec7d05e47',
      symbol: 'BAT',
      decimals: 18,
    },
    {
      key: '0x76c37e57a1438e2a0ac7fec8a552cdd569b2cafb',
      symbol: 'DGD',
      decimals: 18,
    },
  ]),
  markets: [
    ['WETH', 'DAI'],
    ['MKR', 'DAI'],
    ['MKR', 'WETH'],
    ['ZRX', 'DAI'],
    ['BAT', 'DAI'],
    ['REP', 'DAI'],
  ],
  contracts: lowercaseValues({
    makerOtc: oasisContracts[0],
    makerOtcSupport: '0xee9F9B08E2eBc68e88c0e207A09EbaaeF4e5d94E',
    vat: '0xBD96b03c371380FB916a6789BDa6AFf170E65c5f',
    pot: '0x0', // not deployed on localnode
  }),
  ilks: {
    DAI: 'DAI',
    ETH: 'WETH',
    DGD: 'DGD',
    ZRX: 'ZRX',
    BAT: 'BAT',
    REP: 'REP',
  },
};

export const config: UserProvidedSpockConfig = {
  startingBlock: 1,
  extractors: [
    ...makeRawLogExtractors(oasisContracts),
    ...makeRawLogExtractors(mcdContracts),
    ...makeRawLogExtractors(proxyFactory),
    ...makeRawLogExtractors(cdpManager),
    ...makeRawEventBasedOnTopicExtractor(proxyActionsAbis),
  ],
  transformers: [
  ],
  migrations: {},
  api: {
    whitelisting: {
      enabled: false,
      whitelistedQueriesDir: './queries',
    },
    responseCaching: {
      enabled: false,
    },
  },
  addresses,
  onStart: () => { },
};
