import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import {
  getExtractorName, SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import BigNumber from 'bignumber.js';


import { flatten, groupBy, max, min, sortBy } from 'lodash';
import { Aggregated, assertAllowedEvent, CommonEvent, isBuyingCollateral, isFrobEvent, MultiplyDbEvent, MultiplyEvent } from '../../types/multiplyHistory';
import { wad } from '../../utils/precision';
import { Event } from '../../types/history';
import { getAuctions2TransformerName } from './dogTransformer';
import { eventEnhancerTransformerName } from './eventEnhancer';
import { getMultiplyTransformerName } from './multiply';
import { ethers } from 'ethers';

const erc20Abi = require('../../../abis/erc20.json');

const multiplyHistoryTransformerName = `multiply-history`

const zero = new BigNumber(0)

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

async function getTokenPrecision(services: LocalServices, tokenAddress: string): Promise<number> {
  const erc20 = new ethers.Contract(tokenAddress, erc20Abi, (services as any).provider);

  return erc20.decimals()
}

interface Dependencies {
  getTokenPrecision(tokenAddress: string): Promise<number>
  getGasFee(hash: string): Promise<number>
}

async function parseMultiplyEvent(
  multiplyEvent: MultiplyDbEvent, 
  vaultEvents: Aggregated<Event>[],
  dependencies: Dependencies,
  ): Promise<MultiplyEvent> {
  const lastEvent: Aggregated<Event> = vaultEvents[vaultEvents.length - 1]
  assertAllowedEvent(lastEvent)

  const collateralChange = new BigNumber(lastEvent.collateral_amount)
  
  const oraclePrice = new BigNumber(lastEvent.oracle_price)
  const oazoFee = new BigNumber(multiplyEvent.amount).div(wad)
  const loanFee = new BigNumber(multiplyEvent.due).minus(multiplyEvent.borrowed).div(wad)
  const liquidationRatio = new BigNumber(multiplyEvent.liquidation_ratio)
  const collateralTokenAddress = multiplyEvent.method_name === 'increaseMultiple' || multiplyEvent.method_name === 'openMultiplyVault' 
    ? multiplyEvent.asset_out
    : multiplyEvent.asset_out
  
  const [gasFee, collateralTokenDecimals] = await Promise.all([
    dependencies.getGasFee(lastEvent.hash),
    dependencies.getTokenPrecision(collateralTokenAddress)
  ])

  const collateralFromExchange = multiplyEvent.method_name === 'increaseMultiple' || multiplyEvent.method_name === 'openMultiplyVault'
    ? new BigNumber(multiplyEvent.amount_out).div(new BigNumber(10).pow(collateralTokenDecimals))
    : new BigNumber(multiplyEvent.amount_in).div(new BigNumber(10).pow(collateralTokenDecimals))
  
  const daiFromExchange = multiplyEvent.method_name === 'increaseMultiple' || multiplyEvent.method_name === 'openMultiplyVault'
    ? new BigNumber(multiplyEvent.amount_in).div(wad)
    : new BigNumber(multiplyEvent.amount_out).div(wad)

  const depositDai = multiplyEvent.method_name === 'increaseMultiple' || multiplyEvent.method_name === 'openMultiplyVault' 
   ? daiFromExchange.minus(new BigNumber(multiplyEvent.borrowed).div(wad))
   : zero

  const marketPrice = daiFromExchange.div(collateralFromExchange)

  const bought = 
    multiplyEvent.method_name === 'increaseMultiple' || multiplyEvent.method_name === 'openMultiplyVault' 
      ? collateralFromExchange
      : zero
  
  const sold = 
    multiplyEvent.method_name === 'decreaseMultiple' || multiplyEvent.method_name === 'closeVaultExitCollateral' || multiplyEvent.method_name === 'closeVaultExitDai'
      ? collateralFromExchange
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
    liquidationRatio,
    liquidationPrice: getLiquidationPrice(lastEvent.debt, lastEvent.lockedCollateral, liquidationRatio),
    netValue: getNetValue(lastEvent.debt, lastEvent.lockedCollateral, oraclePrice),
    
    oazoFee,
    loanFee,
    gasFee: new BigNumber(gasFee), // in wei
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
        depositCollateral: collateralChange.minus(bought),
        depositDai,
        ...common,
      }
    case 'increaseMultiple':
      return {
        kind: 'INCREASE_MULTIPLY',
        bought,
        depositCollateral: collateralChange.minus(bought),
        depositDai,
        ...common,
      }
    case 'decreaseMultiple':
      return {
        kind: 'DECREASE_MULTIPLY',
        sold,
        withdrawnCollateral: collateralChange.minus(sold),
        withdrawnDai: zero,
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
  return services.tx.manyOrNone(
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

        const extendedEvents = await Object.entries(eventByUrn).reduce(async (allEvents, [urn, urnEvents]) => {
          const urnEventsBefore = eventsBeforeBatchByUrn[urn] || []
          const urnMultiplyEvents = multiplyEventsByUrn[urn] || []
         
          const extendedEvents = aggregateVaultParams(urnEvents, urnEventsBefore)

          const multiplyEventsByTx = groupBy(urnMultiplyEvents, 'tx_id')
          const extendedEventsByTx = groupBy(extendedEvents, 'tx_id')
       
          const result = Object.entries(extendedEventsByTx).reduce(async (eventsForUrn, [txId, events]) => {
            const txMultiplyEvents = multiplyEventsByTx[txId] || []
            
            if (txMultiplyEvents.length === 0) {
              return [...(await eventsForUrn), ...events]
            }
            if (txMultiplyEvents.length === 1) {
              const multiplyEvent = txMultiplyEvents[0]
              return [...(await eventsForUrn), await parseMultiplyEvent(multiplyEvent, events, {
                getTokenPrecision: address => getTokenPrecision(services, address),
                getGasFee: hash => Promise.resolve(0),
              })]
            }
            throw new Error('Two multiply events in one transaction')
          }, Promise.resolve([]) as Promise<(Aggregated<Event> | MultiplyEvent)[]>)

          return [...(await allEvents), ...(await result)]
        }, Promise.resolve([]) as Promise<(Aggregated<Event> | MultiplyEvent)[]>)

        const values = extendedEvents.map(event => {
          switch (event.kind) {
            case 'INCREASE_MULTIPLY':
            case 'DECREASE_MULTIPLY':
            case 'OPEN_MULTIPLY_VAULT':
            case 'CLOSE_VAULT_TO_COLLATERAL':
            case 'CLOSE_VAULT_TO_DAI':
              return {
                kind: event.kind,
                urn: event.urn,
                market_price: event.marketPrice.toFixed(18),                
                oracle_price: event.oraclePrice.toFixed(18),                  
                before_collateral: event.beforeCollateral.toFixed(18),      
                collateral: event.collateral.toFixed(18),              
                before_collateralization_ratio: event.beforeCollateralizationRatio.toFixed(18),
                collateralization_ratio: event.collateralizationRatio.toFixed(18),
                before_debt: event.beforeDebt.toFixed(18),           
                debt: event.debt.toFixed(18),                      
                before_multiple: event.beforeMultiple.toFixed(18),    
                multiple: event.multiple.toFixed(18),                      
                before_liquidation_price: event.beforeLiquidationPrice.toFixed(18),
                liquidation_price: event.liquidationPrice.toFixed(18),          
                net_value: event.netValue.toFixed(18),
                
                oazo_fee: event.oazoFee.toFixed(18),     
                loan_fee: event.loanFee.toFixed(18),              
                gas_fee: event.gasFee.toFixed(18),                      
                total_fee: event.totalFee.toFixed(18),                   

                bought: isBuyingCollateral(event) ? event.bought.toFixed(18) : null,               
                deposit_collateral: isBuyingCollateral(event) ? event.depositCollateral.toFixed(18) : null,
                deposit_dai: isBuyingCollateral(event) ? event.depositDai.toFixed(18) : null,                     

                sold: !isBuyingCollateral(event) ? event.sold.toFixed(18) : null,                         
                withdrawn_collateral: event.kind === 'DECREASE_MULTIPLY' ? event.withdrawnCollateral.toFixed(18) : null,
                withdrawn_dai: event.kind === 'DECREASE_MULTIPLY' ? event.withdrawnDai.toFixed(18) : null,    

                exit_collateral: event.kind === 'CLOSE_VAULT_TO_COLLATERAL' ? event.exitCollateral.toFixed(18) : null,
                exit_dai: event.kind === 'CLOSE_VAULT_TO_DAI' ? event.exitDai.toFixed(18) : null,
                
                tx_id: event.tx_id,
                log_index: event.log_index,
                block_id: event.block_id,

                standard_event_id: null,
              }
            default:
              return {
                kind: event.kind,
                urn: event.urn,
                standard_event_id: event.id,
                debt: event.debt.toFixed(18),
                before_debt: event.beforeDebt.toFixed(18),
                collateral: event.lockedCollateral.toFixed(18),
                before_collateral: event.beforeLockedCollateral.toFixed(18),
                oracle_price: isFrobEvent(event) ? event.oracle_price : 0,
                tx_id: event.tx_id,
                log_index: event.log_index,
                block_id: event.block_id,

                market_price: null,
                before_collateralization_ratio: null,
                collateralization_ratio: null,
                before_multiple: null,
                multiple: null,
                before_liquidation_price: null,
                liquidation_price: null,
                net_value: null,
                oazo_fee: null,
                loan_fee: null,
                gas_fee: null,
                total_fee: null,
                bought: null,
                deposit_collateral: null,
                deposit_dai: null,
                sold: null,
                withdrawn_collateral: null,
                withdrawn_dai: null,
                exit_collateral: null,
                exit_dai: null,
              }
          }
        })

        const cs = new services.pg.helpers.ColumnSet(
          [
            'kind',
            'urn',
            'market_price',
            'oracle_price',
            'before_collateral',
            'collateral',
            'before_collateralization_ratio',
            'collateralization_ratio',
            'before_debt',
            'debt',
            'before_multiple',
            'multiple',
            'before_liquidation_price',
            'liquidation_price',
            'net_value',
            
            'oazo_fee',
            'loan_fee',
            'gas_fee',
            'total_fee',

            'bought',
            'deposit_collateral',
            'deposit_dai',

            'sold',
            'withdrawn_collateral',
            'withdrawn_dai',

            'exit_collateral',
            'exit_dai',

            'standard_event_id',

            'tx_id',
            'block_id',
            'log_index',
          ],
          {
            table: {
                schema: 'vault',
                table: 'multiply_events',
            },
          },
        );
      
        const query = services.pg.helpers.insert(values, cs);
        await services.tx.none(query);
      },
    };
  };
