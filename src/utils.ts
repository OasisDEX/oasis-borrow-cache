import { SimpleProcessorDefinition } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { isString } from 'util';

export function normalizeAddressDefinition(
  def: string | SimpleProcessorDefinition,
): SimpleProcessorDefinition {
  if (isString(def)) {
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
