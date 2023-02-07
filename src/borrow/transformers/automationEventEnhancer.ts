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
import { Event } from 'src/types/history';
import {
  automationBotExecutedTransformerName, automationBotV2ExecutedTransformerName,
  getAutomationBotExecutedTransformerName,
} from './automationBotExecutedTransformer';

export const automationEventEnhancerEthPriceTransformerName = `automation-event-enhancer-transformer-eth-price`;
export const automationV2EventEnhancerEthPriceTransformerName = `automation-v2-event-enhancer-transformer-eth-price`;

export const automationEventEnhancerTransformerEthPrice: (
  automationBotExecutedTransformer: SimpleProcessorDefinition,
  oraclesTransformers: string[],
  name: string,
  executedTransformerName: string,
) => BlockTransformer = (automationBotExecutedTransformer, oraclesTransformers, name, executedTransformerName) => {
  return {
    name,
    dependencies: [getExtractorName(automationBotExecutedTransformer.address)],
    transformerDependencies: [
      getAutomationBotExecutedTransformerName(automationBotExecutedTransformer.address, executedTransformerName),
      ...oraclesTransformers,
    ],
    startingBlock: automationBotExecutedTransformer.startingBlock,
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
        await getAutomationRemoveEventsFromBlockRange(services, minBlock, maxBlock)
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
export const automationV2EventEnhancerGasPriceName = 'automationV2EventEnhancerGasPrice';

export const automationEventEnhancerGasPrice: (
  automationBotExecutedTransformer: SimpleProcessorDefinition,
  name: string,
  executedTransformerName: string,
) => BlockTransformer = (automationBotExecutedTransformer, name, executedTransformerName) => {
  return {
    name,
    dependencies: [getExtractorName(automationBotExecutedTransformer.address)],
    transformerDependencies: [
      getAutomationBotExecutedTransformerName(automationBotExecutedTransformer.address, executedTransformerName),
    ],
    startingBlock: automationBotExecutedTransformer.startingBlock,
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


export const automationEventEnhancerGasPriceV1 = (
  automationBotExecutedTransformer: SimpleProcessorDefinition
)  => {
  return automationEventEnhancerGasPrice(
    automationBotExecutedTransformer,
    automationEventEnhancerGasPriceName,
    automationBotExecutedTransformerName
  )
}

export const automationEventEnhancerGasPriceV2 = (
  automationBotExecutedTransformer: SimpleProcessorDefinition
) => {
  return automationEventEnhancerGasPrice(
    automationBotExecutedTransformer,
    automationV2EventEnhancerGasPriceName,
    automationBotV2ExecutedTransformerName
  )
}

export const automationEventEnhancerTransformerEthPriceV1 = (
  automationBotExecutedTransformer: SimpleProcessorDefinition,
  oraclesTransformers: string[],
) => {
  return automationEventEnhancerTransformerEthPrice(
    automationBotExecutedTransformer,
    oraclesTransformers,
    automationEventEnhancerEthPriceTransformerName,
    automationBotExecutedTransformerName
  )
}

export const automationEventEnhancerTransformerEthPriceV2 = (
  automationBotExecutedTransformer: SimpleProcessorDefinition,
  oraclesTransformers: string[],
) => {
  return automationEventEnhancerTransformerEthPrice(
    automationBotExecutedTransformer,
    oraclesTransformers,
    automationV2EventEnhancerEthPriceTransformerName,
    automationBotV2ExecutedTransformerName
  )
}