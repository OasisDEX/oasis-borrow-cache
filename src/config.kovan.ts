
import { join } from 'path';
import { values } from 'lodash';

import { Addresses, makeToken, lowercaseValues } from './addresses-utils';


const startingBlockMultiplyTrading = 18419868;
const startingBlockMultiplyTradingLiq1_2 = 20465209;

// NOTE: first address on this list will be picked up by REST API
const oasisContracts = [
  { address: '0xfcbebe883b891ba55d231bdf5a9ffb7e63b4354b', startingBlock: 23150047 },
  { address: '0xe325acB9765b02b8b418199bf9650972299235F4', startingBlock: 16530576 },
  { address: '0x4a6bc4e803c62081ffebcc8d227b5a87a58f1f8f' },
];
const proxyFactory = [
  {
    address: '0xe11e3b391f7e8bc47247866af32af67dd58dc800', // instant proxy factory
    startingBlock: startingBlockMultiplyTrading,
  },
];
const cat = {
  address: '0xa9fa5837eea55f3038a2ca755ce4b5dfac599c37',
  startingBlock: startingBlockMultiplyTrading,
};

const cat2 = {
  address: '0xddb5f7a3a5558b9a6a1f3382bd75e2268d1c6958',
  startingBlock: startingBlockMultiplyTradingLiq1_2,
};

const flippers = {
  WETH: {
    address: '0x2024c9c3772543081352d72bda936240afa43bd5',
    startingBlock: startingBlockMultiplyTrading,
  },
  BAT: {
    address: '0xc94014a032ca5fcc01271f4519add7e87a16b94c',
    startingBlock: startingBlockMultiplyTrading,
  },
};

const flippers2 = {
  WETH: {
    address: '0x750295a8db0580f32355f97de7918ff538c818f1',
    startingBlock: startingBlockMultiplyTradingLiq1_2,
  },
};

const mcdContracts = [cat, ...values(flippers)];
const mcdContracts2 = [cat2, ...values(flippers2)];
const cdpManagers = [
  {
    address: '0x7a35ea756a9f1fc5d8a1c8013ade80e036c5f8bb',
    startingBlock: startingBlockMultiplyTrading,
  },
  {
    address: '0x1a4a0603d8ba90571b1e95d996588b205edfb0fd',
    startingBlock: startingBlockMultiplyTrading,
  },
];

const proxyActionsAbis = [
  {
    name: 'oasis-multiply-proxy-actions',
    abi: require('../abis/oasis-multiply-proxy-actions.json'),
    startingBlock: startingBlockMultiplyTrading,
  },
];

const addresses: Addresses = {
  tokens: makeToken([
    {
      key: '0xd0a1e359811322d97991e03f863a0c30c2cf029c',
      symbol: 'WETH',
      decimals: 18,
    },
    {
      key: '0xc4375b7de8af5a38a93548eb8453a498222c4ff2',
      symbol: 'SAI',
      decimals: 18,
    },
    {
      key: '0xaaf64bfcc32d0f15873a02163e7e500671a4ffcd',
      symbol: 'MKR',
      decimals: 18,
    },
    {
      key: '0x62aeec5fb140bb233b1c5612a8747ca1dc56dc1b',
      symbol: 'DGD',
      decimals: 9,
    },
    {
      key: '0xc7aa227823789e363f29679f23f7e8f6d9904a9b',
      symbol: 'REP',
      decimals: 18,
    },
    {
      key: '0x18392097549390502069c17700d21403ea3c721a',
      symbol: 'ZRX',
      decimals: 18,
    },
    {
      key: '0x9f8cfb61d3b2af62864408dd703f9c3beb55dff7',
      symbol: 'BAT',
      decimals: 18,
    },
    {
      key: '0x198419c5c340e8De47ce4C0E4711A03664d42CB2',
      symbol: 'USDC',
      decimals: 6,
    },
    {
      key: '0x4f96fe3b7a6cf9725f59d353f723c1bdb64ca6aa',
      symbol: 'DAI',
      decimals: 18,
    },
    {
      key: '0x18C06d61007Cbeb072F84C28aB7698F2bfd145B5',
      symbol: 'TUSD',
      decimals: 18,
    },
    {
      key: '0x7ac82C960d70A9f62a645eb57f446985Bf23e224',
      symbol: 'PAX',
      decimals: 18,
    },
    {
      key: '0x046acb204091d5296461c66cfd911114de5c6a4c',
      symbol: 'LINK',
      decimals: 18,
    },
    {
      key: '0xA08d982C2deBa0DbE433a9C6177a219E96CeE656',
      symbol: 'WBTC',
      decimals: 8,
    },
    {
      key: '0xe05b3fe4f28f784A1ee18Cb2E6cA5Ad6718364E0',
      symbol: 'ZCD',
      decimals: 18,
      hidden: true,
    },
    {
      key: '0x3702162FbE3fDb97BC87e9d84f3974b1c5a9B53f',
      symbol: 'DCC',
      decimals: 18,
      hidden: true,
    },
    {
      key: '0xb641957b6c29310926110848db2d464c8c3c3f38',
      symbol: 'CHAI',
      decimals: 18,
      hidden: true,
    },
    {
      key: '0x6cdd25a4365db73831078982de110ca50d058cc5',
      symbol: 'KNC',
      decimals: 18,
    },
    {
      key: '0xcc4034E05DFFdB142A373de49Cf8a2356CaE7Bf6',
      symbol: 'COMP',
      decimals: 18,
    },
    {
      key: '0x221F4D62636b7B51b99e36444ea47Dc7831c2B2f',
      symbol: 'MANA',
      decimals: 18,
    },
  ]),
  markets: [
    // DAI markets
    ['WETH', 'DAI'],
    ['REP', 'DAI'],
    ['ZRX', 'DAI'],
    ['BAT', 'DAI'],
    ['LINK', 'DAI'],
    ['WBTC', 'DAI'],
    ['KNC', 'DAI'],
    ['COMP', 'DAI'],
    ['MANA', 'DAI'],

    // SAI markets
    ['WETH', 'SAI'],
    ['REP', 'SAI'],
    ['ZRX', 'SAI'],
    ['BAT', 'SAI'],

    // WETH markets
    ['REP', 'WETH'],
    ['ZRX', 'WETH'],
    ['BAT', 'WETH'],
    ['LINK', 'WETH'],
    ['WBTC', 'WETH'],
    ['KNC', 'WETH'],
    ['COMP', 'WETH'],
    ['MANA', 'WETH'],

    // pegcoins markets
    ['DAI', 'USDC'],
    ['DAI', 'TUSD'],
    ['DAI', 'PAX'],

    // outside UI
    ['MKR', 'DAI'],
    ['MKR', 'WETH'],
  ],
  contracts: lowercaseValues({
    makerOtc: oasisContracts[0].address,
    makerOtcSupport: '0x303f2bf24d98325479932881657f45567b3e47a8',
    vat: '0x8a08a09dbe85018cb1a36c344a629b43f983b66c',
    pot: '0x1400b279f071119288857c5304d8c5afc37504e2',
  }),
  ilks: {
    DAI: 'DAI',
    'ETH-A': 'WETH',
    'ETH-B': 'WETH',
    'ETH-C': 'WETH',
    'REP-A': 'REP',
    'ZRX-A': 'ZRX',
    'OMG-A': 'OMG',
    'BAT-A': 'BAT',
    'DGD-A': 'DGD',
    'GNT-A': 'GNT',
  },
};

export const config = {

};
