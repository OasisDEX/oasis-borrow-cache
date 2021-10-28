import BigNumber from 'bignumber.js';
import {
  Aggregated,
  assertAllowedEvent,
  CommonEvent,
  MPAAggregatedEvent,
  MultiplyEvent,
} from '../types/multiplyHistory';
import { Event } from '../types/history';
import {
  getCollateralizationRatio,
  getMultiple,
  getLiquidationPrice,
  getNetValue,
} from './vaultParams';
import { zero } from './constants';

interface Dependencies {
  getTokenPrecision(tokenAddress: string): Promise<BigNumber>;
  getGasFee(hash: string): Promise<BigNumber>;
}

export async function parseMultiplyEvent(
  multiplyEvent: MPAAggregatedEvent,
  vaultEvents: Aggregated<Event>[],
  dependencies: Dependencies,
): Promise<MultiplyEvent> {
  const lastEvent: Aggregated<Event> = vaultEvents[vaultEvents.length - 1];
  assertAllowedEvent(lastEvent);

  const collateralChange = new BigNumber(lastEvent.collateral_amount);
  const debtChange = new BigNumber(lastEvent.dai_amount);

  const daiPrecision = new BigNumber(10).pow(18);
  const oraclePrice = new BigNumber(lastEvent.oracle_price);
  const oazoFee = new BigNumber(multiplyEvent.oazo_fee).div(daiPrecision);
  const loanFee = new BigNumber(multiplyEvent.due).minus(multiplyEvent.borrowed).div(daiPrecision);
  const liquidationRatio = new BigNumber(multiplyEvent.liquidation_ratio);
  const collateralTokenAddress =
    multiplyEvent.method_name === 'increaseMultiple' ||
    multiplyEvent.method_name === 'openMultiplyVault'
      ? multiplyEvent.asset_out
      : multiplyEvent.asset_in;

  const [gasFee, collateralTokenDecimals] = await Promise.all([
    dependencies.getGasFee(lastEvent.hash),
    dependencies.getTokenPrecision(collateralTokenAddress),
  ]);
  const collateralPrecision = new BigNumber(10).pow(collateralTokenDecimals);

  const collateralFromExchange =
    multiplyEvent.method_name === 'increaseMultiple' ||
    multiplyEvent.method_name === 'openMultiplyVault'
      ? new BigNumber(multiplyEvent.amount_out).div(collateralPrecision)
      : new BigNumber(multiplyEvent.amount_in).div(collateralPrecision);

  const daiFromExchange =
    multiplyEvent.method_name === 'increaseMultiple' ||
    multiplyEvent.method_name === 'openMultiplyVault'
      ? new BigNumber(multiplyEvent.amount_in).div(daiPrecision)
      : new BigNumber(multiplyEvent.amount_out).div(daiPrecision);

  const depositDai =
    multiplyEvent.method_name === 'increaseMultiple' ||
    multiplyEvent.method_name === 'openMultiplyVault'
      ? daiFromExchange.plus(oazoFee).minus(new BigNumber(multiplyEvent.borrowed).div(daiPrecision))
      : zero;

  const marketPrice = daiFromExchange.div(collateralFromExchange);

  const bought =
    multiplyEvent.method_name === 'increaseMultiple' ||
    multiplyEvent.method_name === 'openMultiplyVault'
      ? collateralFromExchange
      : zero;

  const sold =
    multiplyEvent.method_name === 'decreaseMultiple' ||
    multiplyEvent.method_name === 'closeVaultExitCollateral' ||
    multiplyEvent.method_name === 'closeVaultExitDai'
      ? collateralFromExchange
      : zero;

  const common: CommonEvent = {
    marketPrice,
    oraclePrice,
    beforeLockedCollateral: lastEvent.beforeLockedCollateral,
    lockedCollateral: lastEvent.lockedCollateral,
    beforeCollateralizationRatio: getCollateralizationRatio(
      lastEvent.beforeDebt,
      lastEvent.beforeLockedCollateral,
      oraclePrice,
    ),
    collateralizationRatio: getCollateralizationRatio(
      lastEvent.debt,
      lastEvent.lockedCollateral,
      oraclePrice,
    ),
    beforeDebt: lastEvent.beforeDebt,
    debt: lastEvent.debt,
    beforeMultiple: getMultiple(
      lastEvent.beforeDebt,
      lastEvent.beforeLockedCollateral,
      oraclePrice,
    ),
    multiple: getMultiple(lastEvent.debt, lastEvent.lockedCollateral, oraclePrice),
    beforeLiquidationPrice: getLiquidationPrice(
      lastEvent.beforeDebt,
      lastEvent.beforeLockedCollateral,
      liquidationRatio,
    ),
    liquidationRatio,
    liquidationPrice: getLiquidationPrice(
      lastEvent.debt,
      lastEvent.lockedCollateral,
      liquidationRatio,
    ),
    netValue: getNetValue(lastEvent.debt, lastEvent.lockedCollateral, marketPrice),

    oazoFee,
    loanFee,
    gasFee,
    totalFee: BigNumber.sum(oazoFee, loanFee),

    tx_id: multiplyEvent.tx_id,
    log_index: multiplyEvent.tx_id,
    block_id: multiplyEvent.block_id,
    urn: multiplyEvent.urn,

    standardEventId: lastEvent.id,
  };

  switch (multiplyEvent.method_name) {
    case 'openMultiplyVault':
      return {
        ...common,
        kind: 'OPEN_MULTIPLY_VAULT',
        bought,
        depositCollateral: collateralChange.minus(bought),
        depositDai,
      };
    case 'increaseMultiple':
      return {
        ...common,
        kind: 'INCREASE_MULTIPLE',
        bought,
        depositCollateral: collateralChange.minus(bought),
        depositDai,
      };
    case 'decreaseMultiple':
      return {
        ...common,
        kind: 'DECREASE_MULTIPLE',
        sold,
        withdrawnCollateral: collateralChange.minus(sold),
        withdrawnDai: daiFromExchange.plus(debtChange),
      };
    case 'closeVaultExitCollateral':
      return {
        ...common,
        kind: 'CLOSE_VAULT_TO_COLLATERAL',
        sold,
        exitCollateral: new BigNumber(multiplyEvent.collateral_left).div(collateralPrecision),
        debt: zero,
        lockedCollateral: zero,
      };
    case 'closeVaultExitDai':
      return {
        ...common,
        kind: 'CLOSE_VAULT_TO_DAI',
        sold,
        exitDai: new BigNumber(multiplyEvent.dai_left).div(daiPrecision),
        debt: zero,
        lockedCollateral: zero,
      };
  }
}
