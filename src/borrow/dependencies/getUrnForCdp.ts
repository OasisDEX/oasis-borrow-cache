import { ethers } from 'ethers';
import { Provider } from 'ethers/providers';

const cdpManagerAbi = require('../../../abis/dss-cdp-manager.json');

export const getUrnForCdp = async (
  provider: Provider,
  id: string,
  managerAddress: string,
): Promise<string> => {
  const contract = new ethers.Contract(managerAddress, cdpManagerAbi, provider);
  return contract.urns(id);
};
