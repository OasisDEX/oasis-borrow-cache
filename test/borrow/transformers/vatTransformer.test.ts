import { expect } from 'earljs';
import { constants } from 'ethers';
import {
  getTestConfig,
  getSQL,
  createTestServices,
  destroyTestServices,
  executeSQL,
} from '@oasisdex/spock-test-utils';

import { vatTransformer, vatCombineTransformer } from '../../../src/borrow/transformers/vatTransformer';
import { Services, TransactionalServices } from '@oasisdex/spock-etl/dist/services/types';
import { join } from 'path';

async function createServices(): Promise<[Services, TransactionalServices]> {
  const config = getTestConfig();

  const services = await createTestServices({
    config: {
      ...config,
      ...{
        migrations: {
          borrow: join(__dirname, '../../../src/borrow/migrations'),
        },
      },
    },
  });

  const txServices: TransactionalServices = {
    ...services,
    tx: services.db as any,
  };

  return [
    services,
    txServices
  ]
}

describe('vatTransformer', () => {
  let services: Services;
  let txServices: TransactionalServices;

  beforeEach(async () => {
    [services, txServices] = await createServices()

    await executeSQL(
      services.db,
      `
      INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(1, '0x01', '2019-07-02 11:18:01+00');
      INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(2, '0x02', '2019-07-02 11:18:02+00');
      INSERT INTO vulcan2x.transaction (hash, to_address, from_address, block_id, nonce, value, gas_limit, gas_price, data) 
        VALUES('0x01', '0x01', '0x00', 1, 1, 0, 0, 0, '');
    `,
    );
  });

  afterEach(() => destroyTestServices(services));

  it('parse fold note events', async () => {
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
  it('parse frob note events', async () => {
    const transformerInstance = vatTransformer(constants.AddressZero);
    const data = require('../../fixture/frob-log.json');

    await transformerInstance.transform(txServices, data);

    const allEvents = await getSQL(services.db, `SELECT * FROM vat.frob;`);

    expect(allEvents).toEqual([
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
})

describe('Vat combine transformer', () => {
  let services: Services;
  let txServices: TransactionalServices;

  beforeEach(async () => {
    [services, txServices] = await createServices()

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
  it('combines events into DEPOSIT event', async () => {
    const transformerInstance = vatTransformer(constants.AddressZero);
    const combineTransformerInstance = vatCombineTransformer(constants.AddressZero);
    const data = require('../../fixture/combine-deposit-log.json');

    await transformerInstance.transform(txServices, data);
    await combineTransformerInstance.transform(txServices, data);

    const allEvents = await getSQL(services.db, `SELECT * FROM vault.events;`);

    expect(allEvents).toEqual([
      {
        id: 1,
        kind: "DEPOSIT",
        collateral_amount: "0.100000000000000000",
        dai_amount: "0.000000000000000000",
        rate: "1.000007388734071157",
        vault_creator: null,
        depositor: null,
        urn: "0x7097bd26db93b34c2e95112abd75c00a1e5bdd9e",
        v_gem: "0x7097bd26db93b34c2e95112abd75c00a1e5bdd9e",
        w_dai: "0x7097bd26db93b34c2e95112abd75c00a1e5bdd9e",
        cdp_id: null,
        transfer_from: null,
        transfer_to: null,
        timestamp: new Date("2019-07-02 11:18:02+00"),
        log_index: 2,
        tx_id: 4,
        block_id: 2,
        collateral: null,
        auction_id: null,
      },
    ]);
  })

  it('combines events into DEPOSIT-GENERATE event', async () => {
    const transformerInstance = vatTransformer(constants.AddressZero);
    const combineTransformerInstance = vatCombineTransformer(constants.AddressZero);
    const data = require('../../fixture/combine-deposit-generate-log.json');

    await transformerInstance.transform(txServices, data);
    await combineTransformerInstance.transform(txServices, data);

    const allEvents = await getSQL(services.db, `SELECT * FROM vault.events;`);

    expect(allEvents).toEqual([
      {
        kind: "DEPOSIT-GENERATE",
        id: 1,
        cdp_id: null,
        collateral_amount: "12.001720024901368662",
        urn: "0x5aeb2a597f2c2ec1e8587ff99225e32dfb722b36",
        transfer_from: null,
        timestamp: new Date('2019-07-02T11:18:01.000Z'),
        log_index: 2,
        depositor: null,
        tx_id: 4,
        w_dai: "0x5aeb2a597f2c2ec1e8587ff99225e32dfb722b36",
        vault_creator: null,
        block_id: 1,
        auction_id: null,
        collateral: null,
        dai_amount: "811.344795256768841439",
        v_gem: "0x5aeb2a597f2c2ec1e8587ff99225e32dfb722b36",
        transfer_to: null,
        rate: "1.000005709754190194"
      }
    ]);
  })
})
