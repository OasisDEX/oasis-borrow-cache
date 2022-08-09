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
import {
  auctionLiq2Transformer,
  dogTransformer,
  getDogTransformerName,
} from './borrow/transformers/dogTransformer';
import { clipperTransformer } from './borrow/transformers/clipperTransformer';

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
import { automationBotTransformer } from './borrow/transformers/automationBotTransformer';
import { automationBotExecutedTransformer } from './borrow/transformers/automationBotExecutedTransformer';
import { automationAggregatorBotTransformer } from './borrow/transformers/automationAggregatorBotTransformer';
import { dsProxyTransformer } from './borrow/transformers/dsProxyTransformer';
import { initializeCommandAliases, partialABI } from './utils';
import { multiplyTransformer } from './borrow/transformers/multiply';
import { getIlkForCdp } from './borrow/dependencies/getIlkForCdp';
import { getLiquidationRatio } from './borrow/dependencies/getLiquidationRatio';
import { exchangeTransformer } from './borrow/transformers/exchange';
import { multiplyHistoryTransformer } from './borrow/transformers/multiplyHistoryTransformer';
import { redeemerTransformer } from './borrow/transformers/referralRedeemer';
import { aaveLendingPoolTransformer } from './borrow/transformers/aaveTransformer';
import { lidoTransformer } from './borrow/transformers/lidoTransformer';

const AutomationBotABI = require('../abis/automation-bot.json');

const goerliAddresses = require('./addresses/goerli.json');

const GOERLI_STARTING_BLOCKS = {
  GENESIS: Number(process.env.GENESIS) || 5273074,
  CDP_MANAGER: 5273301,
  MCD_CAT: 5273080,
  MCD_DOG: 5273080,
  AUTOMATION_BOT: 6707333,
  AUTOMATION_AGGREGATOR_BOT: 7368154,
  MULTIPLY_PROXY_ACTIONS: 6187206,
};

const OASIS_CONTRACTS = {
  MULTIPLY_V1: '0x24E54706B100e2061Ed67fAe6894791ec421B421',
  MULTIPLY_V2: '0xc9628adc0a9f95D1d912C5C19aaBFF85E420a853',
  EXCHANGE_V1: '0x1F55deAeE5e878e45dcafb9A620b383C84e4005a',
  EXCHANGE_V2: '0x2b0b4c5c58fe3CF8863c4948887099A09b84A69c',
};

const vat = {
  address: goerliAddresses.MCD_VAT,
  startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
};

const cdpManagers = [
  {
    address: goerliAddresses.CDP_MANAGER,
    startingBlock: GOERLI_STARTING_BLOCKS.CDP_MANAGER,
  },
];

const cats = [
  {
    address: goerliAddresses.MCD_CAT,
    startingBlock: GOERLI_STARTING_BLOCKS.MCD_CAT,
  },
];

const redeemer = [
  {
    address: '0x5C9141C77F9c04f171f62B6fdFf5E4462e9FD83A',
    startingBlock: 6893402,
  },
  {
    address: '0x0A0647e629A0825353B76dEeC232b29df960ac2d',
    startingBlock: 6991463,
  },
  {
    address: '0x23440aC6c8a10EA89132da74B705CBc6D99a805b',
    startingBlock: 7224992,
  },
];

const dogs = [
  {
    address: goerliAddresses.MCD_DOG,
    startingBlock: GOERLI_STARTING_BLOCKS.MCD_DOG,
  },
];

const clippers = [
  {
    name: 'clipper',
    abi: require('../abis/clipper.json'),
    startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  },
];

const flipper = [
  {
    name: 'flipper',
    abi: require('../abis/flipper.json'),
    startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  },
];

const oracle = [
  {
    name: 'oracle',
    abi: require('../abis/oracle.json'),
    startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  },
  {
    name: 'lp-oracle',
    abi: require('../abis/lp-oracle.json'),
    startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
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
    startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  },
];

const automationBot = {
  address: goerliAddresses.AUTOMATION_BOT,
  startingBlock: GOERLI_STARTING_BLOCKS.AUTOMATION_BOT,
};

const automationAggregatorBot = {
  address: goerliAddresses.AUTOMATION_AGGREGATOR_BOT,
  startingBlock: GOERLI_STARTING_BLOCKS.AUTOMATION_AGGREGATOR_BOT,
};

const commandMapping = [
  {
    command_address: '0x31285A87fB70a62b5AaA43199e53221c197E1e3f',
    kind: 'stop-loss',
  },
  {
    command_address: '0x7c86781A95b7E55E6C2F7297Ae6773e1dbcEAb13',
    kind: 'basic-buy',
  },
  {
    command_address: '0xe3ae7218d8e4a482e212ef1cbf2fcd0fb9882cc7',
    kind: 'basic-buy',
  },
  {
    command_address: '0x98b2b67795171380a4bfb5B8cD2F59aEA768b3ED',
    kind: 'basic-buy',
  },
  {
    command_address: '0x2003dC19056bA986B7d10AB4704897d685DD62D9',
    kind: 'basic-buy',
  },
  {
    command_address: '0xd4f94e013c7F47B989Ea79C6527E065C027794c7',
    kind: 'basic-sell',
  },
  {
    command_address: '0x6f878d8eb84e48da49900a6392b8f9ed262a50d7',
    kind: 'basic-sell',
  },
  {
    command_address: '0x3da3e38bBe1100DE5247617b4554115C0e452416',
    kind: 'basic-sell',
  },
  {
    command_address: '0xB52B1c61c667d570FF62745b19A0c58011A4b32C',
    kind: 'basic-sell',
  },
  {
    command_address: '0x2eCC5086CE10194175607d0D082fC27c3416693d',
    kind: 'basic-sell',
  },
].map(({ command_address, kind }) => ({ command_address: command_address.toLowerCase(), kind }));

const multiply = [
  {
    address: OASIS_CONTRACTS.MULTIPLY_V1,
    startingBlock: 6187206,
  },
  {
    address: OASIS_CONTRACTS.MULTIPLY_V2,
    startingBlock: 6465516,
  },
];

const exchange = [
  {
    address: OASIS_CONTRACTS.EXCHANGE_V1,
    startingBlock: 6465517,
  },
  {
    address: OASIS_CONTRACTS.EXCHANGE_V2,
    startingBlock: 7101342,
  },
];

const dsProxy = [
  {
    name: 'automation-bot',
    abi: partialABI(AutomationBotABI, [
      { name: 'ApprovalGranted', type: 'event' },
      { name: 'ApprovalRemoved', type: 'event' },
    ]),
    startingBlock: GOERLI_STARTING_BLOCKS.AUTOMATION_BOT,
  },
];

const addresses = {
  ...goerliAddresses,
  MIGRATION: '',
  ILK_REGISTRY: '0x525FaC4CEc48a4eF2FBb0A72355B6255f8D5f79e',
};

const oracles = getOraclesAddresses(goerliAddresses).map(description => ({
  ...description,
  startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
}));

const oraclesTransformers = oracles.map(getOracleTransformerName);

const aaveLendingPool = [
  {
    address: '0x368EedF3f56ad10b9bC57eed4Dac65B26Bb667f6',
    startingBlock: 7138747,
  },
];

const lido = [
  {
    address: '0x24d8451bc07e7af4ba94f69acdd9ad3c6579d9fb',
    startingBlock: 4533286,
  },
];

export const config: UserProvidedSpockConfig = {
  startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    ...makeRawLogExtractors(cats),
    ...makeRawLogExtractors(redeemer),
    ...makeRawLogExtractors(dogs),
    ...makeRawLogExtractors([vat]),
    ...makeRawLogExtractors([automationBot]),
    ...makeRawLogExtractors([automationAggregatorBot]),
    ...makeRawLogExtractors(multiply),
    ...makeRawLogExtractors(exchange),
    ...makeRawLogExtractors(aaveLendingPool),
    ...makeRawLogExtractors(lido),
    ...makeRawEventBasedOnTopicExtractor(flipper),
    ...makeRawEventBasedOnDSNoteTopic(flipperNotes),
    ...makeRawEventExtractorBasedOnTopicIgnoreConflicts(
      clippers,
      dogs.map(dog => dog.address.toLowerCase()),
    ), // ignore dogs addresses because event name conflict
    ...makeRawEventExtractorBasedOnTopicIgnoreConflicts(
      oracle,
      dogs.map(dog => dog.address.toLowerCase()),
    ),
    ...makeRawEventExtractorBasedOnTopicIgnoreConflicts(dsProxy, [goerliAddresses.AUTOMATION_BOT]),
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
    automationBotExecutedTransformer(automationBot, { automationBot, automationAggregatorBot }),
    automationAggregatorBotTransformer(automationAggregatorBot, { automationBot }),
    clipperTransformer(dogs.map(dep => getDogTransformerName(dep.address))),
    ...multiplyTransformer(multiply, {
      cdpManager: cdpManagers[0].address,
      vat: vat.address,
      getIlkForCdp,
      getLiquidationRatio,
    }),
    ...exchangeTransformer(exchange),
    ...oraclesTransformer(oracles),
    eventEnhancerTransformer(vat, dogs[0], cdpManagers, oraclesTransformers),
    eventEnhancerTransformerEthPrice(vat, dogs[0], cdpManagers, oraclesTransformers),
    ...dsProxyTransformer(),
    multiplyHistoryTransformer(vat.address, {
      dogs,
      multiplyProxyActionsAddress: [...multiply],
      exchangeAddress: [...exchange],
    }),
    eventEnhancerGasPrice(vat, cdpManagers),
    ...redeemerTransformer(redeemer),
    ...aaveLendingPoolTransformer(aaveLendingPool),
    ...lidoTransformer(lido),
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
