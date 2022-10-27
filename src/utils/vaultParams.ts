import BigNumber from 'bignumber.js';
import { zero } from './constants';

export function getCollateralizationRatio(
  debt: BigNumber,
  collateral: BigNumber,
  osmPrice: BigNumber,
  rate: BigNumber,
): BigNumber {
  if (debt.eq(zero)) {
    return zero;
  }
  return collateral.times(osmPrice).div(debt.times(rate));
}

export function getLiquidationPrice(
  debt: BigNumber,
  collateral: BigNumber,
  liquidationRatio: BigNumber,
  rate: BigNumber,
): BigNumber {
  if (collateral.eq(zero)) {
    return zero;
  }
  return liquidationRatio.times(debt.times(rate)).div(collateral);
}

export function getMultiple(
  debt: BigNumber,
  collateral: BigNumber,
  osmPrice: BigNumber,
  rate: BigNumber,
): BigNumber {
  const lockedCollateralUSD = collateral.times(osmPrice);
  if (lockedCollateralUSD.eq(zero)) {
    return zero;
  }
  return lockedCollateralUSD.div(lockedCollateralUSD.minus(debt.times(rate)));
}

export function getNetValue(
  debt: BigNumber,
  collateral: BigNumber,
  marketPrice: BigNumber,
  rate: BigNumber,
): BigNumber {
  const lockedCollateralUSD = collateral.times(marketPrice);
  if (lockedCollateralUSD.eq(zero)) {
    return zero;
  }
  return lockedCollateralUSD.minus(debt.times(rate));
}
