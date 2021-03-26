import { pick, omit } from 'lodash';
import { prepareDB, getTestConfig, runIntegrationTest, withScopedEnv, dumpDB, getSQL, createTestServices } from '@oasisdex/spock-test-utils';
import { withConnection, DB } from '@oasisdex/spock-etl/dist/db/db';
import { join } from 'path';
import { JsonRpcProvider, Provider } from 'ethers/providers';
import { expect } from 'chai'

describe('all', () => {
  it('NewCdp event', async (done) => {
    process.env.VL_CHAIN_NAME = 'mainnet';
    process.env.VL_CHAIN_HOST =
      'https://eth-mainnet.alchemyapi.io/jsonrpc/UHaa9ZvfSFjO18VREBbH7uTOIYQy02qL';
    process.env.VL_LOGGING_LEVEL = '2';

    const config = require('../config').default
    return await withScopedEnv(join(__dirname, '../../'), async () => {
      console.log('test')
      const firstVaultBlock = 8928198
      const services = await runIntegrationTest({
        ...config,
        startingBlock: firstVaultBlock,
        lastBlock: firstVaultBlock + 1,
      })

      const vault = await services.db.oneOrNone('SELECT * FROM manager.cdp WHERE id = "1"')
      console.log({ vault })
      expect('a').eq('a')
    })
  })
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
