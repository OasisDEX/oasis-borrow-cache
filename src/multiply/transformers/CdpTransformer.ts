import { flatten } from 'lodash';
import { parseBytes32String } from 'ethers/utils';
import { Dictionary } from 'ts-essentials';

import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
  getExtractorName,
  PersistedLog,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { normalizeAddressDefinition } from 'cache/src/utils';

const cdpManagerAbi = require('../../../abis/cdp-manager.json');

const handle = async (
  _type: string,
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
) => {
  const ilk = params.ilk && parseBytes32String(params.ilk);
  const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
      block_id: log.block_id,
    },
  );

  const values = {
    creator: params.usr.toLowerCase(),
    owner: params.usr.toLowerCase(),
    ilk: ilk,
    urn: params.urn.toLowerCase(),
    address: log.address,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
    timestamp: timestamp.timestamp,
  };

  await services.tx.none(
    `INSERT INTO borrow.cdp(
       creator, owner, ilk, urn, address, log_index, tx_id, block_id, timestamp
     ) VALUES (
       \${creator}, \${owner}, \${ilk}, \${urn}, \${address}, \${log_index},
       \${tx_id}, \${block_id}, \${timestamp}
     );`,
    values,
  );
};

const handlers = {
  async OpenEvent(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('OpenEvent', event.params, log, services);
  },
};

export const cdpTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
) => BlockTransformer[] = addresses => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: `cdpTransformer-${deps.address}`,
      dependencies: [getExtractorName(deps.address)],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, cdpManagerAbi, flatten(logs), handlers);
      },
    };
  });
};
