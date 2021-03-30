import { makeRawLogExtractors } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { makeRawEventBasedOnTopicExtractor } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import { join } from 'path';

import { UserProvidedSpockConfig } from '@oasisdex/spock-etl/dist/services/config';
import {
  managerGiveTransformer,
  openCdpTransformer,
} from './borrow/transformers/cdpManagerTransformer';

import { vatCombineTransformer, vatTransformer } from './borrow/transformers/vatTransformer';
import { catTransformer } from './borrow/transformers/catTransformer';
import { AbiInfo, makeRowEventBasedOnDSNoteTopic } from './borrow/customExtractor';
import { flipNoteTransformer, flipTransformer } from './borrow/transformers/flipperTransformer';
import { getIlkInfo } from './borrow/services/getIlkInfo';
import { getUrnForCdp } from './borrow/services/getUrnForCdp';

const vat = {
  address: '0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b',
  startingBlock: 8928152,
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

const flipper = [
  {
    name: 'flipper',
    abi: require('../abis/flipper.json'),
    startingBlock: 8928152,
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
    startingBlock: 8928152,
  },
];

const addresses = {
  MIGRATION: '0xc73e0383f3aff3215e6f04b0331d58cecf0ab849',
  ILK_REGISTRY: '0x8b4ce5dcbb01e0e1f0521cd8dcfb31b308e52c24',
};

export const config: UserProvidedSpockConfig = {
  startingBlock: 9638188, //8928152,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    ...makeRawLogExtractors(cats),
    ...makeRawLogExtractors([vat]),
    ...makeRawEventBasedOnTopicExtractor(flipper),
    ...makeRowEventBasedOnDSNoteTopic(flipperNotes),
  ],
  transformers: [
    ...openCdpTransformer(cdpManagers, { getUrnForCdp }),
    ...managerGiveTransformer(cdpManagers),
    ...catTransformer(cats, { getIlkInfo }),
    vatTransformer(vat),
    vatCombineTransformer(vat),
    flipTransformer(),
    flipNoteTransformer(),
  ],
  migrations: {
    borrow: join(__dirname, './borrow/migrations'),
  },
  addresses,
  onStart: () => { },
};
