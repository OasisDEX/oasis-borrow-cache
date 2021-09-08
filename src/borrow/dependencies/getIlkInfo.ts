import { memoize } from 'lodash';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { getAddressesFromConfig } from '../../utils';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';

const ilkRegistryAbi = require('../../../abis/ilk-registry.json');

export interface Ilk {
  dec: BigNumber;
  flip: string;
  gem: string;
  name: string;
  pos: string;
  symbol: string;
}

async function getIlkInfo_(ilk: string, services: LocalServices): Promise<Ilk> {
  const addresses = getAddressesFromConfig(services);
  const ilkRegistry = new ethers.Contract(
    addresses.ILK_REGISTRY,
    ilkRegistryAbi,
    (services as any).provider,
  );

  return ilkRegistry.info(ilk);
}
export const getIlkInfo = memoize(getIlkInfo_);
