import { getAddressesFromConfig } from '../../otc/transformers/utils';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { getTokenDecimals } from '../../otc/transformers/tokens';

export async function getIlkPrecision(services: LocalServices, ilk: string): Promise<number> {
  const addresses = getAddressesFromConfig(services);
  const tokenSymbol = addresses.ilks[ilk];

  if (!tokenSymbol) {
    throw new Error(`Couldnt find ilk for ${ilk}`);
  }

  return getTokenDecimals(services, tokenSymbol);
}
