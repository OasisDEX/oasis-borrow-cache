import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { getExtractorName } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';

import { flatten, max, min } from 'lodash';
import { getEventsFromBlockRange, getEventsFromRangeWithFrobIlk } from '../../utils/eventsDb';
import { addTokenFromIlk, getEventsToOSMPrice, updateEventsWithEthPrice, updateEventsWithOsmPrice } from '../../utils/pricesDb';

export const eventEnhancerTransformerName = `event-enhancer-transformer-v2`;

export const eventEnhancerTransformer: (
  vatAddress: string,
  startingBlock: number,
  oraclesTransformers: string[],
) => BlockTransformer = (vatAddress, startingBlock, oraclesTransformers) => {
  return {
    name: eventEnhancerTransformerName,
    dependencies: [getExtractorName(vatAddress)],
    transformerDependencies: [
      `vatCombineTransformerV2-${vatAddress}`,
      `vatMoveEventsTransformerV2-${vatAddress}`,
      ...oraclesTransformers,
    ],
    startingBlock: startingBlock,
    transform: async (services, _logs) => {
      const logs = flatten(_logs);
      if (logs.length === 0) {
        return;
      }
      const blocks = Array.from(new Set(logs.map(log => log.block_id)));

      const minBlock = min(blocks);
      const maxBlock = max(blocks);

      const events = (await getEventsFromRangeWithFrobIlk(services, minBlock, maxBlock)).map(addTokenFromIlk)

      if (events.length === 0) {
        return;
      }

      const eventsToPrice = await getEventsToOSMPrice(services, events)

      await updateEventsWithOsmPrice(services, eventsToPrice)
    },
  };
};

export const eventEnhancerEthPriceTransformerName = `event-enhancer-transformer-eth-price`;

export const eventEnhancerTransformerEthPrice: (
  vatAddress: string,
  startingBlock: number,
  oraclesTransformers: string[],
) => BlockTransformer = (vatAddress, startingBlock, oraclesTransformers) => {
  return {
    name: eventEnhancerEthPriceTransformerName,
    dependencies: [getExtractorName(vatAddress)],
    transformerDependencies: [
      `vatCombineTransformerV2-${vatAddress}`,
      `vatMoveEventsTransformerV2-${vatAddress}`,
      ...oraclesTransformers,
    ],
    startingBlock: startingBlock,
    transform: async (services, _logs) => {
      const logs = flatten(_logs);
      if (logs.length === 0) {
        return;
      }
      const blocks = Array.from(new Set(logs.map(log => log.block_id)));

      const minBlock = min(blocks);
      const maxBlock = max(blocks);

      const events = (await getEventsFromBlockRange(services, minBlock, maxBlock)).map(event => ({...event, token: 'ETH'}))

      if (events.length === 0) {
        return;
      }

      const eventsToPrice = await getEventsToOSMPrice(services, events)

      await updateEventsWithEthPrice(services, eventsToPrice)
    },
  };
};