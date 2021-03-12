import { makeRawLogExtractors } from '@oasisdex/spock-utils/dist//extractors//rawEventDataExtractor';
import { join } from 'path';

import { UserProvidedSpockConfig } from '@oasisdex/spock-etl/dist/services/config';
import { managerGiveTransformer, openCdpTransformer } from './borrow/transformers/cdpManagerTransformer';

import { vatCombineTransformer, vatTransformer } from './borrow/transformers/vatTransformer';

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

export const config: UserProvidedSpockConfig = {
  startingBlock: 8928152,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    ...makeRawLogExtractors([vat]),
  ],
  transformers: [
    ...openCdpTransformer(cdpManagers),
    ...managerGiveTransformer(cdpManagers, migrationAddress),
    vatTransformer(vat),
    vatCombineTransformer(vat),
  ],
  migrations: {

    borrow: join(__dirname, './borrow/migrations'),
  },
  onStart: () => { }
};