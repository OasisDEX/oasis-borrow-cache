/**
 * Script to automatically compare data stored in vulcan2x vs google big query public dataset.
 */
import { BigQuery } from '@google-cloud/bigquery';
import { mergeConfig } from '@oasisdex/spock-etl/dist/services/configUtils';
import { createServices } from '@oasisdex/spock-etl/dist/services/services';
import { withConnection } from '@oasisdex/spock-etl/dist/db/db';

import { getLastBlockBQ, countBQ, countV2 } from './common';
import oasisConfig from '../config';

async function main(): Promise<void> {
  console.log(`Running...`);
  const config = mergeConfig(oasisConfig);
  const spockServices = await createServices(config);
  const bigQueryClient = new BigQuery();

  // big query has 1 day delay, so we query for last block that they are aware of
  const lastBlock = await getLastBlockBQ(bigQueryClient);
  const firstBlock = config.startingBlock;
  const contracts = config.extractors.map(e => (e as any).address);
  const bigQueryCount = await countBQ(bigQueryClient, contracts, lastBlock, firstBlock);
  const vulcan2xCount = await withConnection(spockServices.db, c => {
    return countV2(c, contracts, lastBlock, firstBlock);
  });

  console.log(`Last recorded block: ${lastBlock}`);
  console.log(`BQ events: ${bigQueryCount}`);
  console.log(`Vulcan2x events: ${vulcan2xCount}`);

  if (vulcan2xCount === 0) {
    throw new Error('No events found! Probably something is wrong!');
  }

  const diff = bigQueryCount - vulcan2xCount;
  // we tolerate 1 event difference because we started syncing a little bit later and we missed one
  console.log(`Difference is ${diff}`);
  if (diff > 0) {
    console.error(`Lost events detected! Failing!`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
