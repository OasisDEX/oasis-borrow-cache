import { flatten } from 'lodash';

import { handleEvents, FullEventInfo } from '@oasisdex/spock-utils/dist/transformers/common';
import {
  getExtractorName,
  PersistedLog,
  SimpleProcessorDefinition,
} from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';

import { Dictionary } from 'ts-essentials';
import { normalizeAddressDefinition } from '../../utils';
import { getLiquidationRatio } from '../dependencies/getLiquidationRatio';
import { getIlkForCdp } from '../dependencies/getIlkForCdp';
import { cleanUpString } from '../../utils/cleanUpString';

const multiplyAbi = require('../../../abis/multiply-proxy-actions.json');

const multiplyGuniAbi = require('../../../abis/guni-multiply-proxy-action.json');

interface Dependencies {
  getIlkForCdp: typeof getIlkForCdp;
  getLiquidationRatio: typeof getLiquidationRatio;
  cdpManager: string;
  vat: string;
}

const handleMultiply = async (
  params: Dictionary<any>,
  log: PersistedLog,
  services: LocalServices,
  dependencies: Dependencies,
) => {
  const cdpId = params.cdpId.toString();
  const block = await services.tx.oneOrNone(
    `
    select * from vulcan2x.block where id = ${log.block_id}
    `,
  );

  const ilk = await dependencies.getIlkForCdp(cdpId, services);

  const liquidationRatio = await dependencies.getLiquidationRatio(ilk, block.number, services);

  const values = {
    method_name: params.methodName,
    cdp_id: cdpId,
    swap_min_amount: params.swapMinAmount.toString(),
    swap_optimist_amount: params.swapOptimistAmount.toString(),
    collateral_left: params.collateralLeft.toString(),
    dai_left: params.daiLeft.toString(),
    ilk: cleanUpString(ilk),
    liquidation_ratio: liquidationRatio.toNumber(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  const cs = new services.pg.helpers.ColumnSet(
    [
      'method_name',
      'cdp_id',
      'swap_min_amount',
      'swap_optimist_amount',
      'collateral_left',
      'dai_left',
      'liquidation_ratio',
      'ilk',
      'tx_id',
      'block_id',
      'log_index',
    ],
    {
      table: {
        schema: 'multiply',
        table: 'method_called',
      },
    },
  );

  const query = services.pg.helpers.insert([values], cs);
  await services.tx.none(query);
};

const handleFL = async (params: Dictionary<any>, log: PersistedLog, services: LocalServices) => {
  const values = {
    borrowed: params.borrowed.toString(),
    due: params.due.toString(),

    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
  };

  await services.tx.none(
    `INSERT INTO multiply.flashloan(
              borrowed, due,
              log_index, tx_id, block_id
            ) VALUES (
              \${borrowed}, \${due},
              \${log_index}, \${tx_id}, \${block_id}
            );`,
    values,
  );
};

const handlers = (dependencies: Dependencies) => ({
  async MultipleActionCalled(
    services: LocalServices,
    { event, log }: FullEventInfo,
  ): Promise<void> {
    await handleMultiply(event.params, log, services, dependencies);
  },
  async FLData(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handleFL(event.params, log, services);
  },
});

export function getMultiplyTransformerName(deps: SimpleProcessorDefinition): string {
  return `multiplyActions-${deps.address}`;
}

export const multiplyTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
  dependencies: Dependencies,
) => BlockTransformer[] = (addresses, dependencies) => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getMultiplyTransformerName(deps),
      dependencies: [getExtractorName(deps.address)],
      transformerDependencies: [
        `openCdpTransformer-${dependencies.cdpManager}`,
        `vatTransformer-${dependencies.vat}`,
      ],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, multiplyAbi, flatten(logs), handlers(dependencies));
      },
    };
  });
};

export const multiplyGuniTransformer: (
  addresses: (string | SimpleProcessorDefinition)[],
  dependencies: Dependencies,
) => BlockTransformer[] = (addresses, dependencies) => {
  return addresses.map(_deps => {
    const deps = normalizeAddressDefinition(_deps);

    return {
      name: getMultiplyTransformerName(deps),
      dependencies: [getExtractorName(deps.address)],
      transformerDependencies: [
        `openCdpTransformer-${dependencies.cdpManager}`,
        `vatTransformer-${dependencies.vat}`,
      ],
      startingBlock: deps.startingBlock,
      transform: async (services, logs) => {
        await handleEvents(services, multiplyGuniAbi, flatten(logs), handlers(dependencies));
      },
    };
  });
};
