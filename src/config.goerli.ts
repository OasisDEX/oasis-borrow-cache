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
  eventEnhancerTransformer,
  eventEnhancerTransformerEthPrice,
} from './borrow/transformers/eventEnhancer';
import { automationBotTransformer } from './borrow/transformers/automationBotTransformer';
import { dsProxyTransformer } from './borrow/transformers/dsProxyTransformer';
import { partialABI } from './utils';

const AutomationBotABI = require('../abis/automation-bot.json');

const goerliAddresses = require('./addresses/goerli.json');

const GOERLI_STARTING_BLOCKS = {
  GENESIS: Number(process.env.GENESIS) || 5273074,
  CDP_MANAGER: 5273301,
  MCD_CAT: 5273080,
  MCD_DOG: 5273080,
  AUTOMATION_BOT: 6313029,
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

export const config: UserProvidedSpockConfig = {
  startingBlock: GOERLI_STARTING_BLOCKS.GENESIS,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    ...makeRawLogExtractors(cats),
    ...makeRawLogExtractors(dogs),
    ...makeRawLogExtractors([vat]),
    ...makeRawLogExtractors([automationBot]),
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
    automationBotTransformer(automationBot),
    clipperTransformer(dogs.map(dep => getDogTransformerName(dep.address))),
    ...oraclesTransformer(oracles),
    eventEnhancerTransformer(vat, dogs[0], cdpManagers, oraclesTransformers),
    eventEnhancerTransformerEthPrice(vat, dogs[0], cdpManagers, oraclesTransformers),
    ...dsProxyTransformer(),
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
  onStart: () => {},
};
