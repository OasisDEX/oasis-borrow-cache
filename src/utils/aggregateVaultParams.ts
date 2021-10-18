import BigNumber from 'bignumber.js';
import { sortBy } from 'lodash';
import { Aggregated, isFrobEvent } from '../types/multiplyHistory';
import { Event } from '../types/history';
import { one, zero } from './constants';
import { getCollateralizationRatio } from './vaultParams';

function sumNormalizedDebt(total: BigNumber, event: Event): BigNumber {
  switch (event.kind) {
    case 'GENERATE':
    case 'PAYBACK':
    case 'WITHDRAW-PAYBACK':
    case 'DEPOSIT-GENERATE':
    case 'MOVE_DEST':
      let result = total.plus(new BigNumber(event.dai_amount).div(event.rate));
      return result.lt(one) ? zero : result
    case 'MOVE_SRC':
    case 'AUCTION_STARTED_V2':
    case 'AUCTION_STARTED':
      result = total.minus(new BigNumber(event.dai_amount).div(event.rate));
      return result.lt(one) ? zero : result
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
    case 'MOVE_DEST':
      return total.plus(event.collateral_amount);
    case 'MOVE_SRC':
    case 'AUCTION_STARTED_V2':
    case 'AUCTION_STARTED':
      return total.minus(event.collateral_amount);
    default:
      return total;
  }
}

export function aggregateVaultParams(events: Event[], eventsBefore: Event[]): Aggregated<Event>[] {
  const debtBeforeBatch = eventsBefore.reduce(sumNormalizedDebt, zero);
  const lockedCollateralBeforeBatch = eventsBefore.reduce(sumCollateral, zero);

  const sortedEvents = sortBy(
    events,
    event => event.block_id,
    event => event.log_index,
  );

  return sortedEvents.reduce((acc, event) => {
    const previousEvent: Aggregated<Event> | undefined = acc[acc.length - 1];
    const beforeDebt = previousEvent ? previousEvent.debt : debtBeforeBatch;
    const beforeLockedCollateral = previousEvent
      ? previousEvent.lockedCollateral
      : lockedCollateralBeforeBatch;
    const debt = sumNormalizedDebt(beforeDebt, event);
    const lockedCollateral = sumCollateral(beforeLockedCollateral, event);

    const aggregatedEvent = {
      ...event,
      beforeDebt,
      debt,
      beforeLockedCollateral,
      lockedCollateral,
      beforeCollateralizationRatio: isFrobEvent(event)
        ? getCollateralizationRatio(
            beforeDebt,
            beforeLockedCollateral,
            new BigNumber(event.oracle_price),
          )
        : null,
      collateralizationRatio: isFrobEvent(event)
        ? getCollateralizationRatio(debt, lockedCollateral, new BigNumber(event.oracle_price))
        : null,
    };

    return [...acc, aggregatedEvent];
  }, [] as Aggregated<Event>[]);
}
