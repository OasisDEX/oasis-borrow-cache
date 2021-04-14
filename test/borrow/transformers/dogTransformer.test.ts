import { expect } from 'earljs';
import { constants } from 'ethers';
import { getSQL, destroyTestServices, executeSQL } from '@oasisdex/spock-test-utils';

import { catTransformer } from '../../../src/borrow/transformers/catTransformer';
import { Services, TransactionalServices } from '@oasisdex/spock-etl/dist/services/types';
import { createServices } from '../../utils/createServices';
import { Ilk } from '../../../src/borrow/services/getIlkInfo';
import BigNumber from 'bignumber.js';
import { dogTransformer } from '../../../src/borrow/transformers/dogTransformer';

// const dogAbi = require("../../../abis/dog.json")

// const Dog = new ethers.utils.Interface(dogAbi)
// const BarkEvent = Dog.getEvent('Bark')


const mockIlk: Ilk = {
    dec: new BigNumber(16),
    flip: constants.AddressZero,
    gem: constants.AddressZero,
    name: 'MOCKED-A',
    pos: '',
    symbol: 'MOCKED',
};

const getIlkInfo = async () => mockIlk;

// const BiteLog = [
//     {
//         "id": 264,
//         "block_id": 1,
//         "log_index": 1,
//         "address": "0x78f2c2af65126834c51822f56be0d7469d7a523e",
//         "data": "0x000000000000000000000000000000000000000000000001158e460913d0000000000000000000000000000000000000000000000000008aea409b2fedb4ad52000000000000000000000001c90bb4b701d63a547dce6c59d6a1edbac67cc502000000000000000000000000d8a04f5412223f513dc55f839574430f5ec15531000000000000000000000000000000000000000000000000000000000000023c",
//         "topics": "{0xa716da86bc1fb6d43d1493373f34d7a418b619681cd7b90f7ea667ba1489be28,0x4554482d41000000000000000000000000000000000000000000000000000000,0x000000000000000000000000bae2de84e004a28bbecf7e01ef46cbacd179b598}",
//         "tx_id": 1
//     }
// ]


// describe('dogTransformer', () => {
//     let services: Services;
//     let txServices: TransactionalServices;

//     beforeEach(async () => {
//         [services, txServices] = await createServices();

//         await executeSQL(
//             services.db,
//             `
//       INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(1, '0x01', '2019-07-02 11:18:01+00');
//       INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(2, '0x02', '2019-07-02 11:18:02+00');
//       INSERT INTO vulcan2x.transaction (hash, to_address, from_address, block_id, nonce, value, gas_limit, gas_price, data) 
//         VALUES('0x01', '0x01', '0x00', 1, 1, 0, 0, 0, '');
//     `,
//         );
//     });

//     afterEach(() => destroyTestServices(services));

//     it('handles bite note events', async () => {
//         const transformerInstance = dogTransformer([constants.AddressZero])[0];
//         const data = require('../../fixture/bite-log.json');

//         await transformerInstance.transform(txServices, data);

//         const allBites = await getSQL(services.db, `SELECT * FROM auctions.bite;`);
//         expect(allBites).toEqual([
//             {
//                 id: 1,
//                 ilk: 'ETH-A',
//                 urn: '0xbae2de84e004a28bbecf7e01ef46cbacd179b598',
//                 ink: '20000000000000000000.000000000000000000',
//                 art: '2562530344205456551250.000000000000000000',
//                 tab: '2609269832949260925402608059753953160914230101250.000000000000000000',
//                 flip: '0xd8a04f5412223f513dc55f839574430f5ec15531',
//                 auction_id: '572',
//                 log_index: 1,
//                 tx_id: 1,
//                 block_id: 1,
//             },
//         ]);
//     });

//     it('handles AUCTION_STARTED events', async () => {
//         const transformerInstance = catTransformer([constants.AddressZero], { getIlkInfo })[0];
//         const data = require('../../fixture/bite-log.json');

//         await transformerInstance.transform(txServices, data);

//         const allEvents = await getSQL(services.db, `SELECT * FROM vault.events;`);
//         expect(allEvents).toEqual([
//             {
//                 id: 1,
//                 kind: 'AUCTION_STARTED',
//                 collateral_amount: '2000.000000000000000000',
//                 dai_amount: '2562.530344205456551250',
//                 rate: null,
//                 vault_creator: null,
//                 depositor: null,
//                 urn: '0xbae2de84e004a28bbecf7e01ef46cbacd179b598',
//                 v_gem: null,
//                 w_dai: null,
//                 cdp_id: null,
//                 transfer_from: null,
//                 transfer_to: null,
//                 timestamp: new Date('2019-07-02T11:18:01.000Z'),
//                 log_index: 1,
//                 tx_id: 1,
//                 block_id: 1,
//                 collateral: 'MOCKED',
//                 auction_id: '572',
//             },
//         ]);
//     });
// });
