import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { getExtractorName, SimpleProcessorDefinition } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';

import { flatten, max, min } from 'lodash';
import { getEventsFromBlockRange, getEventsFromRangeWithFrobIlk } from '../../utils/eventsDb';
import {
  addTokenFromIlk,
  getEventsToOSMPrice,
  updateEventsWithEthPrice,
  updateEventsWithOsmPrice,
} from '../../utils/pricesDb';
import { getOpenCdpTransformerName } from './cdpManagerTransformer';
import { getAuctions2TransformerName } from './dogTransformer';

export const eventEnhancerTransformerName = `event-enhancer-transformer-v2`;

export const eventEnhancerTransformer: (
  vat: SimpleProcessorDefinition,
  dog: SimpleProcessorDefinition,
  managers: SimpleProcessorDefinition[],
  oraclesTransformers: string[],
) => BlockTransformer = (vat, dog, managers, oraclesTransformers) => {
  return {
    name: eventEnhancerTransformerName,
    dependencies: [getExtractorName(vat.address)],
    transformerDependencies: [
      `vatCombineTransformerV2-${vat.address}`,
      `vatMoveEventsTransformerV2-${vat.address}`,
      getAuctions2TransformerName(dog),
      ...managers.map(getOpenCdpTransformerName),
      ...oraclesTransformers,
    ],
    startingBlock: vat.startingBlock,
    transform: async (services, _logs) => {
      const logs = flatten(_logs);
      if (logs.length === 0) {
        return;
      }
      const blocks = Array.from(new Set(logs.map(log => log.block_id)));

      const minBlock = min(blocks);
      const maxBlock = max(blocks);

      const events = (await getEventsFromRangeWithFrobIlk(services, minBlock, maxBlock)).map(
        addTokenFromIlk,
      );

      if (events.length === 0) {
        return;
      }

      const eventsToPrice = await getEventsToOSMPrice(services, events);

      await updateEventsWithOsmPrice(services, eventsToPrice);
    },
  };
};

export const eventEnhancerEthPriceTransformerName = `event-enhancer-transformer-eth-price`;

export const eventEnhancerTransformerEthPrice: (
  vat: SimpleProcessorDefinition,
  dog: SimpleProcessorDefinition,
  managers: SimpleProcessorDefinition[],
  oraclesTransformers: string[],
) => BlockTransformer = (vat, dog, managers: SimpleProcessorDefinition[], oraclesTransformers) => {
  return {
    name: eventEnhancerEthPriceTransformerName,
    dependencies: [getExtractorName(vat.address)],
    transformerDependencies: [
      `vatCombineTransformerV2-${vat.address}`,
      `vatMoveEventsTransformerV2-${vat.address}`,
      getAuctions2TransformerName(dog),
      ...managers.map(getOpenCdpTransformerName),
      ...oraclesTransformers,
    ],
    startingBlock: vat.startingBlock,
    transform: async (services, _logs) => {
      const logs = flatten(_logs);
      if (logs.length === 0) {
        return;
      }
      const blocks = Array.from(new Set(logs.map(log => log.block_id)));

      const minBlock = min(blocks);
      const maxBlock = max(blocks);

      const events = (await getEventsFromBlockRange(services, minBlock, maxBlock)).map(event => ({
        ...event,
        token: 'ETH',
      }));

      if (events.length === 0) {
        return;
      }

      const eventsToPrice = await getEventsToOSMPrice(services, events);

      await updateEventsWithEthPrice(services, eventsToPrice);
    },
  };
};
