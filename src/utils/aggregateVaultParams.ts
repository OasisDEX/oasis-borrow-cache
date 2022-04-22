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
      return total.plus(new BigNumber(event.dai_amount).div(event.rate));
    case 'MOVE_SRC':
      return total.minus(new BigNumber(event.dai_amount).div(event.rate));
    case 'AUCTION_STARTED_V2':
    case 'AUCTION_STARTED':
      return zero;
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

function getValidDebt(debt: BigNumber): BigNumber {
  return debt.lte(one) ? zero : debt;
}

export function aggregateVaultParams(
  events: Event[],
  initialDebt: BigNumber,
  initialCollateral: BigNumber,
): Aggregated<Event>[] {
  const sortedEvents = sortBy(
    events,
    event => event.block_id,
    event => event.log_index,
  );

  return sortedEvents.reduce((acc, event) => {
    const previousEvent: Aggregated<Event> | undefined = acc[acc.length - 1];
    const beforeDebt = getValidDebt(previousEvent ? previousEvent.debt : initialDebt);
    const beforeLockedCollateral = previousEvent
      ? previousEvent.lockedCollateral
      : initialCollateral;
    const debt = getValidDebt(sumNormalizedDebt(beforeDebt, event));
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
            new BigNumber(event.rate),
          )
        : null,
      collateralizationRatio: isFrobEvent(event)
        ? getCollateralizationRatio(
            debt,
            lockedCollateral,
            new BigNumber(event.oracle_price),
            new BigNumber(event.rate),
          )
        : null,
    };

    return [...acc, aggregatedEvent];
  }, [] as Aggregated<Event>[]);
}
