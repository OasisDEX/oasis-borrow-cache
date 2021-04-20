import { flatten } from 'lodash';
import { parseBytes32String } from 'ethers/utils';
import {
  handleDsNoteEvents,
  FullNoteEventInfo,
  DsNoteHandlers,
} from '@oasisdex/spock-utils/dist/transformers/common';
import {
  getExtractorName,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { normalizeAddressDefinition } from '../../utils';
import { BigNumber } from 'bignumber.js';
import { wad, ray } from '../../utils/precision';

const vatAbi = require('../../../abis/vat.json');

const vatNoteHandlers: DsNoteHandlers = {
  async 'fork(bytes32,address,address,int256,int256)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ): Promise<void> {
    const timestamp = await services.tx.oneOrNone(
      `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
      {
        block_id: log.block_id,
      },
    );

    const values = {
      ilk: parseBytes32String(note.params.ilk),
      src: note.params.src.toLowerCase(),
      dst: note.params.dst.toLowerCase(),
      dink: note.params.dink.toString(),
      dart: note.params.rate.toString(),

      timestamp: timestamp.timestamp,
      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await services.tx.none(
      `
                INSERT INTO vat.fork(
                    ilk, src, dst, dink, dart,
                    log_index, tx_id, block_id, timestamp
                ) VALUES (
                    \${ilk}, \${src}, \${dst}, \${dink}, \${dink},  
                    \${log_index}, \${tx_id}, \${block_id}, \${timestamp}
                );`,
      values,
    );
  },
  async 'grab(bytes32,address,address,address,int256,int256)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ): Promise<void> {
    const timestamp = await services.tx.oneOrNone(
      `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
      {
        block_id: log.block_id,
      },
    );
    const values = {
      i: parseBytes32String(note.params.i),
      u: note.params.u.toLowerCase(),
      v: note.params.v.toLowerCase(),
      w: note.params.w.toLowerCase(),
      dink: note.params.dink.toString(),
      dart: note.params.dart.toString(),

      timestamp: timestamp.timestamp,
      log_index: log.log_index,
      tx_id: log.tx_id,
      block_id: log.block_id,
    };

    await services.tx.none(
      `
                INSERT INTO vat.grab(
                    i, u, v, w, dink, dart,
                    log_index, tx_id, block_id, timestamp
                ) VALUES (
                    \${i}, \${u}, \${v}, \${w}, \${dink}, \${dink},  
                    \${log_index}, \${tx_id}, \${block_id}, \${timestamp}
                );`,
      values,
    );
  },
  async 'fold(bytes32,address,int256)'(
    services: LocalServices,
    { note, log }: FullNoteEventInfo,
  ): Promise<void> {
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
                    i, rate, u, 
                    log_index, tx_id, block_id, timestamp
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
  ): Promise<void> {
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
    await services.tx.none(
      `
            INSERT INTO vat.frob(
                dart, dink, ilk, u, v, w, timestamp, log_index, tx_id, block_id
            ) VALUES (
                \${dart}, \${dink}, \${ilk}, \${u}, \${v}, \${w}, \${timestamp}, \${log_index},
                \${tx_id}, \${block_id}
            );`,
      values,
    );
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
            throw new Error('RATE SHOULD NOT BE NULL');
          }
          return {
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
          };
        })
        .filter(event => event.kind !== '');

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
