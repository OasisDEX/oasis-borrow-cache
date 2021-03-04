import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import {
  getExtractorName,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { handleEvents } from '@oasisdex/spock-utils/dist/transformers/common';
import { flatten } from 'lodash';
import { normalizeAddressDefinition } from 'cache/src/utils';

const factoryAbi = require('../../../abis/ds-proxy-factory.json');

export const trackAllNewlyCreatedProxies: (
  proxies: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = proxies => {
  return proxies.map(_proxy => {
    const proxy = normalizeAddressDefinition(_proxy);

    return {
      name: `trackAllNewlyCreatedProxies-${proxy.address}`,
      startingBlock: proxy.startingBlock,
      dependencies: [getExtractorName(proxy.address)],
      transform: async (services, logs) => {
        await handleEvents(services, factoryAbi, flatten(logs), {
          async Created(_s, info): Promise<void> {
            const owner = info.event.params.owner.toLowerCase();
            const proxy = info.event.params.proxy.toLowerCase();

            await services.tx.none(
              `
                INSERT INTO multiply.proxy(owner, proxy, log_index, tx_id, block_id) 
                VALUES(\${owner}, \${proxy}, \${logIndex}, \${tx_id}, \${block_id})`,
              {
                owner,
                proxy,
                logIndex: info.log.log_index,
                tx_id: info.log.tx_id,
                block_id: info.log.block_id,
              },
            );
          },
        });
      },
    };
  });
};

export async function getAllProxies(services: LocalServices): Promise<ProxyPersisted[]> {
  return await services.tx.manyOrNone<ProxyPersisted>(`
  SELECT * FROM multiply.proxy;
  `);
}

interface ProxyPersisted {
  id: number;
  owner: string;
  proxy: string;
  log_index: number;
  tx_id: number;
  block_id: number;
}
