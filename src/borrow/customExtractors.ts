import { BlockModel } from '@oasisdex/spock-etl/dist/db/models/Block';
import { BlockExtractor } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices, TransactionalServices } from '@oasisdex/spock-etl/dist/services/types';
import {
  extractRawLogsOnTopic,
  getLogsBasedOnTopics,
  getPersistedLogsByTopic,
} from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import { timer } from '@oasisdex/spock-etl/dist/utils/timer';
import { getOrCreateTx } from '@oasisdex/spock-utils/dist/extractors/common';
import { ethers } from 'ethers';
import { groupBy, uniqBy } from 'lodash';
import { Log } from 'ethers/providers';

export interface AbiInfo {
  name: string;
  functionNames: string[];
  abi: Object;
  startingBlock?: number;
}

export function getExtractorNameBasedOnDSNoteTopic(name: string): string {
  return `raw_log_ds_note_topic_${name}_extractor`;
}

export function makeRawEventBasedOnDSNoteTopic(abis: AbiInfo[]): BlockExtractor[] {
  return abis.map(abi => {
    const iface = new ethers.utils.Interface(abi.abi as any);
    const eventsTopicOnFunctionSignature = abi.functionNames.map(name => {
      const functionDescription = iface.functions[name];
      if (!functionDescription) {
        throw new Error(`Function ${name} does not exists`);
      }
      return functionDescription.sighash.padEnd(66, '0');
    });

    return {
      name: getExtractorNameBasedOnDSNoteTopic(abi.name),
      startingBlock: abi.startingBlock,
      address: abi,
      extract: async (services, blocks) => {
        await extractRawLogsOnTopic(services, blocks, eventsTopicOnFunctionSignature);
      },
      async getData(services: LocalServices, blocks: BlockModel[]): Promise<any> {
        return await getPersistedLogsByTopic(services, eventsTopicOnFunctionSignature, blocks);
      },
    };
  });
}

export function getCustomExtractorNameBasedOnTopicIgnoreConflicts(name: string): string {
  return `raw_log_topic_ignore_conflicts_${name}_extractor`;
}

export function makeRawEventExtractorBasedOnTopicIgnoreConflicts(
  abis: any[],
  ignoredAddresses: string[] = [],
): BlockExtractor[] {
  return abis.map(abi => {
    const iface = new ethers.utils.Interface(abi.abi as any);
    const allTopics = Object.values(iface.events).map(e => e.topic);

    return {
      name: getCustomExtractorNameBasedOnTopicIgnoreConflicts(abi.name),
      startingBlock: abi.startingBlock,
      address: abi,
      extract: async (services, blocks) => {
        await extractRawLogsOnTopicIgnoreConflicts(services, blocks, allTopics, ignoredAddresses);
      },
      async getData(services: LocalServices, blocks: BlockModel[]): Promise<any> {
        return await getPersistedLogsByTopic(services, allTopics, blocks);
      },
    };
  });
}

async function extractRawLogsOnTopicIgnoreConflicts(
  services: TransactionalServices,
  blocks: BlockModel[],
  topics: string[],
  ignoredAddresses: string[],
): Promise<any[]> {
  const logs = await getLogsBasedOnTopics(services, blocks, topics);
  const filteredLogs = logs
    .filter(
      (log): log is Required<Log> =>
        log.transactionHash !== undefined && log.blockHash !== undefined,
    )
    .filter(log => !ignoredAddresses.includes(log.address.toLowerCase()));
  const blocksByHash = groupBy(blocks, 'hash');
  const allTxs = uniqBy(
    filteredLogs.map(l => ({ txHash: l.transactionHash, blockHash: l.blockHash })),
    'txHash',
  );
  const allStoredTxs = await Promise.all(
    allTxs.map(tx => getOrCreateTx(services, tx.txHash, blocksByHash[tx.blockHash][0])),
  );
  const allStoredTxsByTxHash = groupBy(allStoredTxs, 'hash');
  const logsToInsert = (
    await Promise.all(
      filteredLogs.map(async log => {
        const _block = blocksByHash[log.blockHash];
        if (!_block) {
          return;
        }
        const block = _block[0];
        const storedTx = allStoredTxsByTxHash[log.transactionHash][0];
        return {
          ...log,
          address: log.address.toLowerCase(),
          log_index: log.logIndex,
          block_id: block.id,
          tx_id: storedTx.id,
        };
      }),
    )
  ).filter(log => !!log);
  let insertedLogs = [];
  if (logsToInsert.length !== 0) {
    const addingLogs = timer(`adding-logs`, `with: ${logsToInsert.length} logs`);
    const query =
      services.pg.helpers.insert(logsToInsert, services.columnSets['extracted_logs']) +
      ' ON CONFLICT ON CONSTRAINT logs_log_index_tx_id_key DO NOTHING RETURNING *';
    insertedLogs = await services.tx.manyOrNone(query);
    addingLogs();
  }
  return insertedLogs;
}
