import { Dictionary } from 'ts-essentials';
import { ParamType } from 'ethers/utils';
import { SimpleProcessorDefinition } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { SpockConfig } from '@oasisdex/spock-etl/dist/services/config';

import config from './config';
import { Services } from '@oasisdex/spock-etl/dist/services/types';

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

export function getAddressesFromConfig(services: { config: SpockConfig }): Dictionary<string> {
  return ((services.config as any) as typeof config).addresses;
}

export interface ABIFragment {
  type: 'event' | 'function';
  name: string;
}

export function partialABI(abi: ParamType[], fragments: ABIFragment[]) {
  return abi.filter(({ name, type }) =>
    fragments.some(fragment => fragment.name === name && fragment.type === type),
  );
}

export async function initializeCommandAliases(services: Services, commandMapping: Object) {
  const promises = Object.entries(commandMapping).map(([key, value]) => {
    const query = `insert  into automation_bot.command_alias(command_address , kind) values ('${key}', '${value}');`;
    const result = services.db.none(query);
    return result;
  });
  await Promise.all(promises);
}