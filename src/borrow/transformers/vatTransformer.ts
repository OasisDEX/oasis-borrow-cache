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
import { BigNumber } from 'bignumber.js';

const vatAbi = require('../../../abis/vat.json');
const cdpManagerAbi = require('../../../abis/dss-cdp-manager.json');


/*
- `dink`: change in collateral.
- `dart`: change in debt.
*/

const vatNoteHandlers = {
    async 'fold(bytes32,address,int256)'(
        services: LocalServices,
        { note, log }: FullNoteEventInfo,
    ) {
        const values = {
            u: note.params.u,
            i: parseBytes32String(note.params.i),
            rate: note.params.rate.toString(),

            log_index: log.log_index,
            tx_id: log.tx_id,
            block_id: log.block_id,
        }
        services.tx.none(`
            INSERT INTO vat.fold(
                i, rate, u, log_index, tx_id, block_id
            ) VALUES (
                \${i}, \${rate}, \${u}, \${log_index},
                \${tx_id}, \${block_id}
            );`,
            values)
    },
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
    }
}

export const getVatTransformerName = (address: string) => {
    return `vatTransformer-${address}`
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
            await handleDsNoteEvents(services, vatAbi, flatten(logs), vatNoteHandlers, 2);
        },
    };
}


export const vatCombineTransformer: (
    addresses: (string | SimpleProcessorDefinition),
) => BlockTransformer = (addresses) => {
    const deps = normalizeAddressDefinition(addresses);

    return {
        name: `vatCombineTransformer-${deps.address}`,
        dependencies: [getExtractorName(deps.address)],
        transformerDependencies: [`vatTransformer-${deps.address}`],
        startingBlock: deps.startingBlock,
        transform: async (services, logs) => {
            const blocks = Array.from(new Set(flatten(logs).map(log => log.block_id)))

            const frobs = await services.tx.multi(`
            select 
                frob.*, (
                    select sum(rate) 
                    from vat.fold 
                    where 
                        i = frob.ilk and (
                            block_id < frob.block_id or 
                            block_id = frob.block_id  and log_index <= frob.log_index
                        )
                ) rate 
            from vat.frob frob
            where frob.block_id in (\$1:csv)
            `, [blocks])

            const events = flatten(frobs).map((frob) => {
                const dink = new BigNumber(frob.dink)
                const dart = new BigNumber(frob.dart)

                if (frob.rate === null) {
                    console.log("RATE SHOULD NOT BE NULL")
                    return undefined
                }
                const e = {
                    kind: [
                        !dink.isZero() && `${dink.gt(0) ? 'WITHDRAW' : 'DEPOSIT'}`,
                        !dart.isZero() && `${dart.gt(0) ? 'GENERATE' : 'PAYBACK'}`
                    ].filter(x => !!x).join('-'),
                    collateral_amount: dink,
                    dai_amount: dart.times(new BigNumber(frob.rate)),
                    urn: frob.u,
                    timestamp: frob.timestamp,
                    tx_id: frob.tx_id,
                    block_id: frob.block_id,
                    log_index: frob.log_index,
                    //dodac v, w
                }


                return e
            })

            //


            const cs = new services.pg.helpers.ColumnSet([])


            debugger

            services.tx.none(`
                INSERT INTO vault.events(
                    this:name
                )
            `)



            await handleDsNoteEvents(services, vatAbi, flatten(logs), vatNoteHandlers, 2);
        },
    };
}

