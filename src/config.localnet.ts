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
  makeRowEventBasedOnDSNoteTopic,
} from './borrow/customExtractors';
import { flipNoteTransformer, flipTransformer } from './borrow/transformers/flipperTransformer';
import { getIlkInfo } from './borrow/services/getIlkInfo';
import { getUrnForCdp } from './borrow/services/getUrnForCdp';
import {
  auctionLiq2Transformer,
  dogTransformer,
  getDogTransformerName,
} from './borrow/transformers/dogTransformer';
import { clipperTransformer } from './borrow/transformers/clipperTransformer';
import { multiplyTransformer } from './borrow/transformers/multiply';
import { exchangeTransformer } from './borrow/transformers/exchange';

const GENESIS = 13092130;

const vat = {
  address: '0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b',
  startingBlock: GENESIS,
};

const cdpManagers = [
  {
    address: '0x5ef30b9986345249bc32d8928B7ee64DE9435E39',
    startingBlock: 13092130,
  },
];

const cats = [
  {
    address: '0x78F2c2AF65126834c51822F56Be0d7469D7A523E',
    startingBlock: 13092130,
  },
  {
    address: '0xa5679C04fc3d9d8b0AaB1F0ab83555b301cA70Ea',
    startingBlock: 13092130,
  },
];

const dogs = [
  {
    address: '0x135954d155898d42c90d2a57824c690e0c7bef1b',
    startingBlock: 13092130,
  },
];

const clippers = [
  {
    name: 'clipper',
    abi: require('../abis/clipper.json'),
    startingBlock: 13092130,
  },
];

// DEV NOTE: make sure the address is correct 
const multiply = [
  {
    address: '0x82e01223d51Eb87e16A03E24687EDF0F294da6f1',
    startingBlock: 13092130,
  },
];

// DEV NOTE: make sure the address is correct 
const exchange = [
  {
    address: '0x7bc06c482DEAd17c0e297aFbC32f6e63d3846650',
    startingBlock: 13092130,
  }
]

const flipper = [
  {
    name: 'flipper',
    abi: require('../abis/flipper.json'),
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

const addresses = {
  MIGRATION: '0xc73e0383f3aff3215e6f04b0331d58cecf0ab849',
  ILK_REGISTRY: '0x8b4ce5dcbb01e0e1f0521cd8dcfb31b308e52c24',
};

export const config: UserProvidedSpockConfig = {
  // DEV NOTE: set to the any block that you are forking from
  startingBlock: 13092130,//GENESIS,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    // ...makeRawLogExtractors(cats),
    // ...makeRawLogExtractors(dogs),
    ...makeRawLogExtractors([vat]),
    // ...makeRawEventBasedOnTopicExtractor(flipper),
    // ...makeRowEventBasedOnDSNoteTopic(flipperNotes),
    // ...makeRawEventExtractorBasedOnTopicIgnoreConflicts(clippers, dogs.map(dog => dog.address.toLowerCase())), // ignore dogs addresses because event name conflict 
    ...makeRawLogExtractors(multiply),
    ...makeRawLogExtractors(exchange),
  ],
  transformers: [
    ...openCdpTransformer(cdpManagers, { getUrnForCdp }),
    ...managerGiveTransformer(cdpManagers),
    // ...catTransformer(cats),
    // ...auctionTransformer(cats, { getIlkInfo }),
    // ...dogTransformer(dogs),
    // ...auctionLiq2Transformer(dogs, { getIlkInfo }),
    vatTransformer(vat),
    vatCombineTransformer(vat),
    vatMoveEventsTransformer(vat),
    vatRawMoveTransformer(vat),
    // flipTransformer(),
    // flipNoteTransformer(),
    // clipperTransformer(dogs.map(dep => getDogTransformerName(dep.address))),
    ...multiplyTransformer(multiply),
    ...exchangeTransformer(exchange)
  ],
  migrations: {
    borrow: join(__dirname, './borrow/migrations'),
  },
  addresses,
  onStart: () => {},
};
