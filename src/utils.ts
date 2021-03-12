import { SimpleProcessorDefinition } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';

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
