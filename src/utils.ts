import { SimpleProcessorDefinition } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { SpockConfig } from '@oasisdex/spock-etl/dist/services/config';

import config from './config';
export function normalizeAddressDefinition(
  def: string | SimpleProcessorDefinition,
): SimpleProcessorDefinition {
  if (typeof def === 'string') {
    return {
      address: def,
      startingBlock: undefined,
    };
  }
  return {
    address: def.address,
    startingBlock: def.startingBlock,
  };
}

export function getAddressesFromConfig(services: { config: SpockConfig }) {
  return ((services.config as any) as typeof config).addresses;
}