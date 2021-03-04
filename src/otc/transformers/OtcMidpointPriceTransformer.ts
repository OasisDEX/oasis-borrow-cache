import { BigNumber } from 'bignumber.js';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { getVariableIndex, getBestOfferExtractorName } from '../extractors/midpointOfferExtractor';
import { getBlockRange } from '@oasisdex/spock-etl/dist/db/models/Block';
import { getLast } from '@oasisdex/spock-etl/dist/utils/arrays';
import { Dictionary, assert } from 'ts-essentials';
import { flatten, uniq, compact } from 'lodash';
import { DbTransactedConnection, makeNullUndefined } from '@oasisdex/spock-etl/dist/db/db';
import { groupIndividualsBy } from './utils';

function getExtractorDependencies(address: string, market: [string, string]): string[] {
  return [
    getBestOfferExtractorName(getVariableIndex(market[0], market[1]), address),
    getBestOfferExtractorName(getVariableIndex(market[1], market[0]), address),
  ];
}

export const makeOtcMidpointPriceTransformer: (
  address: string,
  market: [string, string],
  startingBlock?: number,
) => BlockTransformer = (address: string, market: [string, string], startingBlock) => {
  return {
    name: 'OtcMidpointPriceTransformer',
    dependencies: getExtractorDependencies(address, market),
    startingBlock,
    transformerDependencies: ['otcTransformerMarket'],
    transform: async (services, [bids, asks]) => {
      const bidsPerBlock: Dictionary<any> = groupIndividualsBy(flatten(bids), 'block_id');
      const asksPerBlock: Dictionary<any> = groupIndividualsBy(flatten(asks), 'block_id');

      assert(
        Object.keys(bids).length === Object.keys(asks).length,
        'bids and asks have to have same length',
      );
      if (bids.length === 0) {
        return;
      }
      // we get whole block range at once
      const blocks = await getBlockRange(
        (services as any).db,
        bids[0].block_id,
        getLast<any>(bids).block_id,
      );
      const blockById = groupIndividualsBy(blocks, 'id');
      // usually we deal only with couple of different offer ids
      const uniqueOfferIds = uniq([
        ...bids.map((b: any) => hexToNumber(b.value)),
        ...asks.map((b: any) => hexToNumber(b.value)),
      ]);
      const offers = compact(
        await Promise.all(uniqueOfferIds.map(id => getOfferById(services.tx, address, id))),
      );
      const offersById = groupIndividualsBy(offers, 'offer_id');

      await Promise.all(
        Object.keys(bidsPerBlock).map(async block_id => {
          // note: offers can be undefined if orderbook is empty
          const askOffer = offersById[hexToNumber(asksPerBlock[block_id].value)];
          const bidOffer = offersById[hexToNumber(bidsPerBlock[block_id].value)];

          const bidPrice = bidOffer ? parseFloat(bidOffer.price) : 0;
          const askPrice = askOffer ? parseFloat(askOffer.price) : 0;

          const price = bidPrice > 0 && askPrice > 0 ? (bidPrice + askPrice) / 2 : 0;

          await services.tx.none(
            `INSERT INTO oasis_market.midpoint_price(
             block_id, best_bid, best_ask, timestamp, price
           ) VALUES (
             \${block_id}, \${best_bid}, \${best_ask}, \${timestamp}, \${price}
           );`,
            {
              block_id,
              price,
              best_bid: bidPrice,
              best_ask: askPrice,
              timestamp: blockById[block_id].timestamp,
            },
          );
        }),
      );
    },
  };
};

function getOfferById(
  tx: DbTransactedConnection,
  address: string,
  offerId: number,
): Promise<{ price: string; offer_id: number } | undefined> {
  return tx
    .oneOrNone(
      `
          SELECT price, offer_id FROM oasis_market.log_make
          WHERE offer_id=\${offerId} AND address=\${otcContract}
          `,
      { offerId: offerId, otcContract: address },
    )
    .then(makeNullUndefined);
}

export function hexToNumber(hex: string): number {
  return new BigNumber(hex).toNumber();
}
