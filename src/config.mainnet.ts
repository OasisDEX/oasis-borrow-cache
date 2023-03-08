import { makeRawLogExtractors } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { makeRawEventBasedOnTopicExtractor } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import { join } from 'path';

import { UserProvidedSpockConfig } from '@oasisdex/spock-etl/dist/services/config';
import {
  managerGiveTransformer,
  openCdpTransformer,
} from './borrow/transformers/cdpManagerTransformer';

import {
  vatCombineTransformer,
  vatMoveEventsTransformer,
  vatRawMoveTransformer,
  vatTransformer,
} from './borrow/transformers/vatTransformer';
import { auctionTransformer, catTransformer } from './borrow/transformers/catTransformer';
import {
  AbiInfo,
  makeRawEventExtractorBasedOnTopicIgnoreConflicts,
  makeRawEventBasedOnDSNoteTopic,
} from './borrow/customExtractors';
import { flipNoteTransformer, flipTransformer } from './borrow/transformers/flipperTransformer';
import { getIlkInfo } from './borrow/dependencies/getIlkInfo';
import { getUrnForCdp } from './borrow/dependencies/getUrnForCdp';
import { getLiquidationRatio } from './borrow/dependencies/getLiquidationRatio';
import { getIlkForCdp } from './borrow/dependencies/getIlkForCdp';
import {
  auctionLiq2Transformer,
  dogTransformer,
  getDogTransformerName,
} from './borrow/transformers/dogTransformer';
import { clipperTransformer } from './borrow/transformers/clipperTransformer';
import { multiplyGuniTransformer, multiplyTransformer } from './borrow/transformers/multiply';
import { exchangeTransformer } from './borrow/transformers/exchange';

import { getOraclesAddresses } from './utils/addresses';
import {
  getOracleTransformerName,
  oraclesTransformer,
} from './borrow/transformers/oraclesTransformer';
import {
  eventEnhancerGasPrice,
  eventEnhancerTransformer,
  eventEnhancerTransformerEthPrice,
} from './borrow/transformers/eventEnhancer';
import { multiplyHistoryTransformer } from './borrow/transformers/multiplyHistoryTransformer';
import { initializeCommandAliases } from './utils';
import { automationBotTransformer, automationBotV2Transformer } from './borrow/transformers/automationBotTransformer';
import {
  automationBotExecutedTransformerV1,
  automationBotExecutedTransformerV2,
} from './borrow/transformers/automationBotExecutedTransformer';
import { automationAggregatorBotTransformer } from './borrow/transformers/automationAggregatorBotTransformer';
import { redeemerTransformer } from './borrow/transformers/referralRedeemer';
import { lidoTransformer } from './borrow/transformers/lidoTransformer';
import { aaveLendingPoolTransformer } from './borrow/transformers/aaveTransformer';
import {
  automationEventEnhancerGasPriceV1,
  automationEventEnhancerGasPriceV2,
  automationEventEnhancerTransformerEthPriceV1,
  automationEventEnhancerTransformerEthPriceV2,
} from './borrow/transformers/automationEventEnhancer';
import { aavev3LendingPoolTransformer } from './borrow/transformers/aavev3Transformer';

const mainnetAddresses = require('./addresses/mainnet.json');

const GENESIS = Number(process.env.GENESIS) || 8928152;

const vat = {
  address: '0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b',
  startingBlock: GENESIS,
};

const cdpManagers = [
  {
    address: '0x5ef30b9986345249bc32d8928B7ee64DE9435E39',
    startingBlock: 8928198,
  },
];

const cats = [
  {
    address: '0x78F2c2AF65126834c51822F56Be0d7469D7A523E',
    startingBlock: 9638144,
  },
  {
    address: '0xa5679C04fc3d9d8b0AaB1F0ab83555b301cA70Ea',
    startingBlock: 10742907,
  },
];

const dogs = [
  {
    address: '0x135954d155898d42c90d2a57824c690e0c7bef1b',
    startingBlock: 12246358,
  },
];

const clippers = [
  {
    name: 'clipper',
    abi: require('../abis/clipper.json'),
    startingBlock: 24136159,
  },
];

const flipper = [
  {
    name: 'flipper',
    abi: require('../abis/flipper.json'),
    startingBlock: GENESIS,
  },
];

const oracle = [
  {
    name: 'oracle',
    abi: require('../abis/oracle.json'),
    startingBlock: GENESIS,
  },
  {
    name: 'lp-oracle',
    abi: require('../abis/lp-oracle.json'),
    startingBlock: GENESIS,
  },
];

const flipperNotes: AbiInfo[] = [
  {
    name: 'flipper',
    functionNames: [
      'tend(uint256,uint256,uint256)',
      'dent(uint256,uint256,uint256)',
      'deal(uint256)',
    ],
    abi: require('../abis/flipper.json'),
    startingBlock: GENESIS,
  },
];

const automationBot = {
  address: mainnetAddresses.AUTOMATION_BOT,
  startingBlock: 14583413,
};

const automationBotV2 = {
  address: mainnetAddresses.AUTOMATION_BOT_V2,
  startingBlock: 16565182,
};

const automationAggregatorBot = {
  address: mainnetAddresses.AUTOMATION_AGGREGATOR_BOT,
  startingBlock: 15389001,
};

const commandMapping = [
  {
    command_address: '0xa553c3f4e65a1fc951b236142c1f69c1bca5bf2b',
    kind: 'stop-loss',
  },
  {
    command_address: '0x05fb55553e54afb33a5acc1f23b1f4fffd0d1af9',
    kind: 'basic-buy',
  },
  {
    command_address: '0xd36729c7cAc24e47DC32FfD7D433F965CAaeB912',
    kind: 'basic-buy',
  },
  {
    command_address: '0x31285A87fB70a62b5AaA43199e53221c197E1e3f',
    kind: 'basic-buy',
  },
  {
    command_address: '0xa6bd41b821972e83d30598c5683efbbe6ad70fb8',
    kind: 'basic-sell',
  },
  {
    command_address: '0xF9469da48f9D2eA87e195e3DD522226e876A1185',
    kind: 'basic-sell',
  },
  {
    command_address: '0x5588d89A3C68E5a87Cafe6b79EF8cAA667a702f1',
    kind: 'basic-sell',
  },
  {
    command_address: '0x7c0d6d8d6eae8bcb106afdb3a21df5c254c6c0b2',
    kind: 'basic-sell',
  },
  {
    command_address: '0xC6ccab5d277d4780998362A418A86032548132B8',
    kind: 'auto-take-profit',
  },
  {
    command_address: '0xcb1e2f1df93bb5640562dad05c15f7677bf17297',
    kind: 'auto-take-profit',
  },
  {
    command_address: '0xe78acea26b79564c4d29d8c1f5bad3d4e0414676',
    kind: 'aave-stop-loss',
  },
  {
    command_address: '0xcef8eb2d43dc1db1ab292cb92f38dd406ee5749f',
    kind: 'aave-stop-loss',
  },
].map(({ command_address, kind }) => ({ command_address: command_address.toLowerCase(), kind }));

const addresses = {
  ...mainnetAddresses,
  MIGRATION: '0xc73e0383f3aff3215e6f04b0331d58cecf0ab849',
  ILK_REGISTRY: '0x5a464C28D19848f44199D003BeF5ecc87d090F87',
};

const multiply = [
  {
    address: '0x33b4be1b67c49125c1524777515e4034e04dff58',
    startingBlock: 13184929,
  },
  {
    address: '0xeae4061009f0b804aafc76f3ae67567d0abe9c27',
    startingBlock: 13140365,
  },
  {
    address: '0x2a49Eae5CCa3f050eBEC729Cf90CC910fADAf7A2',
    startingBlock: 13461195,
  },
  {
    address: '0x22E4CeE555C44df56ac7B85033cdE54B7439817c',
    startingBlock: 16775904,
  }
];

const guni = [
  {
    address: '0x64b0010f6b90d0ae0bf2587ba47f2d3437487447',
    startingBlock: 13621657,
  },
  {
    address: '0xed3a954c0adfc8e3f85d92729c051ff320648e30',
    startingBlock: 13733654,
  },
];

const exchange = [
  {
    address: '0xb5eb8cb6ced6b6f8e13bcd502fb489db4a726c7b',
    startingBlock: 13140368,
  },
  {
    address: '0x99e4484dac819aa74b347208752306615213d324',
    startingBlock: 13677143,
  },
  {
    address: '0x12dcc776525c35836b10026929558208d1258b91',
    startingBlock: 13733602,
  },
  {
    address: '0xf22f17b1d2354b4f4f52e4d164e4eb5e1f0a6ba6',
    startingBlock: 15774580,
  },
];
const oracles = getOraclesAddresses(mainnetAddresses).map(description => ({
  ...description,
  startingBlock: GENESIS,
}));

const oraclesTransformers = oracles.map(getOracleTransformerName);

const redeemer = [
  {
    address: '0xd9fabf81ed15ea71fbad0c1f77529a4755a38054',
    startingBlock: 15178804,
  },
];

const lido = [
  {
    address: '0x442af784a788a5bd6f42a01ebe9f287a871243fb',
    startingBlock: 11473216,
  },
];

const aaveLendingPool = [
  {
    address: '0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9',
    startingBlock: 11362579,
  },
];

const aavev3Pool = [
  {
    address: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
    startingBlock: 16291127
  }
];

export const config: UserProvidedSpockConfig = {
  startingBlock: GENESIS,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    ...makeRawLogExtractors(cats),
    ...makeRawLogExtractors(dogs),
    ...makeRawLogExtractors(redeemer),
    ...makeRawLogExtractors(lido),
    ...makeRawLogExtractors(aaveLendingPool),
    ...makeRawLogExtractors(aavev3Pool),
    ...makeRawLogExtractors([vat]),
    ...makeRawLogExtractors([automationBot]),
    ...makeRawLogExtractors([automationBotV2]),
    ...makeRawLogExtractors([automationAggregatorBot]),
    ...makeRawEventBasedOnTopicExtractor(flipper),
    ...makeRawEventBasedOnDSNoteTopic(flipperNotes),
    ...makeRawEventExtractorBasedOnTopicIgnoreConflicts(
      clippers,
      dogs.map(dog => dog.address.toLowerCase()),
    ), // ignore dogs addresses because event name conflict
    ...makeRawLogExtractors(multiply),
    ...makeRawLogExtractors(guni),
    ...makeRawLogExtractors(exchange),
    ...makeRawEventExtractorBasedOnTopicIgnoreConflicts(oracle),
  ],
  transformers: [
    ...openCdpTransformer(cdpManagers, { getUrnForCdp }),
    ...managerGiveTransformer(cdpManagers),
    ...catTransformer(cats),
    ...auctionTransformer(cats, { getIlkInfo }),
    ...dogTransformer(dogs),
    ...auctionLiq2Transformer(dogs, { getIlkInfo }),
    vatTransformer(vat),
    vatCombineTransformer(vat),
    vatMoveEventsTransformer(vat),
    vatRawMoveTransformer(vat),
    flipTransformer(),
    flipNoteTransformer(),
    automationBotTransformer(automationBot, multiply),
    automationBotV2Transformer(automationBotV2, multiply),
    automationBotExecutedTransformerV1(automationBot,{ automationBot, automationAggregatorBot }),
    automationBotExecutedTransformerV2(automationBotV2,{  automationBotV2 }),
    automationAggregatorBotTransformer(automationAggregatorBot, { automationBot }),
    clipperTransformer(dogs.map(dep => getDogTransformerName(dep.address))),
    ...multiplyTransformer(multiply, {
      cdpManager: cdpManagers[0].address,
      vat: vat.address,
      getIlkForCdp,
      getLiquidationRatio,
    }),
    ...multiplyGuniTransformer(guni, {
      cdpManager: cdpManagers[0].address,
      vat: vat.address,
      getIlkForCdp,
      getLiquidationRatio,
    }),
    ...exchangeTransformer(exchange),
    ...oraclesTransformer(oracles),
    eventEnhancerTransformer(vat, dogs[0], cdpManagers, oraclesTransformers),
    eventEnhancerTransformerEthPrice(vat, dogs[0], cdpManagers, oraclesTransformers),
    multiplyHistoryTransformer(vat.address, {
      dogs,
      multiplyProxyActionsAddress: [...multiply, ...guni],
      exchangeAddress: [...exchange],
    }),
    eventEnhancerGasPrice(vat, cdpManagers),
    automationEventEnhancerGasPriceV1(automationBot),
    automationEventEnhancerTransformerEthPriceV1(automationBot, oraclesTransformers),
    automationEventEnhancerGasPriceV2(automationBotV2),
    automationEventEnhancerTransformerEthPriceV2(automationBotV2, oraclesTransformers),
    ...redeemerTransformer(redeemer),
    ...lidoTransformer(lido),
    ...aaveLendingPoolTransformer(aaveLendingPool),
    ...aavev3LendingPoolTransformer(aavev3Pool),
  ],
  migrations: {
    borrow: join(__dirname, './borrow/migrations'),
  },
  api: {
    whitelisting: {
      enabled: false,
      whitelistedQueriesDir: './queries',
    },
  },
  addresses,
  onStart: async services => {
    await initializeCommandAliases(services, commandMapping);
  },
};
