import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';

export async function getGasFee(services: LocalServices, txHash: string): Promise<BigNumber> {
  const provider: ethers.providers.Provider = (services as any).provider;

  const [{ gasPrice }, { gasUsed }] = await Promise.all([
    provider.getTransaction(txHash),
    provider.getTransactionReceipt(txHash),
  ]);

  if (!gasUsed) {
    throw new Error(`Cannot get gas used for ${txHash}`);
  }

  return new BigNumber(gasUsed.toString()).times(gasPrice.toString());
}
