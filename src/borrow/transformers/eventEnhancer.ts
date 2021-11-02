import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { getExtractorName } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';

import { flatten, max, min } from 'lodash';
import { getEventsFromRangeWithFrobIlk } from 'src/utils/eventsDb';
import { addTokenFromIlk, getEventsToOSMPrice, updateEventsWithOsmPrice } from '../../utils/pricesDb';

export const eventEnhancerTransformerName = `event-enhancer-transformer`;

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
