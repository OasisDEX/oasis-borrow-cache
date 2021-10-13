import BigNumber from 'bignumber.js';

const zero = new BigNumber(0)

export function getCollateralizationRatio(debt: BigNumber, collateral: BigNumber, osmPrice: BigNumber) {
  if (debt.eq(zero)) {
    return zero;
  }
  return collateral.times(osmPrice).div(debt);
}
export function getLiquidationPrice(debt: BigNumber, collateral: BigNumber, liquidationRatio: BigNumber) {
  if (collateral.eq(zero)) {
    return zero;
  }
  return liquidationRatio.times(debt).div(collateral);
}
export function getMultiple(debt: BigNumber, collateral: BigNumber, osmPrice: BigNumber) {
  const lockedCollateralUSD = collateral.times(osmPrice);
  if (lockedCollateralUSD.eq(zero)) {
    return zero;
  }
  return lockedCollateralUSD.div(lockedCollateralUSD.minus(debt));
}
export function getNetValue(debt: BigNumber, collateral: BigNumber, osmPrice: BigNumber) {
  const lockedCollateralUSD = collateral.times(osmPrice);
  if (lockedCollateralUSD.eq(zero)) {
    return zero;
  }
  return lockedCollateralUSD.minus(debt);
}
