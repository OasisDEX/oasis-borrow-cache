import { makeRawLogExtractors } from '@oasisdex/spock-utils/dist//extractors//rawEventDataExtractor';
import { makeRawEventBasedOnTopicExtractor } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import { otcTransformer } from './otc/transformers/OtcTransformer';
import { otcTransformerMarket } from './otc/transformers/OtcTransformerMarket';
import { join } from 'path';
import { lowercaseValues, Addresses, makeToken } from './addresses-utils';
import { loadTokens } from './otc/transformers/tokens';
import { UserProvidedSpockConfig } from '@oasisdex/spock-etl/dist/services/config';
import { values } from 'lodash';
import { cdpTransformer, cdpTransformerNote, makeCDPNoteDependencies, vatUrnTransformerNote } from './borrow/transformers/CdpTransformer';
import {
  mcdTransformerCat,
  mcdTransformerFlip,
  mcdTransformerFlipDsNote,
} from './multiply/transformers/McdTransformer';
import { trackAllNewlyCreatedProxies } from './borrow/transformers/dsProxyFactoryTransformer';
import { proxyActionsTransformer } from './multiply/transformers/OasisMultiplyProxyActionsTransformer';
import { makeOtcMidpointPriceTransformer } from './otc/transformers/OtcMidpointPriceTransformer';
import { makeMidpointOfferExtractors } from './otc/extractors/midpointOfferExtractor';
import { makeManagerFrobDependencies, managerFrobTransformer, vatFrobTransformer } from './borrow/transformers/frobTransformer';
import { normalizeAddressDefinition } from './utils';
import { daiJoinTransformer } from './borrow/transformers/daiJoinTransformer';

// NOTE: first address on this list will be picked up by REST API
const oasisContracts = [
  { address: '0x5e3e0548935a83ad29fb2a9153d331dc6d49020f', startingBlock: 11746967 },
  { address: '0x794e6e91555438aFc3ccF1c5076A74F42133d08D', startingBlock: 9417183 },
  { address: '0x39755357759ce0d7f32dc8dc45414cca409ae24e' },
  { address: '0xb7ac09c2c0217b07d7c103029b4918a2c401eecb' },
  { address: '0x14fbca95be7e99c15cc2996c6c9d841e54b79425' },
];

// multiply related config
const proxyFactory = [
  {
    address: '0xa26e15c895efc0616177b7c1e7270a4c7d51c997',
    startingBlock: 5834580, // deployment block
  },
];
const startingBlockMultiplyTrading = 9638144;
const startingBlockMultiplyTradingLiq1_2 = 10742907;

const cat = {
  address: '0x78F2c2AF65126834c51822F56Be0d7469D7A523E',
  startingBlock: startingBlockMultiplyTrading,
};
const cat2 = {
  address: '0xa5679C04fc3d9d8b0AaB1F0ab83555b301cA70Ea',
  startingBlock: startingBlockMultiplyTradingLiq1_2,
};

const vat = {
  address: '0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b',
  startingBlock: 8928152
}

const daiJoin = {
  address: '0x9759A6Ac90977b93B58547b4A71c78317f391A28',
  startingBlock: 8928130,
}

const flippers = {
  WETH: {
    address: '0xd8a04F5412223F513DC55F839574430f5EC15531',
    startingBlock: startingBlockMultiplyTrading,
  },
  BAT: {
    address: '0xaA745404d55f88C108A28c86abE7b5A1E7817c07',
    startingBlock: startingBlockMultiplyTrading,
  },
};
const flippers2 = {
  WETH: {
    address: '0xF32836B9E1f47a0515c6Ec431592D5EbC276407f',
    startingBlock: startingBlockMultiplyTradingLiq1_2,
  },
};

const mcdContracts = [cat, ...values(flippers)];
const mcdContracts2 = [cat2, ...values(flippers2)];
const cdpManagers = [
  {
    address: '0x5ef30b9986345249bc32d8928B7ee64DE9435E39',
    startingBlock: 8928198,
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
      key: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      symbol: 'WETH',
      decimals: 18,
    },
    {
      key: '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
      symbol: 'SAI',
      decimals: 18,
    },
    {
      key: '0x6b175474e89094c44da98b954eedeac495271d0f',
      symbol: 'DAI',
      decimals: 18,
    },
    {
      key: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'USDC',
      decimals: 6,
    },
    {
      key: '0x168296bb09e24a88805cb9c33356536b980d3fc5',
      symbol: 'RHOC',
      decimals: 18,
    },
    {
      key: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
      symbol: 'MKR',
      decimals: 18,
    },
    {
      key: '0xbeb9ef514a379b997e0798fdcc901ee474b6d9a1',
      symbol: 'MLN',
      decimals: 18,
    },
    {
      key: '0xe0b7927c4af23765cb51314a0e0521a9645f0e2a',
      symbol: 'DGD',
      decimals: 9,
    },
    {
      key: '0x1985365e9f78359a9b6ad760e32412f4a445e862',
      symbol: 'REP',
      decimals: 18,
    },
    {
      key: '0xe41d2489571d322189246dafa5ebde1f4699f498',
      symbol: 'ZRX',
      decimals: 18,
    },
    {
      key: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
      symbol: 'BAT',
      decimals: 18,
    },
    {
      key: '0x0000000000085d4780B73119b644AE5ecd22b376',
      symbol: 'TUSD',
      decimals: 18,
    },
    {
      key: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
      symbol: 'PAX',
      decimals: 18,
    },
    {
      key: '0x514910771af9ca656af840dff83e8264ecf986ca',
      symbol: 'LINK',
      decimals: 18,
    },
    {
      key: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
      symbol: 'WBTC',
      decimals: 8,
    },
    {
      key: '0xdd974d5c2e2928dea5f71b9825b8b646686bd200',
      symbol: 'KNC',
      decimals: 18,
    },
    {
      key: '0xc00e94cb662c3520282e6f5717214004a7f26888',
      symbol: 'COMP',
      decimals: 18,
    },
    {
      key: '0x0F5D2fB29fb7d3CFeE444a200298f468908cC942',
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

    // pegcoins markets
    ['DAI', 'USDC'],
    ['SAI', 'USDC'],
    ['DAI', 'TUSD'],
    ['DAI', 'PAX'],

    // WETH markets
    ['REP', 'WETH'],
    ['ZRX', 'WETH'],
    ['BAT', 'WETH'],
    ['LINK', 'WETH'],
    ['WBTC', 'WETH'],
    ['KNC', 'WETH'],
    ['COMP', 'WETH'],
    ['MANA', 'WETH'],

    // outside UI
    ['MKR', 'DAI'],
    ['MKR', 'SAI'],
    ['MKR', 'WETH'],
  ],
  contracts: lowercaseValues({
    makerOtc: oasisContracts[0].address,
    makerOtcSupport: '0x9b3f075b12513afe56ca2ed838613b7395f57839',
    vat: '0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b',
    pot: '0x197e90f9fad81970ba7976f33cbd77088e5d7cf7',
  }),
  ilks: {
    DAI: 'DAI',
    'ETH-A': 'WETH',
    'BAT-A': 'BAT',
    'WBTC-A': 'WBTC',
  },
};

// export const config: UserProvidedSpockConfig = {
//   startingBlock: 4751582,
//   extractors: [
//     ...makeRawLogExtractors(oasisContracts),

//     // multiply related
//     ...makeRawLogExtractors(mcdContracts),
//     ...makeRawLogExtractors(mcdContracts2),
//     ...makeRawEventBasedOnTopicExtractor(proxyActionsAbis),
//     ...makeRawLogExtractors(proxyFactory),
//     ...makeRawLogExtractors(cdpManagers),
//     // missing starting block
//     ...makeMidpointOfferExtractors(
//       addresses.contracts.makerOtc,
//       [addresses.tokens['DAI'].key, addresses.tokens['WETH'].key],
//       startingBlockMultiplyTrading,
//     ),
//   ],
//   transformers: [
//     otcTransformer,
//     otcTransformerMarket(oasisContracts.map(e => e.address)),

//     // multiply related
//     ...cdpTransformer(cdpManagers),
//     ...mcdTransformerCat(
//       cdpManagers.map(e => e.address),
//       [cat, cat2],
//     ),
//     ...mcdTransformerFlip(values(flippers).map(flip => ({ flip: flip, cat: cat.address }))),
//     ...mcdTransformerFlipDsNote(values(flippers)),
//     ...mcdTransformerFlip(values(flippers2).map(flip => ({ flip: flip, cat: cat2.address }))),
//     ...mcdTransformerFlipDsNote(values(flippers2)),
//     ...trackAllNewlyCreatedProxies(proxyFactory),
//     proxyActionsTransformer(
//       proxyFactory.map(pf => pf.address),
//       proxyActionsAbis.map(a => a.name),
//       startingBlockMultiplyTrading,
//     ),
//     makeOtcMidpointPriceTransformer(
//       addresses.contracts.makerOtc,
//       [addresses.tokens['DAI'].key, addresses.tokens['WETH'].key],
//       startingBlockMultiplyTrading,
//     ),
//   ],
//   migrations: {
//     otc: join(__dirname, './otc/migrations'),
//     multiply: join(__dirname, './multiply/migrations'),
//   },
//   api: {
//     whitelisting: {
//       enabled: true,
//       whitelistedQueriesDir: './queries',
//     },
//   },
//   addresses,
//   onStart: loadTokens,
// };

export const config: UserProvidedSpockConfig = {
  startingBlock: 11822992,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    ...makeRawLogExtractors([daiJoin]),
    ...makeRawLogExtractors([vat]),
  ],
  transformers: [
    ...cdpTransformer(cdpManagers),
    ...cdpTransformerNote(cdpManagers),
    ...managerFrobTransformer(cdpManagers, makeManagerFrobDependencies([vat])),
    vatUrnTransformerNote(vat, makeCDPNoteDependencies(cdpManagers)),
    daiJoinTransformer(daiJoin),
    vatFrobTransformer(vat),
  ],
  migrations: {

    borrow: join(__dirname, './borrow/migrations'),
  },
  onStart: () => { }
};