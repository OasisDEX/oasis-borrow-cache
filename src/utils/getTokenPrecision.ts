import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import { memoize } from 'lodash';

const erc20Abi = require('../../abis/erc20.json');

export async function getTokenPrecision_(
  services: LocalServices,
  tokenAddress: string,
): Promise<BigNumber> {
  const erc20 = new ethers.Contract(tokenAddress, erc20Abi, (services as any).provider);

  return new BigNumber(await erc20.decimals());
}

export const getTokenPrecision = memoize(getTokenPrecision_, (_, tokenAddress) => tokenAddress);
