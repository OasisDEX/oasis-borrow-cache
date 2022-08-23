import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import {
  Aggregated,
  isBuyingCollateral,
  MPAAggregatedEvent,
  MultiplyEvent,
} from '../types/multiplyHistory';
import { Event } from '../types/history';
import { BigNumber } from 'bignumber.js';
import { flatten } from 'lodash';

export function getEventsFromBlockRange(
  services: LocalServices,
  start: number,
  end: number,
): Promise<Event[]> {
  return services.tx.manyOrNone(
    `
    SELECT e.*, t.hash FROM vault.events e
    JOIN vulcan2x.transaction t ON e.tx_id = t.id
    WHERE e.block_id >= ${start} AND e.block_id <= ${end} AND e.kind != 'TAKE'
    `,
  );
}

export function getCombinedMultiplyEvents(
  services: LocalServices,
  start: number,
  end: number,
): Promise<MPAAggregatedEvent[]> {
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
    `,
  );
}

export async function getLastExtendedEventBeforeBatch(
  services: LocalServices,
  blockId: number,
  urns: string[],
): Promise<MultiplyEventDb[] | null> {
  const values = urns.map(urn => `'${urn}'`).join(',');

  return services.tx.manyOrNone(`
  WITH inner_table AS (
    SELECT e.* FROM vault.multiply_events e
          WHERE urn IN (${values})
          AND e.block_id < ${blockId})
    SELECT tab1.* FROM inner_table AS tab1 
    INNER JOIN ( SELECT max(order_index) as order_index, urn FROM inner_table GROUP BY urn ) AS tab2 ON tab1.order_index = tab2.order_index AND tab1.urn = tab2.urn
  `);
}
// it's intended to infer the returned typed here.
// tslint:disable-next-line
export function eventToDbFormat(event: Aggregated<Event> | MultiplyEvent) {
  {
    const order_index = new BigNumber(event.block_id).times(1000000).plus(event.log_index);
    switch (event.kind) {
      case 'INCREASE_MULTIPLE':
      case 'DECREASE_MULTIPLE':
      case 'OPEN_MULTIPLY_VAULT':
      case 'OPEN_MULTIPLY_GUNI_VAULT':
      case 'CLOSE_VAULT_TO_COLLATERAL':
      case 'CLOSE_VAULT_TO_DAI':
      case 'CLOSE_GUNI_VAULT_TO_DAI':
        return {
          kind: event.kind,
          urn: event.urn,
          market_price: event.marketPrice.toFixed(18),
          before_locked_collateral: event.beforeLockedCollateral.toFixed(18),
          locked_collateral: event.lockedCollateral.toFixed(18),
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
          total_fee: event.totalFee.toFixed(18),

          bought: isBuyingCollateral(event) ? event.bought.toFixed(18) : null,
          deposit_collateral: isBuyingCollateral(event)
            ? event.depositCollateral.toFixed(18)
            : null,
          deposit_dai: isBuyingCollateral(event) ? event.depositDai.toFixed(18) : null,

          sold: !isBuyingCollateral(event) ? event.sold.toFixed(18) : null,
          withdrawn_collateral:
            event.kind === 'DECREASE_MULTIPLE' ? event.withdrawnCollateral.toFixed(18) : null,
          withdrawn_dai: event.kind === 'DECREASE_MULTIPLE' ? event.withdrawnDai.toFixed(18) : null,

          exit_collateral:
            event.kind === 'CLOSE_VAULT_TO_COLLATERAL' ? event.exitCollateral.toFixed(18) : null,
          exit_dai: event.exitDai ? event.exitDai.toFixed(18) : null,

          tx_id: event.tx_id,
          log_index: event.log_index,
          block_id: event.block_id,

          standard_event_id: event.standardEventId,
          order_index: order_index.toString(),
        };
      default:
        return {
          kind: event.kind,
          urn: event.urn,
          standard_event_id: event.id,
          debt: event.debt.toFixed(18),
          before_debt: event.beforeDebt.toFixed(18),
          locked_collateral: event.lockedCollateral.toFixed(18),
          before_locked_collateral: event.beforeLockedCollateral.toFixed(18),
          tx_id: event.tx_id,
          log_index: event.log_index,
          block_id: event.block_id,
          before_collateralization_ratio: event.beforeCollateralizationRatio?.toFixed(18) || null,
          collateralization_ratio: event.collateralizationRatio?.toFixed(18) || null,
          order_index: order_index.toString(),

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
        };
    }
  }
}

export type MultiplyEventDb = ReturnType<typeof eventToDbFormat>;

export async function saveEventsToDb(
  services: LocalServices,
  events: MultiplyEventDb[],
): Promise<void> {
  const cs = new services.pg.helpers.ColumnSet(
    [
      'kind',
      'urn',
      'market_price',
      'before_locked_collateral',
      'locked_collateral',
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

      'order_index',
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

export type WithIlk<T> = T & { ilk: string | undefined };

export type WithToken<T> = T & { token: string };

export async function getEventsFromRange(
  services: LocalServices,
  minBlock: number,
  maxBlock: number,
): Promise<WithIlk<Event>[]> {
  return flatten(
    await services.tx.multi(
      `
        SELECT e.*, f.ilk as frob_ilk from (
          SELECT * from vault.events e 
            WHERE block_id >= ${minBlock} AND block_id <= ${maxBlock}) e 
          LEFT JOIN vat.frob f ON e.tx_id = f.tx_id AND e.block_id = f.block_id AND e.log_index = f.log_index;
        `,
    ),
  ).map(event => ({ ...event, ilk: event.ilk || event.frob_ilk }));
}

// tslint:disable-next-line
export function ilkToToken(ilk: string): string {
  return ilk.split('-')[0];
}

export function addTokenToEvent(event: WithIlk<Event>): WithToken<Event> | undefined {
  if (event.kind === 'AUCTION_STARTED_V2' || event.kind === 'AUCTION_STARTED') {
    const token = event.collateral === 'WETH' ? 'ETH' : event.collateral;
    return { ...event, token };
  }

  const token = event.ilk ? ilkToToken(event.ilk) : undefined;

  if (token) {
    return { ...event, token };
  }

  return undefined;
}

export type WithGasFee<T> = T & { gasFee: BigNumber };

export async function updateEventsWithGasFee(
  services: LocalServices,
  events: WithGasFee<Event>[],
): Promise<null> {
  const updateValues = events.map(({ id, gasFee }) => `(${gasFee.toString()},${id})`).join(',');

  return services.tx.none(
    `
      UPDATE vault.multiply_events SET gas_fee = c.gas_fee
      FROM (values${updateValues}) AS c(gas_fee, id) 
      WHERE c.id = vault.multiply_events.standard_event_id;
    `,
  );
}

export function getAutomationRemoveEventsFromBlockRange(
  services: LocalServices,
  start: number,
  end: number,
): Promise<Event[]> {
  const removeEvents = services.tx.manyOrNone(
    `
    SELECT r.*, t.hash, b.timestamp FROM automation_bot.trigger_removed_events r
    JOIN vulcan2x.transaction t ON r.tx_id = t.id
    JOIN vulcan2x.block b ON r.block_id = b.id
    WHERE r.block_id >= ${start} AND r.block_id <= ${end}
    `,
  );

  return removeEvents;
}
export function getAutomationAddEventsFromBlockRange(
  services: LocalServices,
  start: number,
  end: number,
): Promise<Event[]> {
  const addEvents = services.tx.manyOrNone(
    `
    SELECT e.*, t.hash, b.timestamp FROM automation_bot.trigger_added_events e
    JOIN vulcan2x.transaction t ON e.tx_id = t.id
    JOIN vulcan2x.block b ON e.block_id = b.id
    WHERE e.block_id >= ${start} AND e.block_id <= ${end}
    `,
  );

  return addEvents;
}
export async function updateAutomationAddEventsWithGasFee(
  services: LocalServices,
  events: WithGasFee<Event>[],
): Promise<null> {
  const updateValues = events.map(({ id, gasFee }) => `(${gasFee.toString()},${id})`).join(',');

  return services.tx.none(
    `
      UPDATE automation_bot.trigger_added_events SET gas_fee = c.gas_fee
      FROM (values${updateValues}) AS c(gas_fee, id) 
      WHERE c.id = automation_bot.trigger_added_events.id;
    `,
  );
}

export async function updateAutomationRemoveEventsWithGasFee(
  services: LocalServices,
  events: WithGasFee<Event>[],
): Promise<null> {
  const updateValues = events.map(({ id, gasFee }) => `(${gasFee.toString()},${id})`).join(',');

  return services.tx.none(
    `
      UPDATE automation_bot.trigger_removed_events SET gas_fee = c.gas_fee
      FROM (values${updateValues}) AS c(gas_fee, id) 
      WHERE c.id = automation_bot.trigger_removed_events.id;
    `,
  );
}
