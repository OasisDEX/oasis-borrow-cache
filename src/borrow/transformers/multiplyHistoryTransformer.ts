import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import {
  getExtractorName, SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { flatten, groupBy, max, min } from 'lodash';
import { Aggregated, isBuyingCollateral, isFrobEvent, MultiplyDbEvent, MultiplyEvent } from '../../types/multiplyHistory';
import { Event } from '../../types/history';
import { getAuctions2TransformerName } from './dogTransformer';
import { eventEnhancerTransformerName } from './eventEnhancer';
import { getMultiplyTransformerName } from './multiply';
import { getTokenPrecision } from '../../utils/getTokenPrecision';
import { aggregateVaultParams } from '../../utils/aggregateVaultParams';
import { parseMultiplyEvent } from '../../utils/parseMultiplyEvent';
import { getGasFee } from '../../utils/getGasFee';

const multiplyHistoryTransformerName = `multiply-history`

function getEventsFromBlockRange(services: LocalServices, start: number, end: number): Promise<Event[]> {
  return services.tx.manyOrNone(
    `
    SELECT e.*, t.hash FROM vault.events e
    JOIN vulcan2x.transaction t ON e.tx_id = t.id
    WHERE e.block_id >= ${start} AND e.block_id <= ${end} AND e.kind != 'TAKE'
    `
  )
}

function getCombinedMultiplyEvents(services: LocalServices, start: number, end: number): Promise<MultiplyDbEvent[]> {
  return services.tx.manyOrNone(
    `
    SELECT 
    m.method_name, m.cdp_id, m.ilk, 
    m.liquidation_ratio, m.swap_min_amount, m.swap_optimist_amount,
    m.collateral_left, m.dai_left, 
    m.log_index, m.tx_id, m.block_id,
    l.borrowed, l.due,
    a.asset_in, a.asset_out, a.amount_in, a.amount_out,
    f.beneficiary, f.amount as oazo_fee,
    sl.minimum_possible, sl.actual_amount,
    ma.urn
    FROM multiply.method_called m
      JOIN multiply.flashloan l ON m.tx_id = l.tx_id
      JOIN exchange.asset_swap a ON m.tx_id = a.tx_id
      JOIN exchange.fee_paid f ON m.tx_id = f.tx_id
      JOIN exchange.slippage_saved sl ON m.tx_id = sl.tx_id 
      JOIN manager.cdp ma ON ma.cdp_id = m.cdp_id
      WHERE m.block_id >= ${start} AND m.block_id <= ${end}
    `
  )
}

async function getEventsForUrnsBeforeBlock(services: LocalServices, blockId: number, urns: string[]): Promise<Event[]> {
  const values = urns.map(urn => `'${urn}'`).join(',')

 return services.tx.manyOrNone(`
    SELECT e.*, t.hash FROM vault.events e 
    JOIN vulcan2x.transaction t ON e.tx_id = t.id
    WHERE e.block_id < ${blockId} AND e.urn in (${values})
  `)
}

function eventToDbFormat(event: (Aggregated<Event> | MultiplyEvent)) {{
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
        oracle_price: isFrobEvent(event) ? event.oracle_price : null,
        tx_id: event.tx_id,
        log_index: event.log_index,
        block_id: event.block_id,
        before_collateralization_ratio: event.beforeCollateralizationRatio?.toFixed(18) || null,
        collateralization_ratio: event.collateralizationRatio?.toFixed(18) || null,

        market_price: null,
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
}
}

type EventToSave = ReturnType<typeof eventToDbFormat>

async function saveEventsToDb(services: LocalServices, events: EventToSave[]) {
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

  const query = services.pg.helpers.insert(events, cs);
  await services.tx.none(query);
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

        const multiplyEvents: MultiplyDbEvent[] = await getCombinedMultiplyEvents(services, minBlock, maxBlock)

        const uniqueUrns = Array.from(new Set(events.map(event => event.urn)))

        const allEventsBeforeBatch: Event[] = await getEventsForUrnsBeforeBlock(services, minBlock, uniqueUrns)

        const eventByUrn = groupBy(events, 'urn')
        const eventsBeforeBatchByUrn = groupBy(allEventsBeforeBatch, 'urn')
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
                getGasFee: hash => getGasFee(services, hash),
              })]
            }
            throw new Error('Two multiply events in one transaction')
          }, Promise.resolve([]) as Promise<(Aggregated<Event> | MultiplyEvent)[]>)

          return [...(await allEvents), ...(await result)]
        }, Promise.resolve([]) as Promise<(Aggregated<Event> | MultiplyEvent)[]>)

        const values = extendedEvents.map(eventToDbFormat)

        await saveEventsToDb(services, values)
   
      },
    };
  };
