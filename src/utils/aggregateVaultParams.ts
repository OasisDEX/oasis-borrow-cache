import BigNumber from 'bignumber.js';
import { sortBy } from 'lodash';
import { Aggregated } from '../types/multiplyHistory';
import { Event } from '../types/history';
import { zero } from './constants';

function sumNormalizedDebt(total: BigNumber, event: Event): BigNumber {
  switch (event.kind) {
    case 'GENERATE':
    case 'PAYBACK':
    case 'WITHDRAW-PAYBACK':
    case 'DEPOSIT-GENERATE':
    case 'MOVE_DESC':
      return total.plus(new BigNumber(event.dai_amount).div(event.rate));
    case 'MOVE_SRC':
    case 'AUCTION_STARTED_V2':
      return total;
    case 'AUCTION_STARTED':
      return total.minus(new BigNumber(event.dai_amount).div(event.rate));
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
    event => event.log_index
  );

  return sortedEvents.reduce((acc, event) => {
    const previousEvent: Aggregated<Event> | undefined = acc[acc.length - 1];
    const beforeDebt = previousEvent ? previousEvent.debt : debtBeforeBatch;
    const beforeLockedCollateral = previousEvent ? previousEvent.lockedCollateral : lockedCollateralBeforeBatch;

    const aggregatedEvent = {
      ...event,
      beforeDebt,
      debt: sumNormalizedDebt(beforeDebt, event),
      beforeLockedCollateral,
      lockedCollateral: sumCollateral(beforeLockedCollateral, event)
    };

    return [...acc, aggregatedEvent];
  }, [] as Aggregated<Event>[]);
}
