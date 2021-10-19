import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { getAddressesFromConfig } from '../../utils';
import { ethers } from 'ethers';
import BigNumber from 'bignumber.js';
import { ray } from '../../utils/precision';

const mcdSpotAbi = require('../../../abis/dss-spot.json');

export async function getLiquidationRatio(
  ilk: string,
  blockTag: number,
  services: LocalServices,
): Promise<BigNumber> {
  const addresses = getAddressesFromConfig(services);
  const spot = new ethers.Contract(addresses.MCD_SPOT, mcdSpotAbi, (services as any).provider);

  const [, mat]: [string, BigNumber] = await spot.ilks(ethers.utils.toUtf8Bytes(ilk), {
    blockTag,
  });
  return new BigNumber(mat).div(ray);
}
