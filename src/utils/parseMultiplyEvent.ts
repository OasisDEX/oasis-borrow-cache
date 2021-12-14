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
import { daiPrecision, ethPrecision, zero } from './constants';

interface Dependencies {
  getTokenPrecision(tokenAddress: string): Promise<BigNumber>;
  getGasFee(hash: string): Promise<BigNumber>;
  getDaiTransfer(txId: number): Promise<BigNumber>
}

const isEventNameIncreaseOrOpen = function(name: string): boolean {
  return (
    name === 'increaseMultiple' ||
    name === 'openMultiplyVault' ||
    name === 'openMultiplyGuniVault' ||
    name === 'increaseMultipleGuni'
  );
};

const isEventNameDecreaseOrClose = function(name: string): boolean {
  return (
    name === 'decreaseMultiple' ||
    name === 'closeVaultExitCollateral' ||
    name === 'closeVaultExitDai' ||
    name === 'closeGuniVaultExitDai'
  );
};

export async function parseMultiplyEvent(
  multiplyEvent: MPAAggregatedEvent,
  vaultEvents: Aggregated<Event>[],
  dependencies: Dependencies,
): Promise<MultiplyEvent> {
  const lastEvent: Aggregated<Event> = vaultEvents[vaultEvents.length - 1];
  assertAllowedEvent(lastEvent);

  const collateralChange = new BigNumber(lastEvent.collateral_amount);


  const oraclePrice = new BigNumber(lastEvent.oracle_price);
  const oazoFee = new BigNumber(multiplyEvent.oazo_fee).div(daiPrecision);
  const loanFee = new BigNumber(multiplyEvent.due).minus(multiplyEvent.borrowed).div(daiPrecision);
  const liquidationRatio = new BigNumber(multiplyEvent.liquidation_ratio);
  const collateralTokenAddress = isEventNameIncreaseOrOpen(multiplyEvent.method_name)
    ? multiplyEvent.asset_out
    : multiplyEvent.asset_in;

  const [rawGasFee, collateralTokenDecimals, guniDaiTransfer] = await Promise.all([
    dependencies.getGasFee(lastEvent.hash),
    dependencies.getTokenPrecision(collateralTokenAddress),
    dependencies.getDaiTransfer(multiplyEvent.tx_id)
  ]);

  const gasFee = rawGasFee.div(ethPrecision)
  const collateralPrecision = new BigNumber(10).pow(collateralTokenDecimals);
  const collateralFromExchange = isEventNameIncreaseOrOpen(multiplyEvent.method_name)
    ? new BigNumber(multiplyEvent.amount_out).div(collateralPrecision)
    : new BigNumber(multiplyEvent.amount_in).div(collateralPrecision);

  const daiFromExchange = isEventNameIncreaseOrOpen(multiplyEvent.method_name)
    ? new BigNumber(multiplyEvent.amount_in).div(daiPrecision)
    : new BigNumber(multiplyEvent.amount_out).div(daiPrecision);

  const depositDai = isEventNameIncreaseOrOpen(multiplyEvent.method_name)
    ? daiFromExchange.plus(oazoFee).minus(new BigNumber(multiplyEvent.borrowed).div(daiPrecision))
    : zero;

  const marketPrice = daiFromExchange.div(collateralFromExchange);

  const bought = isEventNameIncreaseOrOpen(multiplyEvent.method_name)
    ? collateralFromExchange
    : zero;

  const sold = isEventNameDecreaseOrClose(multiplyEvent.method_name)
    ? collateralFromExchange
    : zero;

  const common: CommonEvent = {
    marketPrice,
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
    totalFee: BigNumber.sum(oazoFee, loanFee, gasFee),

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
    case 'openMultiplyGuniVault':
      return {
        ...common,
        kind: 'OPEN_MULTIPLY_GUNI_VAULT',
        depositDai: guniDaiTransfer,
        depositCollateral: collateralChange,
        bought,
        netValue: getNetValue(lastEvent.debt, lastEvent.lockedCollateral, oraclePrice),
      };
    case 'increaseMultipleGuni':
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
        withdrawnCollateral: new BigNumber(multiplyEvent.collateral_left).div(collateralPrecision),
        withdrawnDai: new BigNumber(multiplyEvent.dai_left).div(daiPrecision), // TODO: ask @Adam
      };
    case 'closeVaultExitCollateral':
      return {
        ...common,
        kind: 'CLOSE_VAULT_TO_COLLATERAL',
        sold,
        exitCollateral: new BigNumber(multiplyEvent.collateral_left).div(collateralPrecision),
        exitDai: new BigNumber(multiplyEvent.dai_left).div(daiPrecision),
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
    case 'closeGuniVaultExitDai':
      return {
        ...common,
        kind: 'CLOSE_GUNI_VAULT_TO_DAI',
        sold,
        exitDai: new BigNumber(multiplyEvent.dai_left).div(daiPrecision),
        debt: zero,
        lockedCollateral: zero,
      };
  }
}
