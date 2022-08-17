import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import {
  getExtractorName,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';

import { flatten, max, min } from 'lodash';
import { getGasFee } from '../../utils/getGasFee';
import {
  getAutomationAddEventsFromBlockRange,
  getAutomationRemoveEventsFromBlockRange,
  updateAutomationAddEventsWithGasFee,
  updateAutomationRemoveEventsWithGasFee,
  WithGasFee,
} from '../../utils/eventsDb';
import {
  getEventsToOSMPrice,
  updateAutomationAddEventsWithEthPrice,
  updateAutomationRemoveEventsWithEthPrice,
} from '../../utils/pricesDb';
import { getOpenCdpTransformerName } from './cdpManagerTransformer';
import { Event } from 'src/types/history';
import { getAutomationBotTransformerName } from './automationBotTransformer';


export const automationEventEnhancerEthPriceTransformerName = `automation-event-enhancer-transformer-eth-price`;

export const automationEventEnhancerTransformerEthPrice: (
  automationBot: SimpleProcessorDefinition,
  managers: SimpleProcessorDefinition[],
  oraclesTransformers: string[],
) => BlockTransformer = (
  automationBot,
  managers: SimpleProcessorDefinition[],
  oraclesTransformers,
) => {
  return {
    name: automationEventEnhancerEthPriceTransformerName,
    dependencies: [getExtractorName(automationBot.address)],
    transformerDependencies: [
      getAutomationBotTransformerName(automationBot.address),
      ...managers.map(getOpenCdpTransformerName),
      ...oraclesTransformers,
    ],
    startingBlock: automationBot.startingBlock,
    transform: async (services, _logs) => {
      const logs = flatten(_logs);
      if (logs.length === 0) {
        return;
      }
      const blocks = Array.from(new Set(logs.map(log => log.block_id)));

      const minBlock = min(blocks);
      const maxBlock = max(blocks);

      const addEvents = (
        await getAutomationAddEventsFromBlockRange(services, minBlock, maxBlock)
      ).map(event => ({
        ...event,
        token: 'ETH',
      }));
      const removeEvents = (
        await getAutomationAddEventsFromBlockRange(services, minBlock, maxBlock)
      ).map(event => ({
        ...event,
        token: 'ETH',
      }));
      if (addEvents.length !== 0) {
        const eventsToPrice = await getEventsToOSMPrice(services, addEvents);

        await updateAutomationAddEventsWithEthPrice(services, eventsToPrice);
      }
      if (removeEvents.length !== 0) {
        const eventsToPrice = await getEventsToOSMPrice(services, removeEvents);

        await updateAutomationRemoveEventsWithEthPrice(services, eventsToPrice);
      }
    },
  };
};

export const automationEventEnhancerGasPriceName = 'automationEventEnhancerGasPrice';

export const automationEventEnhancerGasPrice: (
  automationBot: SimpleProcessorDefinition,
  managers: SimpleProcessorDefinition[],
) => BlockTransformer = (automationBot, managers: SimpleProcessorDefinition[]) => {
  return {
    name: automationEventEnhancerGasPriceName,
    dependencies: [getExtractorName(automationBot.address)],
    transformerDependencies: [
      getAutomationBotTransformerName(automationBot.address),
      // add aggregator ?
    ],
    startingBlock: automationBot.startingBlock,
    transform: async (services, _logs) => {
      const logs = flatten(_logs);
      if (logs.length === 0) {
        return;
      }
      const blocks = Array.from(new Set(logs.map(log => log.block_id)));

      const minBlock = min(blocks);
      const maxBlock = max(blocks);

      const addEvents = await getAutomationAddEventsFromBlockRange(services, minBlock, maxBlock);
      const removeEvents = await getAutomationRemoveEventsFromBlockRange(
        services,
        minBlock,
        maxBlock,
      );

      if (addEvents.length !== 0) {
        const addEventsWithGasFees: WithGasFee<Event>[] = await Promise.all(
          addEvents.map(async event => {
            const gasFee = await getGasFee(services, event.hash);
            return { ...event, gasFee };
          }),
        );
        await updateAutomationAddEventsWithGasFee(services, addEventsWithGasFees);
      }

      if (removeEvents.length !== 0) {
        const removeEventsWithGasFees: WithGasFee<Event>[] = await Promise.all(
          removeEvents.map(async event => {
            const gasFee = await getGasFee(services, event.hash);
            return { ...event, gasFee };
          }),
        );

        await updateAutomationRemoveEventsWithGasFee(services, removeEventsWithGasFees);
      }
    },
  };
};
