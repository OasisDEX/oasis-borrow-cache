import BigNumber from 'bignumber.js';
import { zero } from './constants';

export function getCollateralizationRatio(
  debt: BigNumber,
  collateral: BigNumber,
  osmPrice: BigNumber,
): BigNumber {
  if (debt.eq(zero)) {
    return zero;
  }
  return collateral.times(osmPrice).div(debt);
}

export function getLiquidationPrice(
  debt: BigNumber,
  collateral: BigNumber,
  liquidationRatio: BigNumber,
): BigNumber {
  if (collateral.eq(zero)) {
    return zero;
  }
  return liquidationRatio.times(debt).div(collateral);
}

export function getMultiple(
  debt: BigNumber,
  collateral: BigNumber,
  osmPrice: BigNumber,
): BigNumber {
  const lockedCollateralUSD = collateral.times(osmPrice);
  if (lockedCollateralUSD.eq(zero)) {
    return zero;
  }
  return lockedCollateralUSD.div(lockedCollateralUSD.minus(debt));
}

export function getNetValue(
  debt: BigNumber,
  collateral: BigNumber,
  marketPrice: BigNumber,
): BigNumber {
  const lockedCollateralUSD = collateral.times(marketPrice);
  if (lockedCollateralUSD.eq(zero)) {
    return zero;
  }
  return lockedCollateralUSD.minus(debt);
}
