import { config as mainConfig } from './config.mainnet';
import { config as kovanConfig } from './config.kovan';
import { config as localConfig } from './config.localnet';
import { config as hardhatConfig } from './config.hardhat';

const config = (() => {
  switch (process.env.VL_CHAIN_NAME) {
    case 'mainnet':
      return mainConfig;
    case 'localnet':
      return localConfig;
    case 'kovan':
      return kovanConfig;
    case 'hardhat':
      return hardhatConfig;
    default:
      throw new Error(
        `Please select network from (mainnet, kovan, localnet). Was ${process.env.VL_CHAIN_NAME}`,
      );
  }
})();

console.log(`Using ${process.env.VL_CHAIN_NAME} config.`);

export default config as typeof mainConfig;
