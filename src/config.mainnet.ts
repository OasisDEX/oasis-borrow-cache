import { makeRawLogExtractors } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { makeRawEventBasedOnTopicExtractor } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import { join } from 'path';

import { UserProvidedSpockConfig } from '@oasisdex/spock-etl/dist/services/config';
import { managerGiveTransformer, openCdpTransformer } from './borrow/transformers/cdpManagerTransformer';

import { vatCombineTransformer, vatTransformer } from './borrow/transformers/vatTransformer';
import { catTransformer, flipTransformer } from './borrow/transformers/catTransformer';

const migrationAddress = '0xc73e0383f3aff3215e6f04b0331d58cecf0ab849'

const vat = {
  address: '0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b',
  startingBlock: 8928152
}

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
]

const flipperActions = [
  {
    name: 'flipper-actions',
    abi: require('../abis/flipper.json'),
    startingBlock: 8928152,
  }
]

export const config: UserProvidedSpockConfig = {
  startingBlock: 11912600,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    ...makeRawLogExtractors(cats),
    ...makeRawLogExtractors([vat]),
    ...makeRawEventBasedOnTopicExtractor(flipperActions)
  ],
  transformers: [
    ...openCdpTransformer(cdpManagers),
    ...managerGiveTransformer(cdpManagers, migrationAddress),
    ...catTransformer(cats),
    vatTransformer(vat),
    vatCombineTransformer(vat),
    flipTransformer(cats),
  ],
  migrations: {

    borrow: join(__dirname, './borrow/migrations'),
  },
  onStart: () => { }
};