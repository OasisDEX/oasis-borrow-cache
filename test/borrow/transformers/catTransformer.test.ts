import { expect } from 'earljs';
import { constants } from 'ethers';
import {
    getSQL,
    destroyTestServices,
    executeSQL,
} from '@oasisdex/spock-test-utils';

import { catTransformer } from '../../../src/borrow/transformers/catTransformer';
import { Services, TransactionalServices } from '@oasisdex/spock-etl/dist/services/types';
import { createServices } from '../../utils/createServices';
import { Ilk } from '../../../src/borrow/services/getIlkInfo';
import BigNumber from 'bignumber.js';

const mockIlk: Ilk = {
    dec: new BigNumber(16),
    flip: constants.AddressZero,
    gem: constants.AddressZero,
    name: 'MOCKED-A',
    pos: '',
    symbol: 'MOCKED',
}

const getIlkInfo = async () => mockIlk

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

    it('handle bite note events', async () => {
        const transformerInstance = catTransformer(
            [constants.AddressZero],
            {
                getIlkInfo,
            }
        )[0];
        const data = require('../../fixture/bite-log.json');

        await transformerInstance.transform(txServices, data);

        const allBites = await getSQL(services.db, `SELECT * FROM auctions.bite;`);
        expect(allBites).toEqual([
            {
                id: 1,
                ilk: "ETH-A",
                urn: "0xbae2de84e004a28bbecf7e01ef46cbacd179b598",
                ink: "20000000000000000000.000000000000000000",
                art: "2562530344205456551250.000000000000000000",
                tab: "2609269832949260925402608059753953160914230101250.000000000000000000",
                flip: "0xd8a04f5412223f513dc55f839574430f5ec15531",
                auction_id: "572",
                log_index: 1,
                tx_id: 1,
                block_id: 1,
            }
        ]);
    });
})