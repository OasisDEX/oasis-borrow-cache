import { flatten } from 'lodash';
import { parseBytes32String } from 'ethers/utils';
import { Dictionary } from 'ts-essentials'

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


    `INSERT INTO borrow.cdp(
       creator, owner, address, cdp_id, log_index, tx_id, block_id, timestamp
     ) VALUES (
       \${creator}, \${owner}, \${address}, \${cdp_id}, \${log_index},
       \${tx_id}, \${block_id}, \${timestamp}
     );`,
     '{
         0x45e6bdcd00000000000000000000000000000000000000000000000000000000,
         0x0000000000000000000000000fde3177afb2103418877ef0a86c3ca57d556dc6,
         0x00000000000000000000000000000000000000000000000000000000000046ae,
         0x0000000000000000000000000000000000000000000000000000000000000000}'
*/

const noteHandlers = {
    async 'frob(bytes32,address,address,address,int256,int256)'(
        services: LocalServices,
        { note, log }: FullNoteEventInfo,
    ) {

        const values = {
            dink: note.params.dink.toString(),
            dart: note.params.dart.toString(),
            ilk: parseBytes32String(note.params.i),
            u: note.params.u,
            v: note.params.v,
            w: note.params.w,
            log_index: log.log_index,
            tx_id: log.tx_id,
            block_id: log.block_id,
        }
        services.tx.none(`
            INSERT INTO frob.vat(
                dart, dink, ilk, u, v, w, log_index, tx_id, block_id
            ) VALUES (
                \${dart}, \${dink}, \${ilk}, \${u}, \${v}, \${w}, \${log_index},
                \${tx_id}, \${block_id}
            );
        `, values)
        console.log({ ilk: parseBytes32String(note.params.i), dart: note.params.dart.toString(), dink: note.params.dink.toString() })
    },
    async 'frob(uint256,int256,int256)'(
        services: LocalServices,
        { note, log }: FullNoteEventInfo,
    ) {
        console.log({
            note,
            log,
            cdp_id: note.params.cdp.toString(),
            dink: note.params.dink.toString(),
            dart: note.params.dart.toString(),
            type: note.params.dink.gt(0) ? 'DEPOSIT' : 'WITHDRAW'
        })
        const values = {
            dink: note.params.dink.toString(),
            dart: note.params.dart.toString(),
            cdp_id: note.params.cdp.toString(),
            log_index: log.log_index,
            tx_id: log.tx_id,
            block_id: log.block_id,
        }
        services.tx.none(`
            INSERT INTO frob.vat(
                dart, dink, cdp_id, log_index, tx_id, block_id
            ) VALUES (
                \${dart}, \${dink}, \${cdp_id}, \${log_index},
                \${tx_id}, \${block_id}
            );
        `, values)
    }
}

export const managerFrobTransformer: (
    addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
    return addresses.map(_deps => {
        const deps = normalizeAddressDefinition(_deps);

        return {
            name: `managerFrobTransformerNote-${deps.address}`,
            dependencies: [getExtractorName(deps.address)],
            startingBlock: deps.startingBlock,
            transform: async (services, logs) => {
                await handleDsNoteEvents(services, cdpManagerAbi, flatten(logs), noteHandlers, 2);
            },
        };
    });
}

export const vatFrobTransformer: (
    addresses: (string | SimpleProcessorDefinition),
) => BlockTransformer = addresses => {
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