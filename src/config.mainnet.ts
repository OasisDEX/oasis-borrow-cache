import { makeRawLogExtractors } from '@oasisdex/spock-utils/dist//extractors//rawEventDataExtractor';
import { join } from 'path';

import { UserProvidedSpockConfig } from '@oasisdex/spock-etl/dist/services/config';
import { managerFrobTransformer, managerGiveTransformer, openCdpTransformer } from './borrow/transformers/cdpManagerTransformer';

import { vatCombineTransformer, vatFrobTransformer } from './borrow/transformers/vatTransformer';

import { daiJoinTransformer } from './borrow/transformers/daiJoinTransformer';


const vat = {
  address: '0x35d1b3f3d7966a1dfe207aa4514c12a259a0492b',
  startingBlock: 8928152
}

const daiJoin = {
  address: '0x9759A6Ac90977b93B58547b4A71c78317f391A28',
  startingBlock: 8928130,
}


const cdpManagers = [
  {
    address: '0x5ef30b9986345249bc32d8928B7ee64DE9435E39',
    startingBlock: 8928198,
  },
];

export const config: UserProvidedSpockConfig = {
  startingBlock: 11822992,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    ...makeRawLogExtractors([daiJoin]),
    ...makeRawLogExtractors([vat]),
  ],
  transformers: [
    ...openCdpTransformer(cdpManagers),
    ...managerFrobTransformer(cdpManagers),
    ...managerGiveTransformer(cdpManagers),
    daiJoinTransformer(daiJoin),
    vatFrobTransformer(vat),
    vatCombineTransformer(vat),
  ],
  migrations: {

    borrow: join(__dirname, './borrow/migrations'),
  },
  onStart: () => { }
};