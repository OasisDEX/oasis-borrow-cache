import { flatten } from 'lodash';
import { formatBytes32String, parseBytes32String } from 'ethers/utils';
import { ethers } from 'ethers';
import {
  handleDsNoteEvents,
  FullNoteEventInfo,
} from '@oasisdex/spock-utils/dist/transformers/common';
import {
  getExtractorName,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { getAddressesFromConfig, normalizeAddressDefinition } from '../../utils';
import { BigNumber } from 'bignumber.js';

const vatAbi = require('../../../abis/vat.json');

/*
- `dink`: change in collateral.
- `dart`: change in debt.
*/

const wad = new BigNumber(10).pow(18);
const ray = new BigNumber(10).pow(27);
const rad = new BigNumber(10).pow(45);

const vatNoteHandlers = {
  async 'fold(bytes32,address,int256)'(services: LocalServices, { note, log }: FullNoteEventInfo) {
    debugger;
    const timestamp = await services.tx.oneOrNone(
      `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
      {
        block_id: log.block_id,
      },
    );

    const values = {
      u: note.params.u.toLowerCase(),
      i: parseBytes32String(note.params.i),
      rate: note.params.rate.toString(),

      timestamp: timestamp.timestamp,
      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await services.tx.none(
      `
                INSERT INTO vat.fold(
                    i, rate, u, log_index, tx_id, block_id, timestamp
                ) VALUES (
                    \${i}, \${rate}, \${u}, \${log_index},
                    \${tx_id}, \${block_id}, \${timestamp}
                );`,
      values,
    );
  },
  async 'frob(bytes32,address,address,address,int256,int256)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ) {
    debugger;
    try {
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
        u: note.params.u.toLowerCase(),
        v: note.params.v.toLowerCase(),
        w: note.params.w.toLowerCase(),
        timestamp: timestamp.timestamp,
        log_index: log.log_index,
        tx_id: log.tx_id,
        block_id: log.block_id,
      };
      services.tx.none(
        `
            INSERT INTO vat.frob(
                dart, dink, ilk, u, v, w, timestamp, log_index, tx_id, block_id
            ) VALUES (
                \${dart}, \${dink}, \${ilk}, \${u}, \${v}, \${w}, \${timestamp}, \${log_index},
                \${tx_id}, \${block_id}
            );`,
        values,
      );
    } catch (e) {
      debugger;
    }
  },
};

export const vatTransformer: (
  addresses: string | SimpleProcessorDefinition,
) => BlockTransformer = addresses => {
  const deps = normalizeAddressDefinition(addresses);

  return {
    name: `vatTransformer-${deps.address}`,
    dependencies: [getExtractorName(deps.address)],
    startingBlock: deps.startingBlock,
    transform: async (services, logs) => {
      await handleDsNoteEvents(services, vatAbi, flatten(logs), vatNoteHandlers, 2);
    },
  };
};

export const vatCombineTransformer: (
  addresses: string | SimpleProcessorDefinition,
) => BlockTransformer = addresses => {
  const deps = normalizeAddressDefinition(addresses);

  return {
    name: `vatCombineTransformer-${deps.address}`,
    dependencies: [getExtractorName(deps.address)],
    transformerDependencies: [`vatTransformer-${deps.address}`],
    startingBlock: deps.startingBlock,
    transform: async (services, _logs) => {
      const logs = flatten(_logs);
      if (logs.length === 0) {
        return;
      }
      const blocks = Array.from(new Set(logs.map(log => log.block_id)));

      const frobs = await services.tx.multi(
        `
            select 
                frob.*, (
                    select COALESCE(sum(rate), 0)
                    from vat.fold 
                    where 
                        i = frob.ilk and (
                            block_id < frob.block_id or 
                            block_id = frob.block_id  and log_index <= frob.log_index
                        )
                ) rate 
            from vat.frob frob
            where frob.block_id in (\$1:csv)
            `,
        [blocks],
      );

      const events = flatten(frobs)
        .map(frob => {
          const dink = new BigNumber(frob.dink).div(wad);
          const dart = new BigNumber(frob.dart).div(wad);
          const rate = new BigNumber(ray).plus(new BigNumber(frob.rate)).div(ray);

          if (frob.rate === null) {
            console.log('RATE SHOULD NOT BE NULL');
            return undefined;
          }
          const e = {
            kind: [
              !dink.isZero() && `${dink.gt(0) ? 'DEPOSIT' : 'WITHDRAW'}`,
              !dart.isZero() && `${dart.gt(0) ? 'GENERATE' : 'PAYBACK'}`,
            ]
              .filter(x => !!x)
              .join('-'),
            rate: rate.toString(),
            collateral_amount: dink.toString(),
            dai_amount: dart.times(rate).toString(),
            urn: frob.u,
            timestamp: frob.timestamp,
            tx_id: frob.tx_id,
            block_id: frob.block_id,
            log_index: frob.log_index,
            v_gem: frob.v,
            w_dai: frob.w,
          };

          return e;
        })
        .filter(e => e !== undefined);

      if (events.length === 0) {
        return;
      }

      const cs = new services.pg.helpers.ColumnSet(
        [
          'kind',
          'collateral_amount',
          'dai_amount',
          'urn',
          'timestamp',
          'tx_id',
          'block_id',
          'log_index',
          'v_gem',
          'w_dai',
          'rate',
        ],
        {
          table: {
            table: 'events',
            schema: 'vault',
          },
        },
      );

      const query = services.pg.helpers.insert(events, cs);
      await services.tx.none(query);
    },
  };
};
