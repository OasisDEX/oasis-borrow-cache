import { pick, omit } from 'lodash';
import { runIntegrationTest, withScopedEnv, dumpDB, getSQL } from '@oasisdex/spock-test-utils';
import { withConnection, DB } from '@oasisdex/spock-etl/dist/db/db';
import { join } from 'path';
import { JsonRpcProvider } from 'ethers/providers';

describe('all', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.setTimeout(1000 * 60 * 1.5);
  });

  it('works with old blockchain data', async () => {
    process.env.VL_CHAIN_NAME = 'mainnet';
    process.env.VL_CHAIN_HOST =
      'https://eth-mainnet.alchemyapi.io/jsonrpc/UHaa9ZvfSFjO18VREBbH7uTOIYQy02qL';
    process.env.VL_LOGGING_LEVEL = '2';
    const config = require('../config').default;

    const startingBlock = 8219360;
    await withScopedEnv(join(__dirname, '../../../../'), async () => {
      const services = await runIntegrationTest({
        ...config,
        startingBlock,
        lastBlock: startingBlock + 40,
      });

      // raw data dump
      const dump = await dumpDB(services.db);
      expect(pick(dump, ['blocks', 'extracted_logs'])).toMatchSnapshot();

      expect(await dumpOasisMarketSchema(services.db)).toMatchSnapshot();
      // expect(await dumpMidpointSchema(dbHandler)).toMatchSnapshot();
      expect(await dumpMultiplySchema(services.db)).toMatchSnapshot();

      // test some views
      expect(await getSQL(services.db, 'SELECT * FROM api.oasis_trade_gui')).toMatchSnapshot();
    });
  });

  it.skip('works with localnet blockchain data', async () => {
    process.env.VL_CHAIN_NAME = 'localnet';
    process.env.VL_CHAIN_HOST = 'http://localhost:8545';
    const config = require('../config').default;

    const startingBlock = 0;
    const lastBlock = await getLatestLocalNodeBlock();
    await withScopedEnv(join(__dirname, '../../../../'), async () => {
      const services = await runIntegrationTest({
        ...config,
        startingBlock,
        lastBlock,
      });

      expect(await dumpOasisMarketSchema(services.db)).toMatchSnapshot();
      // expect(await dumpMidpointSchema(dbHandler)).toMatchSnapshot();
    });
  });
});

export async function dumpOasisMarketSchema(db: DB): Promise<any> {
  return await withConnection(db, async c => {
    return {
      logKill: (
        await c.manyOrNone(`SELECT * FROM oasis_market.log_kill ORDER BY block_id, log_index`)
      ).map((o: any) => omit(o, ['id', 'tx_id', 'timestamp'])),
      logMake: (
        await c.manyOrNone(`SELECT * FROM oasis_market.log_make ORDER BY block_id, log_index`)
      ).map((o: any) => omit(o, ['id', 'tx_id', 'timestamp'])),
      logTake: (
        await c.manyOrNone(`SELECT * FROM oasis_market.log_take ORDER BY block_id, log_index`)
      ).map((o: any) => omit(o, ['id', 'tx_id', 'timestamp'])),
      logTrade: (
        await c.manyOrNone(`SELECT * FROM oasis_market.log_trade ORDER BY block_id, log_index`)
      ).map((o: any) => omit(o, ['id', 'tx_id', 'timestamp'])),
    };
  });
}

export async function dumpMidpointSchema(db: DB): Promise<any> {
  return await withConnection(db, async c => {
    return {
      storage: (
        await c.manyOrNone(`SELECT * FROM extracted.storage ORDER BY block_id, key`)
      ).map((o: any) => omit(o, ['id'])),
      midpoint: (
        await c.manyOrNone(`SELECT * FROM oasis_market.midpoint_price ORDER BY block_id`)
      ).map((o: any) => omit(o, ['id', 'timestamp'])),
    };
  });
}

export async function dumpMultiplySchema(db: DB): Promise<any> {
  return await withConnection(db, async c => {
    return {
      event: (
        await c.manyOrNone(`SELECT * FROM multiply.event ORDER BY owner, type, tab`)
      ).map((o: any) => omit(o, ['id', 'tx_id', 'timestamp', 'block_id'])),
      proxy: (
        await c.manyOrNone(`SELECT * FROM multiply.proxy ORDER BY block_id, log_index`)
      ).map((o: any) => omit(o, ['id', 'tx_id', 'block_id'])),
      cdp: (
        await c.manyOrNone(`SELECT * FROM multiply.cdp ORDER BY owner, creator, urn`)
      ).map((o: any) => omit(o, ['id', 'tx_id', 'timestamp', 'block_id'])),
    };
  });
}

export async function getLatestLocalNodeBlock(): Promise<number> {
  const provider = new JsonRpcProvider('http://localhost:8545');
  return await provider.getBlockNumber();
}
