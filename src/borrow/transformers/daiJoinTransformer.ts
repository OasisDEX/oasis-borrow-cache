import { flatten } from 'lodash';

import { handleDsNoteEvents, FullNoteEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
    getExtractorName,
    SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { normalizeAddressDefinition } from 'cache/src/utils';

const daiJoinAbi = require('../../../abis/daiJoin.json');

const noteHandlers = {
    async 'join(address,uint256)'(
        services: LocalServices,
        { note, log }: FullNoteEventInfo,
    ) {
        const timestamp = await services.tx.oneOrNone(
            `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
            {
                block_id: log.block_id,
            },
        );

        const values = {
            wad: note.params.wad.toString(),
            usr: note.params.usr,
            timestamp: timestamp.timestamp,
            log_index: log.log_index,
            tx_id: log.tx_id,
            block_id: log.block_id,
        }

        await services.tx.none(
            `INSERT INTO dai_join.join(
                wad, usr, timestamp, log_index, tx_id, block_id
             ) VALUES (
               \${wad}, \${usr}, \${timestamp}, \${log_index},
               \${tx_id}, \${block_id}
             );`,
            values,
        );
    },
    async 'exit(address,uint256)'(
        services: LocalServices,
        { note, log }: FullNoteEventInfo,
    ) {
        const timestamp = await services.tx.oneOrNone(
            `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
            {
                block_id: log.block_id,
            },
        );

        const values = {
            wad: note.params.wad.toString(),
            usr: note.params.usr,
            timestamp: timestamp.timestamp,
            log_index: log.log_index,
            tx_id: log.tx_id,
            block_id: log.block_id,
        }

        await services.tx.none(
            `INSERT INTO dai_join.exit(
                wad, usr, timestamp, log_index, tx_id, block_id
             ) VALUES (
               \${wad}, \${usr}, \${timestamp}, \${log_index},
               \${tx_id}, \${block_id}
             );`,
            values,
        );
    }
}

export function getDaiJoinTransformerName(address: string) {
    return `daiJoinTransformerNote-${address}`
}

export const daiJoinTransformer: (
    addresses: (string | SimpleProcessorDefinition),
) => BlockTransformer = (addresses) => {
    const deps = normalizeAddressDefinition(addresses);

    return {
        name: getDaiJoinTransformerName(deps.address),
        dependencies: [getExtractorName(deps.address)],
        startingBlock: deps.startingBlock,
        transform: async (services, logs) => {
            await handleDsNoteEvents(services, daiJoinAbi, flatten(logs), noteHandlers, 2);
        },
    };
}