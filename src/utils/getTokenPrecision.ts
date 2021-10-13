import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { ethers } from 'ethers';

const erc20Abi = require('../../abis/erc20.json');

export async function getTokenPrecision(services: LocalServices, tokenAddress: string): Promise<number> {
  const erc20 = new ethers.Contract(tokenAddress, erc20Abi, (services as any).provider);

  return erc20.decimals();
}
