import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import {
  getExtractorName, SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import BigNumber from 'bignumber.js';

import { flatten, groupBy, max, min, sortBy } from 'lodash';
import { Event } from '../../types/history';
import { getAuctions2TransformerName } from './dogTransformer';
import { eventEnhancerTransformerName } from './eventEnhancer';
import { getMultiplyTransformerName } from './multiply';

const multiplyHistoryTransformerName = `multiply-history`

type Aggregated<T> = T & {
  beforeDebt: BigNumber,
  debt: BigNumber,
  beforeLockedCollateral: BigNumber,
  lockedCollateral: BigNumber,
}

const zero = new BigNumber(0)

function aggregateNormalizedDebt(total: BigNumber, event: Event): BigNumber {
  switch (event.kind) {
    case 'GENERATE':
    case 'WITHDRAW-PAYBACK':
    case 'DEPOSIT-GENERATE':
    case 'MOVE_DESC':
      return total.plus(event.daiAmount.div(event.rate))
    case 'MOVE_SRC':
    case 'AUCTION_STARTED_V2':
    case 'AUCTION_STARTED':
      return total.minus(event.daiAmount.div(event.rate))
    default:
      return total;
  }
}

function aggregateCollateral(total: BigNumber, event: Event): BigNumber {
  switch (event.kind) {
    case 'DEPOSIT':
    case 'WITHDRAW-PAYBACK':
    case 'DEPOSIT-GENERATE':
    case 'MOVE_DESC':
      return total.plus(event.collateralAmount.div(event.rate))
    case 'MOVE_SRC':
    case 'AUCTION_STARTED_V2':
    case 'AUCTION_STARTED':
      return total.minus(event.collateralAmount.div(event.rate))
    default:
      return total;
  }
}

function aggregateVaultParams(events: Event[], eventsBefore: Event[]): Aggregated<Event>[] {
  const debt = eventsBefore.reduce(aggregateNormalizedDebt, zero)
  const lockedCollateral = eventsBefore.reduce(aggregateCollateral, zero)

  const sortedEvents = sortBy(events, event => event.block_id, event => event.log_index)

  return sortedEvents.reduce((acc, event) => {
    const previousEvent: Aggregated<Event> | undefined = acc[acc.length - 1]
    const beforeDebt = previousEvent ? previousEvent.debt : debt
    const beforeLockedCollateral = previousEvent ? previousEvent.lockedCollateral : lockedCollateral

    return [
      ...acc, 
      {
        ...event, 
        beforeDebt, 
        debt: zero, 
        beforeLockedCollateral,
        lockedCollateral: zero
      }]
  }, [] as Aggregated<Event>[])
}


export const multiplyHistoryTransformer: (
    vatAddress: string,
    dependencies: {
        dogs: SimpleProcessorDefinition[],
        multiplyProxyActionsAddress: SimpleProcessorDefinition[]
    }
  ) => BlockTransformer = (vatAddress, dependencies) => {
    return {
      name: multiplyHistoryTransformerName,
      dependencies: [getExtractorName(vatAddress)],
      transformerDependencies: [
          eventEnhancerTransformerName, 
          ...dependencies.dogs.map(dog => getAuctions2TransformerName(dog)),
          ...dependencies.multiplyProxyActionsAddress.map(mpa => getMultiplyTransformerName(mpa))
        ],
      transform: async (services, _logs) => {
        const logs = flatten(_logs);
        if (logs.length === 0) {
          return;
        }

        const blocks = Array.from(new Set(logs.map(log => log.block_id)));
  
        const minBlock = min(blocks);
        const maxBlock = max(blocks);

        const events: Event[] = await services.tx.many(
          `
          SELECT * FROM vault.events WHERE block_id >= ${minBlock} AND block_id <= ${maxBlock}
          `
        )

        const multiplyEvents = await services.tx.manyOrNone(
          `
          SELECT * FROM multiply.method_called m
            JOIN multiply.flashloan l ON m.tx_id = l.tx_id
            JOIN exchange.asset_swap s ON m.tx_id = s.tx_id
            JOIN exchange.fee_paid f ON m.tx_id = f.tx_id
            JOIN exchange.slippage_saved sl ON m.tx_id = sl.tx_id WHERE m.block_id >= ${minBlock} AND m.block_id <= ${maxBlock}
          `
        )

        const allUrns = Array.from(new Set(events.map(event => event.urn)))
          .map(urn => `'${urn}'`)
          .join(',')


        const allEventsBeforeBatch: Event[] = await services.tx.manyOrNone(`
          SELECT * FROM vault.events WHERE block_id < ${minBlock} AND urn in (${allUrns})
        `)

        const eventsBeforeBatchByUrn = groupBy(allEventsBeforeBatch, 'urn')
        const eventByUrn = groupBy(events, 'urn')

        const extendedEvents = Object.entries(eventByUrn).reduce((acc, [urn, eventsForUrn]) => {
          const eventsBeforeForUrn = eventsBeforeBatchByUrn[urn] || []

          const extendedEvents = aggregateVaultParams(eventsForUrn, eventsBeforeForUrn)

          return acc
        }, [])

        

        // const eventsByTx = groupBy(events, 'tx_id')
        // const multiplyEventsByTx = groupBy(multiplyEvents, 'tx_id')

        // const eventsToSave = Object.entries(eventsByTx).reduce((allEvents, [txId, events]) => {
        //   if (txId in multiplyEventsByTx) {
        //     const multiplyEvent = multiplyEventsByTx[txId][0]
        //     console.log('processing multiple')

        //     return allEvents
        //   }

        //   return [...allEvents, ...events]
        // }, [])

      
      },
    };
  };

  
/*
{
  "0xcb089ca684b3371b0457d6af9d21e4528286ba5d": [
    {
      id: 6,
      kind: "DEPOSIT-GENERATE",
      collateral_amount: "1.341197950000000000",
      dai_amount: "43197.815175389961693026",
      rate: "1.000004077227889877",
      vault_creator: null,
      depositor: null,
      urn: "0xcb089ca684b3371b0457d6af9d21e4528286ba5d",
      cdp_id: null,
      transfer_from: null,
      transfer_to: null,
      timestamp: {
      },
      log_index: 53,
      tx_id: 4,
      block_id: 207,
      collateral: null,
      auction_id: null,
      liq_penalty: null,
      collateral_price: null,
      covered_debt: null,
      remaining_debt: null,
      remaining_collateral: null,
      collateral_taken: null,
      ilk: "WBTC-A",
      oracle_price: "51806.000000000000000000",
    },
    {
      id: 12,
      kind: "DEPOSIT-GENERATE",
      collateral_amount: "0.862888850000000000",
      dai_amount: "23998.786473232381486903",
      rate: "1.000004352619599758",
      vault_creator: null,
      depositor: null,
      urn: "0xcb089ca684b3371b0457d6af9d21e4528286ba5d",
      cdp_id: null,
      transfer_from: null,
      transfer_to: null,
      timestamp: {
      },
      log_index: 198,
      tx_id: 25,
      block_id: 245,
      collateral: null,
      auction_id: null,
      liq_penalty: null,
      collateral_price: null,
      covered_debt: null,
      remaining_debt: null,
      remaining_collateral: null,
      collateral_taken: null,
      ilk: "WBTC-A",
      oracle_price: "51806.000000000000000000",
    },
    {
      id: 17,
      kind: "DEPOSIT-GENERATE",
      collateral_amount: "0.480117280000000000",
      dai_amount: "14399.272363008036562697",
      rate: "1.000005183374130012",
      vault_creator: null,
      depositor: null,
      urn: "0xcb089ca684b3371b0457d6af9d21e4528286ba5d",
      cdp_id: null,
      transfer_from: null,
      transfer_to: null,
      timestamp: {
      },
      log_index: 84,
      tx_id: 26,
      block_id: 346,
      collateral: null,
      auction_id: null,
      liq_penalty: null,
      collateral_price: null,
      covered_debt: null,
      remaining_debt: null,
      remaining_collateral: null,
      collateral_taken: null,
      ilk: "WBTC-A",
      oracle_price: "51806.000000000000000000",
    },
  ],
}

*/