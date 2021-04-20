import { expect } from 'earljs';
import { constants } from 'ethers';
import { getSQL, destroyTestServices, executeSQL } from '@oasisdex/spock-test-utils';

import {
  flipTransformer,
  flipNoteTransformer,
} from '../../../src/borrow/transformers/flipperTransformer';
import { Services, TransactionalServices } from '@oasisdex/spock-etl/dist/services/types';
import { createServices } from '../../utils/createServices';

describe('flipperTransformer', () => {
  let services: Services;
  let txServices: TransactionalServices;

  beforeEach(async () => {
    [services, txServices] = await createServices();

    await executeSQL(
      services.db,
      `
        INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(1, '0x01', '2019-07-02 11:18:01+00');
        INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(2, '0x02', '2019-07-02 11:18:02+00');
        INSERT INTO vulcan2x.transaction (hash, to_address, from_address, block_id, nonce, value, gas_limit, gas_price, data) 
          VALUES('0x01', '0x01', '0x00', 1, 1, 0, 0, 0, ''),
          ('0x02', '0x01', '0x00', 1, 1, 0, 0, 0, ''),
          ('0x03', '0x01', '0x00', 2, 1, 0, 0, 0, ''),
          ('0x04', '0x01', '0x00', 2, 1, 0, 0, 0, '');
      `,
    );
  });

  afterEach(() => destroyTestServices(services));

  it('handles Kick events', async () => {
    const transformerInstance = flipTransformer();
    const data = require('../../fixture/kick-log.json');

    await transformerInstance.transform(txServices, data);

    const allKick = await getSQL(services.db, `SELECT * FROM flipper.kick;`);
    expect(allKick).toEqual([
      {
        id: 1,
        auction_id: '578',
        lot: '3676000000000000000',
        bid: '0',
        tab: '548311413765941636196675879758775710587899457773',
        usr: '0xb861d96d3d7619a517ebfb8d1e31f734658207e7',
        gal: '0xa950524441892a31ebddf91d3ceefa04bf454466',
        flipper: '0xd8a04f5412223f513dc55f839574430f5ec15531',
        log_index: 1,
        tx_id: 1,
        block_id: 1,
      },
    ]);
  });
});

describe('flipperNoteTransformer', () => {
  let services: Services;
  let txServices: TransactionalServices;

  beforeEach(async () => {
    [services, txServices] = await createServices();

    await executeSQL(
      services.db,
      `
        INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(1, '0x01', '2019-07-02 11:18:01+00');
        INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(2, '0x02', '2019-07-02 11:18:02+00');
        INSERT INTO vulcan2x.transaction (hash, to_address, from_address, block_id, nonce, value, gas_limit, gas_price, data) 
          VALUES('0x01', '0x01', '0x00', 1, 1, 0, 0, 0, ''),
          ('0x02', '0x01', '0x00', 1, 1, 0, 0, 0, ''),
          ('0x03', '0x01', '0x00', 2, 1, 0, 0, 0, ''),
          ('0x04', '0x01', '0x00', 2, 1, 0, 0, 0, '');
      `,
    );
  });

  afterEach(() => destroyTestServices(services));

  it('handles dent events', async () => {
    const transformerInstance = flipNoteTransformer();
    const data = require('../../fixture/dent-log.json');

    await transformerInstance.transform(txServices, data);

    const allDents = await getSQL(services.db, `SELECT * FROM flipper.dent;`);
    expect(allDents).toEqual([
      {
        id: 1,
        auction_id: '572',
        lot: '15506222067599063040',
        bid: '2948474911232664845704947107521967071833080014412',
        flipper: '0xd8a04f5412223f513dc55f839574430f5ec15531',
        log_index: 1,
        tx_id: 1,
        block_id: 1,
      },
    ]);
  });

  it('handles tend events', async () => {
    const transformerInstance = flipNoteTransformer();
    const data = require('../../fixture/tend-log.json');

    await transformerInstance.transform(txServices, data);

    const allTends = await getSQL(services.db, `SELECT * FROM flipper.tend;`);
    expect(allTends).toEqual([
      {
        id: 1,
        auction_id: '572',
        lot: '20000000000000000000',
        bid: '2948474911232664845704947107521967071833080014412',
        flipper: '0xd8a04f5412223f513dc55f839574430f5ec15531',
        log_index: 1,
        tx_id: 1,
        block_id: 1,
      },
    ]);
  });

  it('handles deal events', async () => {
    const transformerInstance = flipNoteTransformer();
    const data = require('../../fixture/deal-log.json');

    await transformerInstance.transform(txServices, data);

    const allDeals = await getSQL(services.db, `SELECT * FROM flipper.deal;`);
    expect(allDeals).toEqual([
      {
        id: 1,
        auction_id: '84',
        flipper: '0xaa745404d55f88c108a28c86abe7b5a1e7817c07',
        log_index: 1,
        tx_id: 1,
        block_id: 1,
      },
    ]);
  });
});
