import { Services, TransactionalServices } from "@oasisdex/spock-etl/dist/services/types";
import { destroyTestServices, executeSQL, getSQL } from "@oasisdex/spock-test-utils";
import { expect, mockFn } from 'earljs';
import { constants } from "ethers";
import { Provider } from "ethers/providers";
import { automationBotTransformer, triggerEventsCombineTransformer } from "../../../src/borrow/transformers/automationBotTransformer";
import { createServices } from "../../utils/createServices";

const MOCKED_LOGS = require('../../fixture/automationBot-combine-log.json');

describe('Trigger events combine transformer', () => {
    let services: Services;
    let txServices: TransactionalServices;

    beforeEach(async () => {
        [services,txServices] = await createServices();

        await executeSQL(
            services.db,
            `
            INSERT INTO vulcan2x.block(id, number, hash, timestamp) VALUES(1, 1, '0x01', '2019-07-02 11:18:01+00');
            INSERT INTO vulcan2x.block(id, number, hash, timestamp) VALUES(2, 2, '0x02', '2019-07-02 11:18:02+00');
            INSERT INTO vulcan2x.block(id, number, hash, timestamp) VALUES(3, 3, '0x03', '2022-01-27 11:18:02+00');
            INSERT INTO vulcan2x.block(id, number, hash, timestamp) VALUES(4, 4, '0x04', '2022-02-22 02:20:02+00');
            INSERT INTO vulcan2x.transaction (id, hash, to_address, from_address, block_id, nonce, value, gas_limit, gas_price, data) 
              VALUES(1, '0x01', '0x01', '0x00', 1, 1, 0, 0, 0, ''),
              (2, '0x02', '0x01', '0x00', 1, 1, 0, 0, 0, ''),
              (3, '0x03', '0x01', '0x00', 2, 1, 0, 0, 0, ''),
              (4, '0x04', '0x01', '0x00', 2, 1, 0, 0, 0, '');

            INSERT INTO automation_bot.trigger_added_events (trigger_id,cdp_id,trigger_data,log_index,tx_id,block_id,command_address)
                VALUES (1,55,'0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000057000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000bb',1,1,1,'0xa655b783183e5dbdf3a36727bdb7cdcffd854497');
            INSERT INTO automation_bot.trigger_added_events (trigger_id,cdp_id,trigger_data,log_index,tx_id,block_id,command_address)
                VALUES (2,80,'0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000057000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000bb',2,2,2,'0xa655b783183e5dbdf3a36727bdb7cdcffd854497');
            
            INSERT INTO automation_bot.trigger_removed_events (id, trigger_id, cdp_id, log_index, tx_id, block_id)
                VALUES(1, 1, 55, 3, 3, 3);
            
            INSERT INTO automation_bot.trigger_executed_events (id, trigger_id, cdp_id, vault_closed_event, log_index, tx_id, block_id)
                VALUES(1, 2, 80, NULL, 4, 4, 4);
            `
        )
    });

    afterEach(() => destroyTestServices(services));

    it.only('adds 2 TriggerAdded events to history as TRIGGER_ADDED', async() => {
        const combineTransformerInstance = triggerEventsCombineTransformer(constants.AddressZero, {getUrnForCdp: getUrnForCdpMock(), managerAddress: "0x123456"})
        await combineTransformerInstance.transform(txServices, MOCKED_LOGS)

        const trigger_added_events = await getSQL(services.db, `SELECT * FROM vault.events WHERE kind = 'TRIGGER_ADDED';`);

        expect(trigger_added_events[0].id).toEqual(1)
        expect(trigger_added_events[0].block_id).toEqual(1)
        expect(trigger_added_events[0].tx_id).toEqual(1)
        expect(trigger_added_events[1].id).toEqual(2)
        expect(trigger_added_events[1].block_id).toEqual(2)
        expect(trigger_added_events[1].tx_id).toEqual(2)
        expect(trigger_added_events[0].kind).toEqual('TRIGGER_ADDED')
        expect(trigger_added_events[1].kind).toEqual('TRIGGER_ADDED')
    });

    it('adds TriggerRemoved events to history as TRIGGER_REMOVED', async () => {
        
    });

    it.only('adds TriggerExecuted events to history as TRIGGER_EXECUTED', async () => {
        const combineTransformerInstance = triggerEventsCombineTransformer(constants.AddressZero, {getUrnForCdp: getUrnForCdpMock(), managerAddress: "0x123456"})
        await combineTransformerInstance.transform(txServices, MOCKED_LOGS)

        const trigger_executed_events = await getSQL(services.db, `SELECT * FROM vault.events WHERE kind = 'TRIGGER_EXECUTED';`);
        console.log('trigger_executed_events')
        console.log(trigger_executed_events)

        expect(trigger_executed_events[0].block_id).toEqual(4)
        expect(trigger_executed_events[0].tx_id).toEqual(4)
        expect(trigger_executed_events[0].kind).toEqual('TRIGGER_EXECUTED')
    });


    it('combines TriggerAdded, TriggerExecuted, TriggerRemoved events', async () => {

    });
})

function getUrnForCdpMock() {
    const getUrnForCdpMock = mockFn<(provider: Provider,
        id: string,
        managerAddress: string) => Promise<string>>();
    getUrnForCdpMock.resolvesTo('0x007');
    return getUrnForCdpMock;
}
