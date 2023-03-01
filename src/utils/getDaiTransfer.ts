import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { BigNumber } from 'bignumber.js';

export async function getDaiTransfer(services: LocalServices, txId: number): Promise<BigNumber> {
  const tx = await services.tx.one(`SELECT hash from vulcan2x.transaction where id = ${txId}`);
  const provider = (services as any).provider;
  const txReceipt = await provider.getTransactionReceipt(tx.hash);
  const daiTransferHex = txReceipt.logs.filter((log: { topics: string[] }) =>
    log.topics[0].startsWith(
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // transfer signature
    ),
  )[0].data as string;

  return new BigNumber(parseInt(daiTransferHex)).div(new BigNumber(10).pow(18));
}
