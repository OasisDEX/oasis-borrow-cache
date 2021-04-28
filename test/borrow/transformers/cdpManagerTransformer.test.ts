import { expect } from 'earljs';
import { constants } from 'ethers';
import { getSQL, destroyTestServices, executeSQL } from '@oasisdex/spock-test-utils';

import {
  managerGiveTransformer,
  openCdpTransformer,
} from '../../../src/borrow/transformers/cdpManagerTransformer';
import { Services, TransactionalServices } from '@oasisdex/spock-etl/dist/services/types';
import { createServices } from '../../utils/createServices';
import { SpockConfig } from '@oasisdex/spock-etl/dist/services/config';

async function getUrnForCdp(): Promise<string> {
  return '0x000';
}

describe('CdpManagerTransformer', () => {
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
        VALUES('0x01', '0x01', '0x00', 1, 1, 0, 0, 0, '');
    `,
    );
  });

  afterEach(() => destroyTestServices(services));

  it('saves cdp', async () => {
    const transformerInstance = openCdpTransformer([constants.AddressZero], { getUrnForCdp })[0];
    const data = require('../../fixture/open-cdp-log.json');

    await transformerInstance.transform(txServices, data);

    const cdp = await getSQL(services.db, `SELECT * FROM manager.cdp;`);
    expect(cdp).toEqual([
      {
        id: 1,
        creator: '0x361c9299a7fbe1b98f563a24f36facf33e88abbd',
        owner: '0x361c9299a7fbe1b98f563a24f36facf33e88abbd',
        address: '0x5ef30b9986345249bc32d8928b7ee64de9435e39',
        urn: '0x000',
        cdp_id: '6548',
        created_at: new Date('2019-07-02T11:18:01.000Z'),
        log_index: 1,
        tx_id: 1,
        block_id: 1,
      },
    ]);
  });

  it('handles OPEN events', async () => {
    const transformerInstance = openCdpTransformer([constants.AddressZero], { getUrnForCdp })[0];
    const data = require('../../fixture/open-cdp-log.json');

    await transformerInstance.transform(txServices, data);

    const allEvents = await getSQL(services.db, `SELECT * FROM vault.events;`);
    expect(allEvents).toEqual([
      {
        id: 1,
        kind: 'OPEN',
        collateral_amount: null,
        dai_amount: null,
        rate: null,
        vault_creator: '0x361c9299a7fbe1b98f563a24f36facf33e88abbd',
        depositor: null,
        urn: '0x000',
        cdp_id: '6548',
        transfer_from: null,
        transfer_to: null,
        timestamp: new Date('2019-07-02T11:18:01.000Z'),
        log_index: 1,
        tx_id: 1,
        block_id: 1,
        collateral: null,
        auction_id: null,
        collateral_price: null,
        collateral_taken: null,
        covered_debt: null,
        liq_penalty: null,
        remaining_collateral: null,
        remaining_debt: null,
        ilk: null,
      },
    ]);
  });
});

describe('CdpMigrationTransformer', () => {
  let services: Services;
  let txServices: TransactionalServices;

  beforeEach(async () => {
    [services, txServices] = await createServices({
      addresses: { MIGRATION: '0xc73e0383f3aff3215e6f04b0331d58cecf0ab849' },
    } as Partial<SpockConfig>);

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

  it('handles TRANSFER events', async () => {
    const cdpManagerTransformerInstance = openCdpTransformer([constants.AddressZero], {
      getUrnForCdp,
    })[0];
    const transformerInstance = managerGiveTransformer([constants.AddressZero])[0];
    const data = require('../../fixture/transfer-log.json');

    await cdpManagerTransformerInstance.transform(txServices, data);
    await transformerInstance.transform(txServices, data);

    const allEvents = await getSQL(
      services.db,
      `SELECT * FROM vault.events e WHERE e.kind = 'TRANSFER';`,
    );
    expect(allEvents).toEqual([
      {
        id: 2,
        kind: 'TRANSFER',
        collateral_amount: null,
        dai_amount: null,
        rate: null,
        vault_creator: null,
        depositor: null,
        urn: '0x000',
        cdp_id: '2',
        transfer_from: '0xddb108893104de4e1c6d0e47c42237db4e617acc',
        transfer_to: '0x50c04ecf34c71c6e5478d040e177628b7c511960',
        timestamp: new Date('2019-07-02T11:18:02.000Z'),
        log_index: 2,
        tx_id: 2,
        block_id: 2,
        collateral: null,
        auction_id: null,
        collateral_price: null,
        collateral_taken: null,
        covered_debt: null,
        liq_penalty: null,
        remaining_collateral: null,
        remaining_debt: null,
        ilk: null,
      },
    ]);
  });

  it('handles MIGRATE events', async () => {
    const cdpManagerTransformerInstance = openCdpTransformer([constants.AddressZero], {
      getUrnForCdp,
    })[0];
    const transformerInstance = managerGiveTransformer([constants.AddressZero])[0];
    const data = require('../../fixture/migrate-log.json');

    await cdpManagerTransformerInstance.transform(txServices, data);
    await transformerInstance.transform(txServices, data);

    const allEvents = await getSQL(
      services.db,
      `SELECT * FROM vault.events e WHERE e.kind = 'MIGRATE';`,
    );
    expect(allEvents).toEqual([
      {
        id: 2,
        kind: 'MIGRATE',
        collateral_amount: null,
        dai_amount: null,
        rate: null,
        vault_creator: null,
        depositor: null,
        urn: '0x000',
        cdp_id: '998',
        transfer_from: '0xc73e0383f3aff3215e6f04b0331d58cecf0ab849',
        transfer_to: '0x8a6f431d8c641204c24065f2030d853d5472b947',
        timestamp: new Date('2019-07-02T11:18:02.000Z'),
        log_index: 1,
        tx_id: 2,
        block_id: 2,
        collateral: null,
        auction_id: null,
        collateral_price: null,
        collateral_taken: null,
        covered_debt: null,
        liq_penalty: null,
        remaining_collateral: null,
        remaining_debt: null,
        ilk: null,
      },
    ]);
  });
});
