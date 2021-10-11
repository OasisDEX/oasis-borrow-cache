import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import {
  getExtractorName, SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import BigNumber from 'bignumber.js';


import { flatten, groupBy, max, min, sortBy } from 'lodash';
import { CommonEvent, MultiplyDbEvent, MultiplyEvent } from 'src/types/multiplyHistory';
import { wad } from '../../utils/precision';
import { Event } from '../../types/history';
import { getAuctions2TransformerName } from './dogTransformer';
import { eventEnhancerTransformerName } from './eventEnhancer';
import { getMultiplyTransformerName } from './multiply';

const multiplyHistoryTransformerName = `multiply-history`

//TODO clean up snake_cases 

type Aggregated<T> = T & {
  beforeDebt: BigNumber,
  debt: BigNumber,
  beforeLockedCollateral: BigNumber,
  lockedCollateral: BigNumber,

  // liquidationPrice: BigNumber
  // beforeCollateralizationRatio: BigNumber
  // collateralizationRatio: BigNumber
}

const zero = new BigNumber(0)

const allowedStandardEvents = ['DEPOSIT', 'DEPOSIT-GENERATE', 'WITHDRAW', 'WITHDRAW-PAYBACK'] as const
type AllowedEventsKey = (typeof allowedStandardEvents)[number]
type FilterByKind<E extends {kind: string}, K extends string> = E extends any ? E["kind"] extends K ? E : never : never
type AllowedEvent = FilterByKind<Aggregated<Event>, AllowedEventsKey>

function assertAllowedEvent(event: Aggregated<Event>): asserts event is AllowedEvent {
  if (!allowedStandardEvents.includes(event.kind as any)) {
    throw new Error(`${event.kind} event cannot be combined with multiplyEvent`)
  }
}

function getCollateralizationRatio(debt: BigNumber, collateral: BigNumber, osmPrice: BigNumber) {
  if (debt.eq(zero)) {
    return zero
  }
  return collateral.times(osmPrice).div(debt)
}

function getLiquidationPrice(debt: BigNumber, collateral: BigNumber, liquidationRatio: BigNumber) {
  if (debt.eq(zero)) {
    return zero
  }
  return liquidationRatio.times(debt).div(collateral)
}

function getMultiple(debt: BigNumber, collateral: BigNumber, osmPrice: BigNumber) {
  const lockedCollateralUSD = collateral.times(osmPrice)
  if (lockedCollateralUSD.eq(zero)) {
    return zero
  } 
  return lockedCollateralUSD.div(lockedCollateralUSD.minus(debt))
}

function getNetValue(debt: BigNumber, collateral: BigNumber, osmPrice: BigNumber) {
  const lockedCollateralUSD = collateral.times(osmPrice)
  if (lockedCollateralUSD.eq(zero)) {
    return zero
  } 
  return lockedCollateralUSD.minus(debt)
}

function parseMultiplyEvent(multiplyEvent: MultiplyDbEvent, vaultEvents: Aggregated<Event>[]): MultiplyEvent {
  const lastEvent: Aggregated<Event> = vaultEvents[vaultEvents.length - 1]
  assertAllowedEvent(lastEvent)

  // I think we forgot about depositing or withdrawing dai 
  const debtChange = new BigNumber(lastEvent.dai_amount)
  const collateralChange = new BigNumber(lastEvent.collateral_amount)
  
  const oraclePrice = new BigNumber(lastEvent.oracle_price)
  //find proper divider
  const oazoFee = new BigNumber(multiplyEvent.amount).div(wad)
  const loanFee = new BigNumber(multiplyEvent.due).minus(multiplyEvent.borrowed).div(wad)
  const gasFee = new BigNumber(0)
  const liquidationRatio = new BigNumber(multiplyEvent.liquidation_ratio)
  const marketPrice = 
    multiplyEvent.method_name === 'increaseMultiple' || multiplyEvent.method_name === 'openMultiplyVault' 
      ? new BigNumber(multiplyEvent.amount_in).div(multiplyEvent.amount_out)
      : new BigNumber(multiplyEvent.amount_out).div(multiplyEvent.amount_in)

  const bought = 
    multiplyEvent.method_name === 'increaseMultiple' || multiplyEvent.method_name === 'openMultiplyVault' 
      ? new BigNumber(multiplyEvent.amount_out).div(wad)
      : zero
  
  const sold = 
    multiplyEvent.method_name === 'decreaseMultiple' || multiplyEvent.method_name === 'closeVaultExitCollateral' || multiplyEvent.method_name === 'closeVaultExitDai'
      ? new BigNumber(multiplyEvent.amount_in).div(wad)
      : zero

  const common: CommonEvent = {
    marketPrice,
    oraclePrice,
    beforeCollateral: lastEvent.beforeLockedCollateral,
    collateral: lastEvent.lockedCollateral,
    beforeCollateralizationRatio: getCollateralizationRatio(lastEvent.beforeDebt, lastEvent.beforeLockedCollateral, oraclePrice),
    collateralizationRatio: getCollateralizationRatio(lastEvent.debt, lastEvent.lockedCollateral, oraclePrice),
    beforeDebt: lastEvent.beforeDebt,
    debt: lastEvent.debt,
    beforeMultiple: getMultiple(lastEvent.beforeDebt, lastEvent.beforeLockedCollateral, oraclePrice),
    multiple: getMultiple(lastEvent.debt, lastEvent.lockedCollateral, oraclePrice),
    beforeLiquidationPrice: getLiquidationPrice(lastEvent.beforeDebt, lastEvent.beforeLockedCollateral, liquidationRatio),
    liquidationPrice: getLiquidationPrice(lastEvent.debt, lastEvent.lockedCollateral, liquidationRatio),
    netValue: getNetValue(lastEvent.debt, lastEvent.lockedCollateral, oraclePrice),
    
    oazoFee,
    loanFee,
    gasFee, // in wei
    totalFee: BigNumber.sum(oazoFee, loanFee),

    tx_id: multiplyEvent.tx_id,
    log_index: multiplyEvent.tx_id,
    block_id: multiplyEvent.block_id,
    urn: multiplyEvent.urn
  }

  switch (multiplyEvent.method_name) {
    case 'openMultiplyVault':
      return {
        kind: 'OPEN_MULTIPLY_VAULT',
        bought,
        deposit: collateralChange.minus(bought),
        ...common,
      }
    case 'increaseMultiple':
      return {
        kind: 'INCREASE_MULTIPLY',
        bought,
        deposit: collateralChange.minus(bought),
        ...common,
      }
    case 'decreaseMultiple':
      return {
        kind: 'DECREASE_MULTIPLY',
        sold,
        withdrawn: collateralChange.minus(sold),
        ...common,
      }
    case 'closeVaultExitCollateral':
      return {
        kind: 'CLOSE_VAULT_TO_COLLATERAL',
        sold: sold,
        exitCollateral: new BigNumber(multiplyEvent.collateral_left),
        ...common,
      }
    case 'closeVaultExitDai':
      return {
        kind: 'CLOSE_VAULT_TO_DAI',
        sold,
        exitDai: new BigNumber(multiplyEvent.dai_left),
        ...common,
      }
  }
}


function sumNormalizedDebt(total: BigNumber, event: Event): BigNumber {
  switch (event.kind) {
    case 'GENERATE':
    case 'PAYBACK':
    case 'WITHDRAW-PAYBACK':
    case 'DEPOSIT-GENERATE':
    case 'MOVE_DESC':
      return total.plus(new BigNumber(event.dai_amount).div(event.rate))
    case 'MOVE_SRC':
    case 'AUCTION_STARTED_V2':
    case 'AUCTION_STARTED':
      return total.minus(new BigNumber(event.dai_amount).div(event.rate))
    default:
      return total;
  }
}

function sumCollateral(total: BigNumber, event: Event): BigNumber {
  switch (event.kind) {
    case 'DEPOSIT':
    case 'WITHDRAW':
    case 'WITHDRAW-PAYBACK':
    case 'DEPOSIT-GENERATE':
    case 'MOVE_DESC':
      return total.plus(event.collateral_amount)
    case 'MOVE_SRC':
    case 'AUCTION_STARTED_V2':
    case 'AUCTION_STARTED':
      return total.minus(event.collateral_amount)
    default:
      return total;
  }
}

export function aggregateVaultParams(events: Event[], eventsBefore: Event[]): Aggregated<Event>[] {
  const debtBeforeBatch = eventsBefore.reduce(sumNormalizedDebt, zero) // THIS CAN BE PASSED AS ARGUMENT 
  const lockedCollateralBeforeBatch = eventsBefore.reduce(sumCollateral, zero) // THIS CAN BE PASSED AS ARGUMENT 

  const sortedEvents = sortBy(events, event => event.block_id, event => event.log_index)

  return sortedEvents.reduce((acc, event) => {
    const previousEvent: Aggregated<Event> | undefined = acc[acc.length - 1]
    const beforeDebt = previousEvent ? previousEvent.debt : debtBeforeBatch
    const beforeLockedCollateral = previousEvent ? previousEvent.lockedCollateral : lockedCollateralBeforeBatch

    const aggregatedEvent = {
      ...event, 
      beforeDebt, 
      debt: sumNormalizedDebt(beforeDebt, event), 
      beforeLockedCollateral,
      lockedCollateral: sumCollateral(beforeLockedCollateral, event)
    }

    return [...acc, aggregatedEvent]
  }, [] as Aggregated<Event>[])
}

function getEventsFromBlockRange(services: LocalServices, start: number, end: number): Promise<Event[]> {
  return services.tx.many(
    `
    SELECT * FROM vault.events WHERE block_id >= ${start} AND block_id <= ${end}
    `
  )
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
  
        const minBlock: number = min(blocks);
        const maxBlock: number = max(blocks);

        const events: Event[] = await getEventsFromBlockRange(services, minBlock, maxBlock)

        if (events.length === 0) {
          return;
        }

        const multiplyEvents: MultiplyDbEvent[] = await services.tx.manyOrNone(
          `
          SELECT m.*, l.*, s.*, f.*, sl.*, ma.urn FROM multiply.method_called m
            JOIN multiply.flashloan l ON m.tx_id = l.tx_id
            JOIN exchange.asset_swap s ON m.tx_id = s.tx_id
            JOIN exchange.fee_paid f ON m.tx_id = f.tx_id
            JOIN exchange.slippage_saved sl ON m.tx_id = sl.tx_id 
            JOIN manager.cdp ma ON ma.cdp_id = m.cdp_id
            WHERE m.block_id >= ${minBlock} AND m.block_id <= ${maxBlock}
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
        const multiplyEventsByUrn = groupBy(multiplyEvents, 'urn')

        const extendedEvents = Object.entries(eventByUrn).reduce((acc, [urn, urnEvents]) => {
          const urnEventsBefore = eventsBeforeBatchByUrn[urn] || []
          const urnMultiplyEvents = multiplyEventsByUrn[urn] || []
         
          const extendedEvents = aggregateVaultParams(urnEvents, urnEventsBefore)

          const multiplyEventsByTx = groupBy(urnMultiplyEvents, 'tx_id')
          const extendedEventsByTx = groupBy(extendedEvents, 'tx_id')
       
          const result = Object.entries(extendedEventsByTx).reduce((acc, [txId, events]) => {
            const txMultiplyEvents = multiplyEventsByTx[txId] || []
            
            if (txMultiplyEvents.length === 0) {
              return [...acc, ...events]
            }
            if (txMultiplyEvents.length === 1) {
              const multiplyEvent = txMultiplyEvents[0]
              return [...acc, parseMultiplyEvent(multiplyEvent, events)]
            }
            throw new Error('Two multiply events in one transaction')
          }, [] as (Aggregated<Event> | MultiplyEvent)[])

          return [...acc, ...result]
        }, [] as (Aggregated<Event> | MultiplyEvent)[])

        console.log(extendedEvents)

      
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