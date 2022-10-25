import { Dictionary } from 'ts-essentials';
import { ParamType } from 'ethers/utils';
import { SimpleProcessorDefinition } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { SpockConfig } from '@oasisdex/spock-etl/dist/services/config';

import config from './config';
import { Services } from '@oasisdex/spock-etl/dist/services/types';
import { isAwaitExpression } from 'typescript';

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
  const cs = new services.pg.helpers.ColumnSet(['command_address', 'kind'], {
    table: {
      table: 'command_alias',
      schema: 'automation_bot',
    },
  });

  const query = services.pg.helpers.insert(commandMapping, cs);
  await services.db.none(`DELETE FROM automation_bot.command_alias`);
  await services.db.none(query);
}
