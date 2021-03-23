import { makeRawLogExtractors } from '@oasisdex/spock-utils/dist//extractors//rawEventDataExtractor';
import { join } from 'path';

import { UserProvidedSpockConfig } from '@oasisdex/spock-etl/dist/services/config';
import {
  managerGiveTransformer,
  openCdpTransformer,
} from './borrow/transformers/cdpManagerTransformer';

import { vatCombineTransformer, vatTransformer } from './borrow/transformers/vatTransformer';
import { catTransformer } from './borrow/transformers/catTransformer';

const vat = {
  address: '0xbA987bDB501d131f766fEe8180Da5d81b34b69d9',
  startingBlock: 14764534,
};

const cdpManagers = [
  {
    address: '0x1476483dD8C35F25e568113C5f70249D3976ba21',
    startingBlock: 14764597,
  },
];

const cats = [
  {
    address: '0xdDb5F7A3A5558b9a6a1f3382BD75E2268d1c6958',
    startingBlock: 20465209,
  },
  {
    address: '0xa5679C04fc3d9d8b0AaB1F0ab83555b301cA70Ea',
    startingBlock: 10742907,
  },
];

export const config: UserProvidedSpockConfig = {
  startingBlock: 8928152,
  extractors: [
    ...makeRawLogExtractors(cdpManagers),
    ...makeRawLogExtractors(cats),
    ...makeRawLogExtractors([vat]),
  ],
  transformers: [
    ...openCdpTransformer(cdpManagers),
    ...managerGiveTransformer(cdpManagers),
    ...catTransformer(cats),
    vatTransformer(vat),
    vatCombineTransformer(vat),
  ],
  migrations: {
    borrow: join(__dirname, './borrow/migrations'),
  },
  onStart: () => {},
};
