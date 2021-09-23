import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { getExtractorName } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';

import { flatten, max, min } from 'lodash';

function ilkToToken(ilk: string): string {
  return ilk.split('-')[0];
}

export const eventEnhancerTransformer: (
  vatAddress: string,
  startingBlock: number,
  oraclesTransformers: string[],
) => BlockTransformer = (vatAddress, startingBlock, oraclesTransformers) => {
  return {
    name: `event-enhancer-transformer`,
    dependencies: [getExtractorName(vatAddress)],
    transformerDependencies: [
      `vatCombineTransformerV2-${vatAddress}`,
      `vatMoveEventsTransformerV2-${vatAddress}`,
      ...oraclesTransformers,
    ],
    startingBlock: startingBlock,
    transform: async (services, _logs) => {
      const logs = flatten(_logs);
      if (logs.length === 0) {
        return;
      }
      const blocks = Array.from(new Set(logs.map(log => log.block_id)));

      const minBlock = min(blocks);
      const maxBlock = max(blocks);

      const events = flatten(
        await services.tx.multi(
          `
            SELECT e.*, f.ilk as frob_ilk from (
              SELECT * from vault.events e 
                WHERE block_id >= ${minBlock} AND block_id <= ${maxBlock}) e 
              LEFT JOIN vat.frob f ON e.tx_id = f.tx_id AND e.block_id = f.block_id AND e.log_index = f.log_index;
            `,
        ),
      )
        .filter(event => event.frob_ilk !== null)
        .map(event => ({
          ...event,
          token: ilkToToken(event.frob_ilk),
        }));

      if (events.length === 0) {
        return;
      }

      const values = events
        .map(event => `('${event.token}','${new Date(event.timestamp).toISOString()}',${event.id})`)
        .join(',');
      const eventToPrice = flatten(
        await services.tx.multi(
          `
            SELECT r._event_id as id, o.price FROM (
              SELECT _token, _event_id, (
                SELECT id FROM oracles.prices WHERE token = t._token and timestamp < to_timestamp(t._timestamp, 'YYYY-MM-DDThh24:mi:ss') ORDER BY timestamp DESC LIMIT 1) 
                FROM (VALUES${values}) t(_token, _timestamp, _event_id)) r 
                LEFT JOIN oracles.prices o ON o.id = r.id;
            `,
        ),
      );

      const updateValues = eventToPrice
        .map(({ price, id }) => ({ id, price: price || 0 }))
        .map(({ id, price }) => `(${price},${id})`)
        .join(',');

      await services.tx.none(
        `
          UPDATE vault.events SET oracle_price = c.price
          FROM (values${updateValues}) AS c(price, id) 
          WHERE c.id = vault.events.id;
          `,
      );
    },
  };
};
