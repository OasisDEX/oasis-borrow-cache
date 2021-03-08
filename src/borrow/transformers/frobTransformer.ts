import { flatten } from 'lodash';
import { parseBytes32String } from 'ethers/utils';

import { handleDsNoteEvents, FullNoteEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
    getExtractorName,
    SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { normalizeAddressDefinition } from 'cache/src/utils';

const vatAbi = require('../../../abis/vat.json');
const cdpManagerAbi = require('../../../abis/dss-cdp-manager.json');


/*
- `dink`: change in collateral.
- `dart`: change in debt.
*/

const noteHandlers = {
    async 'frob(bytes32,address,address,address,int256,int256)'(
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
            dink: note.params.dink.toString(),
            dart: note.params.dart.toString(),
            ilk: parseBytes32String(note.params.i),
            u: note.params.u,
            v: note.params.v,
            w: note.params.w,
            timestamp: timestamp.timestamp,
            log_index: log.log_index,
            tx_id: log.tx_id,
            block_id: log.block_id,
        }
        services.tx.none(`
            INSERT INTO vat.frob(
                dart, dink, ilk, u, v, w, timestamp, log_index, tx_id, block_id
            ) VALUES (
                \${dart}, \${dink}, \${ilk}, \${u}, \${v}, \${w}, \${timestamp}, \${log_index},
                \${tx_id}, \${block_id}
            );`,
            values)
    },
    async 'frob(uint256,int256,int256)'(
        services: LocalServices,
        { note, log }: FullNoteEventInfo,
    ) {
        const values = {
            cdp_id: note.params.cdp.toString(),
            log_index: log.log_index - 1, // NOT SURE IF IT IS CORRECT
            tx_id: log.tx_id,
            block_id: log.block_id,
        }
        debugger
        services.tx.none(`
            UPDATE vat.frob SET cdp_id=\${cdp_id} WHERE log_index = \${log_index} AND block_id = \${block_id};
        `, values)
    }
}

export const managerFrobTransformer: (
    addresses: (string | SimpleProcessorDefinition)[],
    transformerDependencies: string[]
) => BlockTransformer[] = (addresses, transformerDependencies) => {
    return addresses.map(_deps => {
        const deps = normalizeAddressDefinition(_deps);

        return {
            name: `managerFrobTransformerNote-${deps.address}`,
            dependencies: [getExtractorName(deps.address)],
            startingBlock: deps.startingBlock,
            transformerDependencies: [...transformerDependencies],
            transform: async (services, logs) => {
                await handleDsNoteEvents(services, cdpManagerAbi, flatten(logs), noteHandlers, 2);
            },
        };
    });
}


export const makeManagerFrobDependencies = (addresses: (string | SimpleProcessorDefinition)[]) => {
    return addresses
        .map(normalizeAddressDefinition)
        .map(deps => `vatTransformer-${deps.address}`)
}

export const vatFrobTransformer: (
    addresses: (string | SimpleProcessorDefinition),
) => BlockTransformer = (addresses) => {
    const deps = normalizeAddressDefinition(addresses);

    return {
        name: `vatTransformer-${deps.address}`,
        dependencies: [getExtractorName(deps.address)],
        startingBlock: deps.startingBlock,
        transform: async (services, logs) => {
            await handleDsNoteEvents(services, vatAbi, flatten(logs), noteHandlers, 2);
        },
    };
}