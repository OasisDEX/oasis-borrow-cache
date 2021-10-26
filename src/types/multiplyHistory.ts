import { BigNumber } from 'bignumber.js';
import { Event } from './history';

export type Aggregated<T> = T & {
  beforeDebt: BigNumber;
  debt: BigNumber;
  beforeLockedCollateral: BigNumber;
  lockedCollateral: BigNumber;
  beforeCollateralizationRatio: BigNumber | null;
  collateralizationRatio: BigNumber | null;
};

const allowedStandardEvents = [
  'DEPOSIT',
  'DEPOSIT-GENERATE',
  'WITHDRAW',
  'WITHDRAW-PAYBACK',
  'GENERATE',
  'PAYBACK',
] as const;
export type AllowedEventsKey = typeof allowedStandardEvents[number];
export type FilterByKind<E extends { kind: string }, K extends string> = E extends any
  ? E['kind'] extends K
    ? E
    : never
  : never;
export type FrobEvents = FilterByKind<Aggregated<Event>, AllowedEventsKey>;

export function isFrobEvent<E extends Event>(event: E): event is FilterByKind<E, AllowedEventsKey> {
  return allowedStandardEvents.includes(event.kind as any);
}

export function assertAllowedEvent(event: Aggregated<Event>): asserts event is FrobEvents {
  if (!allowedStandardEvents.includes(event.kind as any)) {
    throw new Error(`${event.kind} event cannot be combined with multiplyEvent`);
  }
}

export interface CommonEvent {
  marketPrice: BigNumber;
  oraclePrice: BigNumber;

  beforeDebt: BigNumber;
  debt: BigNumber;

  beforeLockedCollateral: BigNumber;
  lockedCollateral: BigNumber;

  beforeCollateralizationRatio: BigNumber;
  collateralizationRatio: BigNumber;

  multiple: BigNumber;
  beforeMultiple: BigNumber;

  urn: string;
  log_index: number;
  tx_id: number;
  block_id: number;

  netValue: BigNumber;

  liquidationRatio: BigNumber;
  beforeLiquidationPrice: BigNumber;
  liquidationPrice: BigNumber;

  loanFee: BigNumber;
  oazoFee: BigNumber;
  totalFee: BigNumber;
  gasFee: BigNumber; // in wei
}

interface OpenMultiplyEvent extends CommonEvent {
  kind: 'OPEN_MULTIPLY_VAULT';
  depositCollateral: BigNumber;
  depositDai: BigNumber;
  bought: BigNumber;
}

interface IncreaseMultiplyEvent extends CommonEvent {
  kind: 'INCREASE_MULTIPLE';
  depositCollateral: BigNumber;
  depositDai: BigNumber;
  bought: BigNumber;
}

interface DecreaseMultiplyEvent extends CommonEvent {
  kind: 'DECREASE_MULTIPLE';
  withdrawnCollateral: BigNumber;
  withdrawnDai: BigNumber;
  sold: BigNumber;
}

interface CloseVaultToDaiEvent extends CommonEvent {
  kind: 'CLOSE_VAULT_TO_DAI';
  sold: BigNumber;
  exitDai: BigNumber;
}

interface CloseVaultToCollateralEvent extends CommonEvent {
  kind: 'CLOSE_VAULT_TO_COLLATERAL';
  sold: BigNumber;
  exitCollateral: BigNumber;
}

export type MultiplyEvent =
  | OpenMultiplyEvent
  | IncreaseMultiplyEvent
  | DecreaseMultiplyEvent
  | CloseVaultToDaiEvent
  | CloseVaultToCollateralEvent;

export type MultiplyMethods =
  | 'openMultiplyVault'
  | 'increaseMultiple'
  | 'decreaseMultiple'
  | 'openMultiplyVault'
  | 'closeVaultExitCollateral'
  | 'closeVaultExitDai';

export interface MPAAggregatedEvent {
  id: number;
  method_name: MultiplyMethods;
  cdp_id: string;
  ilk: string;
  liquidation_ratio: number;
  swap_min_amount: number;
  swap_optimist_amount: number;
  collateral_left: 0;
  dai_left: number;
  borrowed: number;
  due: number;
  asset_in: string;
  asset_out: string;
  amount_in: number;
  amount_out: number;
  beneficiary: string;
  oazo_fee: number;
  minimum_possible: number;
  urn: string;
  actual_amount: number;

  log_index: number;
  tx_id: number;
  block_id: number;
}

const buyingCollateralEvents = ['OPEN_MULTIPLY_VAULT', 'INCREASE_MULTIPLE'] as const;
export function isBuyingCollateral(
  event: MultiplyEvent,
): event is FilterByKind<MultiplyEvent, typeof buyingCollateralEvents[number]> {
  return buyingCollateralEvents.includes(event.kind as any);
}
