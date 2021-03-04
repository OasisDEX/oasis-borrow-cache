/**
 * Script to automatically compare data stored in vulcan2x vs google big query public dataset.
 */
import { BigQuery } from '@google-cloud/bigquery';
import { mergeConfig } from '@oasisdex/spock-etl/dist/services/configUtils';
import { createServices } from '@oasisdex/spock-etl/dist/services/services';

import { getLastBlockBQ, countBQ, countV2 } from './common';
import oasisConfig from '../config';
import { withConnection } from '@oasisdex/spock-etl/dist/db/db';
import { Services } from '@oasisdex/spock-etl/dist/services/types';

async function main(): Promise<void> {
  console.log(`Running...`);

  const bigQueryClient = new BigQuery();
  const contracts = oasisConfig.extractors.map(e => (e as any).address);
  const config = mergeConfig(oasisConfig);
  const spockServices = await createServices(config);

  const maxBlock = await getLastBlockBQ(bigQueryClient);
  const minBlock = 4751582;

  await findNotSyncedBlocks(spockServices, bigQueryClient, contracts, minBlock, maxBlock);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

async function findNotSyncedBlocks(
  spockServices: Services,
  bigQueryClient: BigQuery,
  contracts: string[],
  minBlock: number,
  maxBlock: number,
): Promise<number> {
  const diff = await getDiff(spockServices, bigQueryClient, contracts, minBlock, maxBlock);

  if (diff === 0) {
    return diff;
  }

  if (minBlock === maxBlock) {
    return diff;
  }

  const midPoint = Math.floor(minBlock + (maxBlock - minBlock) / 2);
  if (midPoint === minBlock || midPoint === maxBlock) {
    await findNotSyncedBlocks(spockServices, bigQueryClient, contracts, minBlock, minBlock);
    await findNotSyncedBlocks(spockServices, bigQueryClient, contracts, maxBlock, maxBlock);
  } else {
    await findNotSyncedBlocks(spockServices, bigQueryClient, contracts, midPoint, maxBlock);
    await findNotSyncedBlocks(spockServices, bigQueryClient, contracts, minBlock, midPoint);
  }

  return diff;
}

async function getDiff(
  spockServices: Services,
  bigQueryClient: BigQuery,
  contracts: string[],
  minBlock: number,
  maxBlock: number,
): Promise<number> {
  const bigQueryCount = await countBQ(bigQueryClient, contracts, maxBlock, minBlock);
  const vulcan2xCount = await withConnection(spockServices.db, c => {
    return countV2(c, contracts, maxBlock, minBlock);
  });

  console.log(`Checking ${minBlock} - ${maxBlock} (range: ${maxBlock - minBlock})`);
  console.log(`BQ events: ${bigQueryCount}`);
  console.log(`Vulcan2x events: ${vulcan2xCount}`);

  const diff = bigQueryCount - vulcan2xCount;
  console.log(`Diff: ${diff}`);
  if (diff > 0 && minBlock === maxBlock) {
    console.log(`FOUND NOT SYNCED BLOCK! Diff: ${diff}`);
  }
  console.log('-----------------------');

  return diff;
}
