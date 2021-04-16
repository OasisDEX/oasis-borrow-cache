import { flatten } from 'lodash';

import {
    handleEvents,
    FullEventInfo,
} from '@oasisdex/spock-utils/dist/transformers/common';
import { PersistedLog } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { getExtractorName as getExtractorNameBasedOnTopic } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { Dictionary } from 'ts-essentials';
import BigNumber from 'bignumber.js';
import { rad } from '../../utils/precision';

const clipperAbi = require('../../../abis/clipper.json');

const handleKick = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
    const values = {
        auction_id: params.id.toString(),
        coin: params.coin.toString(),
        kpr: params.kpr,
        lot: params.lot.toString(),
        tab: params.tab.toString(),
        top: params.top.toString(),
        usr: params.usr,
        clipper: log.address.toLowerCase(),

        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
    };

    await services.tx.none(
        `INSERT INTO clipper.kick(
            auction_id, coin, kpr, lot, tab, top, usr, clipper,
            log_index, tx_id, block_id
        ) VALUES (
          \${auction_id}, \${coin}, \${kpr}, \${lot}, \${tab}, \${top}, \${usr}, \${clipper},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
        values,
    );
};

const handleTake = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
    const values = {
        auction_id: params.id.toString(),
        lot: params.lot.toString(),
        max: params.max.toString(),
        owe: params.owe.toString(),
        price: params.price.toString(),
        tab: params.tab.toString(),
        usr: params.usr,

        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
    };

    await services.tx.none(
        `INSERT INTO clipper.take(
            auction_id, lot, max, owe, price, tab, usr,
            log_index, tx_id, block_id
        ) VALUES (
          \${auction_id}, \${lot}, \${max}, \${owe}, \${price}, \${tab}, \${usr},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
        values,
    );
};

const handleAuctionFinished = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
    if (params.lot.toString() === '0' || params.tab.toString() === '0') {
        const bark = await services.tx.oneOrNone(`
            SELECT * FROM dog.bark WHERE auction_id = '${params.id.toString()}';
        `)
        const timestamp = await services.tx.oneOrNone(
            `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
            {
                block_id: log.block_id,
            },
        );
        const event = {
            kind: "TAKE",
            auction_id: params.id.toString(),
            collateral_amount: new BigNumber(params.lot).div(rad).toString(),
            dai_amount: new BigNumber(params.tab).div(rad).toString(),
            urn: bark.urn,
            timestamp: timestamp.timestamp,

            log_index: log.log_index,
            tx_id: log.tx_id,
            block_id: log.block_id,
        };

        await services.tx.none(
            `INSERT INTO vault.events(
                kind, auction_id, collateral_amount, dai_amount, urn, timestamp,
                log_index, tx_id, block_id
            ) VALUES (
                \${kind}, \${auction_id}, \${collateral_amount}, \${dai_amount}, \${urn}, \${timestamp},
                \${log_index}, \${tx_id}, \${block_id}
            );`,
            event,
        );
    }
};

const handleRedo = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
    const values = {
        auction_id: params.id.toString(),
        coin: params.lot.toString(),
        kpr: params.kpr,
        lot: params.lot.toString(),
        tab: params.tab.toString(),
        top: params.top.toString(),
        usr: params.usr,

        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
    };

    await services.tx.none(
        `INSERT INTO clipper.redo(
            auction_id, coin, kpr, lot, tab, top, usr,
            log_index, tx_id, block_id
        ) VALUES (
          \${auction_id}, \${coin}, \${kpr}, \${lot}, \${tab}, \${top}, \${usr},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
        values,
    );
};

const handleYank = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
    const values = {
        auction_id: params.id.toString(),

        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
    };

    await services.tx.none(
        `INSERT INTO clipper.yank(
            auction_id,
            log_index, tx_id, block_id
        ) VALUES (
          \${auction_id},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
        values,
    );
};



const handlers = {
    async Kick(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
        await handleKick(event.params, log, services);
    },
    async Take(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
        await handleTake(event.params, log, services)
        await handleAuctionFinished(event.params, log, services)
    },
    async Redo(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
        await handleRedo(event.params, log, services)
    },
    async Yank(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
        await handleYank(event.params, log, services)
    },
};

export const clipperTransformerName = 'clipperTransformer'

async function filterClipperLogs(services: LocalServices, logs: PersistedLog[]) {
    if (logs.length === 0) {
        return logs
    }

    const clippers = await services.tx.manyOrNone(
        `SELECT DISTINCT clip FROM dog.bark`
    )
    const clippersAddresses = clippers.map((result: { clip: string }) => result.clip)

    if (clippersAddresses.length === 0) {
        return []
    }
    return logs.filter(log => clippersAddresses.includes(log.address))
}

export const clipperTransformer: (transformerDependencies: string[]) => BlockTransformer = (transformerDependencies) => {
    return {
        name: clipperTransformerName,
        dependencies: [getExtractorNameBasedOnTopic('clipper')],
        transformerDependencies,
        transform: async (services, logs) => {
            const allowedLogs = await filterClipperLogs(services, flatten(logs))
            await handleEvents(services, clipperAbi, allowedLogs, handlers);
        },
    };
};