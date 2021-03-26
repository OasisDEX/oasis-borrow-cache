import { expect } from 'earljs';
import { constants } from 'ethers';
import {
  getTestConfig,
  getSQL,
  createTestServices,
  destroyTestServices,
  executeSQL,
} from '@oasisdex/spock-test-utils';

import { vatTransformer } from '../../../src/borrow/transformers/vatTransformer';
import { Services, TransactionalServices } from '@oasisdex/spock-etl/dist/services/types';
import { join } from 'path';

describe('vatTransformer', () => {
  let services: Services;
  let txServices: TransactionalServices;

  beforeEach(async () => {
    const config = getTestConfig();
    services = await createTestServices({
      config: {
        ...config,
        ...{
          migrations: {
            borrow: join(__dirname, '../../../src/borrow/migrations'),
          },
        },
      },
    });
    txServices = {
      ...services,
      tx: services.db as any,
    };

    await executeSQL(
      services.db,
      `
      INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(1, '0x01', '2019-07-02 11:18:01+00');
      INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(2, '0x02', '2019-07-02 11:18:02+00');
      INSERT INTO vulcan2x.transaction (hash, to_address, from_address, block_id, nonce, value, gas_limit, gas_price, data) VALUES('0x01', '0x01', '0x00', 1, 1, 0, 0, 0, '');
    `,
    );
  });

  afterEach(() => destroyTestServices(services));

  it('parse fold events', async () => {
    const transformerInstance = vatTransformer(constants.AddressZero);
    const data = require('../../fixture/fold-log.json');

    await transformerInstance.transform(txServices, data);

    const allFolds = await getSQL(services.db, `SELECT * FROM vat.fold;`);
    expect(allFolds).toEqual([
      {
        block_id: 1,
        i: 'ETH-A',
        id: 1,
        log_index: 1,
        rate: '0.000000000000000000',
        timestamp: new Date('2019-07-02T11:18:01.000Z'),
        tx_id: 1,
        u: '0xa950524441892a31ebddf91d3ceefa04bf454466',
      },
    ]);
  });
  it('parse frob events', async () => {
    const transformerInstance = vatTransformer(constants.AddressZero);
    const data = require('../../fixture/frob-log.json');

    await transformerInstance.transform(txServices, data);

    const allFrobs = await getSQL(services.db, `SELECT * FROM vat.frob;`);
    expect(allFrobs).toEqual([
      {
        id: 1,
        dart: '0.000000000000000000',
        dink: '100000000000000000.000000000000000000',
        ilk: 'ETH-A',
        u: '0x9fdc236bb08b80b5ab3d3bf7140b5068cc2ea88a',
        v: '0x9fdc236bb08b80b5ab3d3bf7140b5068cc2ea88a',
        w: '0x9fdc236bb08b80b5ab3d3bf7140b5068cc2ea88a',
        log_index: 1,
        tx_id: 1,
        block_id: 1,
        timestamp: new Date('2019-07-02T11:18:01.000Z')
      },
    ]);
  });
});
