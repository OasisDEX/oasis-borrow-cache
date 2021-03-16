import { flatten } from 'lodash';
import { Dictionary } from 'ts-essentials'

import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
    getExtractorName,
    PersistedLog,
    SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { getExtractorName as getExtractorNameBasedOnTopic } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { normalizeAddressDefinition } from '../../utils';
import { parseBytes32String } from 'ethers/utils';


const catAbi = require('../../../abis/cat.json');
const flipAbi = require('../../../abis/flipper.json');

const handleBite = async (
    params: Dictionary<any>,
    log: PersistedLog,
    services: LocalServices,
) => {
    const values = {
        auction_id: params.id.toString(),
        ilk: parseBytes32String(params.ilk),
        urn: params.urn,
        ink: params.ink.toString(),
        art: params.art.toString(),
        tab: params.tab.toString(),
        flip: params.flip,

        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
    }

    services.tx.none(
        `INSERT INTO auctions.bite(
          ilk, urn, ink, art, tab, flip, auction_id,
          log_index, tx_id, block_id
        ) VALUES (
          \${ilk}, \${urn}, \${ink}, \${art}, \${tab}, \${flip}, \${auction_id},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
        values
    )
}

const handleKick = async (
    params: Dictionary<any>,
    log: PersistedLog,
    services: LocalServices,
) => {

    debugger
    const values = {
        auction_id: params.id.toString(),
        lot: params.lot.toString(),
        bid: params.bid.toString(),
        tab: params.tab.toString(),
        usr: params.usr,
        gal: params.gal,

        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
    }

    services.tx.none(
        `INSERT INTO auctions.kick(
          lot, bid, tab, usr, gal, auction_id,
          log_index, tx_id, block_id
        ) VALUES (
          \${lot}, \${bid}, \${tab}, \${usr}, \${gal}, \${auction_id},
          \${log_index}, \${tx_id}, \${block_id}
        );`,
        values
    )

    debugger
}

const handlers = {
    async Bite(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
        await handleBite(event.params, log, services);
    },
    async Kick(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
        await handleKick(event.params, log, services);
    },
}

export const catTransformer: (
    addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
    return addresses.map(_deps => {
        const deps = normalizeAddressDefinition(_deps);

        return {
            name: `catTransformer-${deps.address}`,
            dependencies: [getExtractorName(deps.address)],
            startingBlock: deps.startingBlock,
            transform: async (services, logs) => {
                await handleEvents(services, catAbi, flatten(logs), handlers);
            },
        };
    });
};

export const flipTransformer: (
    dependencies: (string | SimpleProcessorDefinition)[],
) => BlockTransformer = dependencies => {

    const transformerDependencies = dependencies
        .map(normalizeAddressDefinition)
        .map(dep => `catTransformer-${dep.address}`)

    return {
        name: `flipTransformer`,
        dependencies: [getExtractorNameBasedOnTopic('flipper-actions')],
        transformerDependencies: transformerDependencies,
        transform: async (services, logs) => {
            if (flatten(logs).length > 0) {
                debugger
            }
            await handleEvents(services, flipAbi, flatten(logs), handlers);
        },
    };
};
