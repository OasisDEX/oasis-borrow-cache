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
  address: '0xba987bdb501d131f766fee8180da5d81b34b69d9',
  startingBlock: 14764534,
};

const cdpManagers = [
  {
    address: '0x1476483dd8c35f25e568113c5f70249d3976ba21',
    startingBlock: 14764597,
  },
];

const cats = [
  {
    address: '0xa9fa5837eea55f3038a2ca755ce4b5dfac599c37',
    startingBlock: 18419868,
  },
  {
    address: '0xddb5f7a3a5558b9a6a1f3382bd75e2268d1c6958',
    startingBlock: 20465209,
  },
];

const flipper = [
  {
    name: 'flipper',
    abi: require('../abis/flipper.json'),
    startingBlock: 14764534,
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
    startingBlock: 14764534,
  },
];

const addresses = {
  MIGRATION: '0x411B2Faa662C8e3E5cF8f01dFdae0aeE482ca7b0',
  ILK_REGISTRY: '0xedE45A0522CA19e979e217064629778d6Cc2d9Ea',
};

export const config: UserProvidedSpockConfig = {
  startingBlock: 14764534,
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
    flipTransformer(cats),
    flipNoteTransformer(cats),
  ],
  migrations: {
    borrow: join(__dirname, './borrow/migrations'),
  },
  addresses,
  onStart: () => { },
};
