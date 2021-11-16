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
  eventEnhancerTransformer,
  eventEnhancerTransformerEthPrice,
} from './borrow/transformers/eventEnhancer';
import { multiplyHistoryTransformer } from './borrow/transformers/multiplyHistoryTransformer';

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
  }
];

const guni = [
  {
    address: '0x64b0010f6b90d0ae0bf2587ba47f2d3437487447',
    startingBlock: 13621657,
  }
];

const exchange = [
  {
    address: '0xb5eb8cb6ced6b6f8e13bcd502fb489db4a726c7b',
    startingBlock: 13140368,
  },
];
const oracles = getOraclesAddresses(mainnetAddresses).map(description => ({
  ...description,
  startingBlock: GENESIS,
}));

const oraclesTransformers = oracles.map(getOracleTransformerName);

export const config: UserProvidedSpockConfig = {
  startingBlock: GENESIS,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    ...makeRawLogExtractors(cats),
    ...makeRawLogExtractors(dogs),
    ...makeRawLogExtractors([vat]),
    ...makeRawEventBasedOnTopicExtractor(flipper),
    ...makeRowEventBasedOnDSNoteTopic(flipperNotes),
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
      multiplyProxyActionsAddress: multiply,
    }),
    multiplyHistoryTransformer(vat.address, {
      dogs,
      multiplyProxyActionsAddress: guni,
    }),
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
