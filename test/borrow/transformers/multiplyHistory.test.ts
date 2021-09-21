import { expect } from 'earljs';
import { constants } from 'ethers';
import { getSQL, destroyTestServices, executeSQL } from '@oasisdex/spock-test-utils';

import { Services, TransactionalServices } from '@oasisdex/spock-etl/dist/services/types';
import { createServices } from '../../utils/createServices';

import { multiplyHistoryTransformer } from '../../../src/borrow/transformers/multiplyHisotry';
import { BigNumber } from 'ethers/utils';

const depositEvent = {
    id: 1,
    kind: 'DEPOSIT',
    collateral_amount: new BigNumber(10),
    dai_amount: new BigNumber(0),
    urn: '0x00',
    timestamp: new Date('2019-11-13 21:45:03+00'),
    log_index: 1,
    tx_id: 1,
    block_id: 1,
    oracle_price: new BigNumber(0)
}

const withdrawEvent = {
  id: 1,
  kind: 'WITHDRAW',
  collateral_amount: new BigNumber(0),
  dai_amount: new BigNumber(100),
  urn: '0x00',
  timestamp: new Date('2019-11-13 21:45:03+00'),
  log_index: 1,
  tx_id: 2,
  block_id: 2,
  oracle_price: new BigNumber(0)
}




describe('multiplyHistory', () => {
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

  it.only('combines events into WITHDRAW-PAYBACK event', async () => {
    const multiplyHistoryTransformerInstance = multiplyHistoryTransformer(constants.AddressZero, 0, {
        dogAddress: '0x',
        multiplyProxyActionsAddress: '0x'
    })

    const data = require('../../fixture/combine-withdraw-payback-log.json');
   
    await multiplyHistoryTransformerInstance.transform(txServices, data)

  });
});
