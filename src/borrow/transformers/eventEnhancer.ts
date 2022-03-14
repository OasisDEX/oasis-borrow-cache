import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import {
  getExtractorName,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';

import { flatten, max, min } from 'lodash';
import { getGasFee } from '../../utils/getGasFee';
import {
  addTokenToEvent,
  getEventsFromBlockRange,
  getEventsFromRange,
  updateEventsWithGasFee,
  WithGasFee,
} from '../../utils/eventsDb';
import {
  getEventsToOSMPrice,
  updateEventsWithEthPrice,
  updateEventsWithOsmPrice,
} from '../../utils/pricesDb';
import { getOpenCdpTransformerName } from './cdpManagerTransformer';
import { getAuctions2TransformerName } from './dogTransformer';
import { getVatCombineTransformerName, getVatMoveTransformerName } from './vatTransformer';
import { Event } from 'src/types/history';
import { multiplyHistoryTransformerName } from './multiplyHistoryTransformer';
import { isDefined } from '../../utils/isDefined';
import { getTriggerEventsCombineTransformerName } from './automationBotTransformer';

export const eventEnhancerTransformerName = `event-enhancer-transformer-v2`;

export const eventEnhancerTransformer: (
  vat: SimpleProcessorDefinition,
  dog: SimpleProcessorDefinition,
  automationBot: SimpleProcessorDefinition | undefined,
  managers: SimpleProcessorDefinition[],
  oraclesTransformers: string[],
) => BlockTransformer = (vat, dog, automationBot, managers, oraclesTransformers) => {
  return {
    name: eventEnhancerTransformerName,
    dependencies: [getExtractorName(vat.address), getExtractorName(dog.address)],
    transformerDependencies: [
      getVatCombineTransformerName(vat),
      getVatMoveTransformerName(vat),
      getAuctions2TransformerName(dog),
      automationBot ? getTriggerEventsCombineTransformerName(automationBot) : getTriggerEventsCombineTransformerName({address: 'UNAVAILABLE_FOR_THAT_NETWORK', startingBlock: 0}), // TODO clean it when possible ~ŁW
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

      const events = (await getEventsFromRange(services, minBlock, maxBlock))
        .map(addTokenToEvent)
        .filter(isDefined);

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
  automationBot: SimpleProcessorDefinition | undefined,
  managers: SimpleProcessorDefinition[],
  oraclesTransformers: string[],
) => BlockTransformer = (vat, dog, automationBot, managers: SimpleProcessorDefinition[], oraclesTransformers) => {
  return {
    name: eventEnhancerEthPriceTransformerName,
    dependencies: [getExtractorName(vat.address)],
    transformerDependencies: [
      getVatCombineTransformerName(vat),
      getVatMoveTransformerName(vat),
      getAuctions2TransformerName(dog),
      automationBot ? getTriggerEventsCombineTransformerName(automationBot) : getTriggerEventsCombineTransformerName({address: 'UNAVAILABLE_FOR_THAT_NETWORK', startingBlock: 0}), // TODO clean it when possible ~ŁW
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

export const eventEnhancerGasPriceName = 'eventEnhancerGasPrice';

function isVatEvent(event: Event): boolean {
  return [
    'DEPOSIT',
    'GENERATE',
    'DEPOSIT-GENERATE',
    'WITHDRAW',
    'PAYBACK',
    'WITHDRAW-PAYBACK',
  ].includes(event.kind);
}

export const eventEnhancerGasPrice: (
  vat: SimpleProcessorDefinition,
  managers: SimpleProcessorDefinition[],
  automationBot: SimpleProcessorDefinition | undefined,
) => BlockTransformer = (vat, managers: SimpleProcessorDefinition[], automationBot) => {
  return {
    name: eventEnhancerGasPriceName,
    dependencies: [getExtractorName(vat.address)],
    transformerDependencies: [
      getVatCombineTransformerName(vat),
      ...managers.map(getOpenCdpTransformerName),
      multiplyHistoryTransformerName,
      automationBot ? getTriggerEventsCombineTransformerName(automationBot) : getTriggerEventsCombineTransformerName({address: 'UNAVAILABLE_FOR_THAT_NETWORK', startingBlock: 0}), // TODO clean it when possible ~ŁW
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

      const events = (await getEventsFromBlockRange(services, minBlock, maxBlock)).filter(
        isVatEvent,
      );

      if (events.length === 0) {
        return;
      }

      const eventsWithGasFees: WithGasFee<Event>[] = await Promise.all(
        events.map(async event => {
          const gasFee = await getGasFee(services, event.hash);
          return { ...event, gasFee };
        }),
      );

      await updateEventsWithGasFee(services, eventsWithGasFees);
    },
  };
};
