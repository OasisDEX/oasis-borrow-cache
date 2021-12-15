import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import {
  getExtractorName,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { flatten, groupBy, max, min } from 'lodash';
import { Aggregated, MPAAggregatedEvent, MultiplyEvent } from '../../types/multiplyHistory';
import { Event } from '../../types/history';
import { getAuctions2TransformerName } from './dogTransformer';
import {
  eventEnhancerTransformerName,
  eventEnhancerEthPriceTransformerName,
} from './eventEnhancer';
import { getMultiplyTransformerName } from './multiply';
import { getTokenPrecision } from '../../utils/getTokenPrecision';
import { aggregateVaultParams } from '../../utils/aggregateVaultParams';
import { parseMultiplyEvent } from '../../utils/parseMultiplyEvent';
import { getGasFee } from '../../utils/getGasFee';
import {
  getEventsFromBlockRange,
  getCombinedMultiplyEvents,
  MultiplyEventDb,
  getLastExtendedEventBeforeBatch,
  eventToDbFormat,
  saveEventsToDb,
} from '../../utils/eventsDb';
import { zero } from '../../utils/constants';
import { BigNumber } from 'bignumber.js';
import { getDaiTransfer } from '../../utils/getDaiTransfer';
import { getExchangeTransformerName } from './exchange';

export const multiplyHistoryTransformerName = `multiply-history`;

export const multiplyHistoryTransformer: (
  vatAddress: string,
  dependencies: {
    dogs: SimpleProcessorDefinition[];
    multiplyProxyActionsAddress: SimpleProcessorDefinition[];
    exchangeAddress: SimpleProcessorDefinition[];
  },
) => BlockTransformer = (vatAddress, dependencies) => {
  return {
    name: multiplyHistoryTransformerName,
    dependencies: [getExtractorName(vatAddress)],
    transformerDependencies: [
      eventEnhancerTransformerName,
      eventEnhancerEthPriceTransformerName,
      ...dependencies.dogs.map(dog => getAuctions2TransformerName(dog)),
      ...dependencies.multiplyProxyActionsAddress.map(mpa => getMultiplyTransformerName(mpa)),
      ...dependencies.exchangeAddress.map(exchange => getExchangeTransformerName(exchange)),
    ],
    transform: async (services, _logs) => {
      const logs = flatten(_logs);
      if (logs.length === 0) {
        return;
      }

      const blocks = Array.from(new Set(logs.map(log => log.block_id)));
      const minBlock: number = min(blocks);
      const maxBlock: number = max(blocks);

      const events: Event[] = await getEventsFromBlockRange(services, minBlock, maxBlock);

      if (events.length === 0) {
        return;
      }

      const multiplyEvents: MPAAggregatedEvent[] = await getCombinedMultiplyEvents(
        services,
        minBlock,
        maxBlock,
      );

      const uniqueUrns = Array.from(new Set(events.map(event => event.urn)));

      const lastEventsBeforeBatch: MultiplyEventDb[] | null = await getLastExtendedEventBeforeBatch(
        services,
        minBlock,
        uniqueUrns,
      );

      const eventByUrn = groupBy(events, 'urn');
      const multiplyEventsByUrn = groupBy(multiplyEvents, 'urn');
      const lastEventsBeforeBatchByUrn = groupBy(lastEventsBeforeBatch, 'urn');

      const extendedEvents = await Object.entries(eventByUrn).reduce(
        async (allEvents, [urn, urnEvents]) => {
          const urnMultiplyEvents = multiplyEventsByUrn[urn] || [];
          const urnLastEvent = lastEventsBeforeBatchByUrn[urn]
            ? lastEventsBeforeBatchByUrn[urn][0]
            : undefined;
          const initialDebt = new BigNumber(urnLastEvent?.debt || zero);
          const initialCollateral = new BigNumber(urnLastEvent?.locked_collateral || zero);

          const extendedEvents = aggregateVaultParams(urnEvents, initialDebt, initialCollateral);

          const multiplyEventsByTx = groupBy(urnMultiplyEvents, 'tx_id');
          const extendedEventsByTx = groupBy(extendedEvents, 'tx_id');

          const result = Object.entries(extendedEventsByTx).reduce(
            async (eventsForUrn, [txId, events]) => {
              const txMultiplyEvents = multiplyEventsByTx[txId] || [];

              if (txMultiplyEvents.length === 0) {
                return [...(await eventsForUrn), ...events];
              }
              if (txMultiplyEvents.length === 1) {
                const multiplyEvent = txMultiplyEvents[0];
                return [
                  ...(await eventsForUrn),
                  await parseMultiplyEvent(multiplyEvent, events, {
                    getTokenPrecision: address => getTokenPrecision(services, address),
                    getGasFee: hash => getGasFee(services, hash),
                    getDaiTransfer: (txId) => getDaiTransfer(services, txId)
                  }),
                ];
              }
              throw new Error('Two multiply events in one transaction');
            },
            Promise.resolve([]) as Promise<(Aggregated<Event> | MultiplyEvent)[]>,
          );

          return [...(await allEvents), ...(await result)];
        },
        Promise.resolve([]) as Promise<(Aggregated<Event> | MultiplyEvent)[]>,
      );

      const values = extendedEvents.map(eventToDbFormat);

      await saveEventsToDb(services, values);
    },
  };
};
