import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { ethers } from 'ethers';
import { getAddressesFromConfig } from '../../utils';
import { memoize } from 'lodash';

const cdpManagerAbi = require('../../../abis/dss-cdp-manager.json');

export const getIlkForCdp_ = async (id: string, services: LocalServices): Promise<string> => {
  const addresses = getAddressesFromConfig(services);
  const contract = new ethers.Contract(
    addresses.CDP_MANAGER,
    cdpManagerAbi,
    (services as any).provider,
  );
  const ilk = await contract.ilks(id);

  return ethers.utils.toUtf8String(ilk);
};

export const getIlkForCdp = memoize(getIlkForCdp_);
