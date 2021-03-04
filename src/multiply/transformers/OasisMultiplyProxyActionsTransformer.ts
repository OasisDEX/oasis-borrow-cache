import { uniq } from 'lodash';
import { parseBytes32String } from 'ethers/utils';
import { BigNumber } from 'bignumber.js';

import { PersistedLog } from '@oasisdex/spock-utils/dist/extractors/rawEventDataExtractor';
import { getExtractorName } from '@oasisdex/spock-utils/dist/extractors/rawEventBasedOnTopicExtractor';
import {
  handleEvents,
  FullEventInfo,
  ParsedEvent,
} from '@oasisdex/spock-utils/dist/transformers/common';
import { BlockTransformer } from '@oasisdex/spock-etl/dist/processors/types';
import { LocalServices } from '@oasisdex/spock-etl/dist/services/types';
import { getIlkPrecision } from './tokenPrecision';

const oasisMultiplyProxyActionsAbi = require('../../../abis/oasis-multiply-proxy-actions.json');

const handle = async (
  type: string,
  event: ParsedEvent,
  log: PersistedLog,
  services: LocalServices,
) => {
  const ilk = parseBytes32String(event.params.ilk);
  const ilk_decimals = await getIlkPrecision(services, ilk);
  const dai_decimals = await getIlkPrecision(services, 'DAI');
  const ddai =
    event.params.ddai &&
    new BigNumber(event.params.ddai).div(new BigNumber(`1e${dai_decimals}`)).toString();
  const dgem =
    event.params.dgem &&
    new BigNumber(event.params.dgem).div(new BigNumber(`1e${ilk_decimals}`)).toString();
  const pay_amount =
    event.params.payAmount &&
    new BigNumber(event.params.payAmount).div(new BigNumber(`1e${dai_decimals}`)).toString();
  const amount =
    event.params.amount &&
    new BigNumber(event.params.amount).div(new BigNumber(`1e${ilk_decimals}`)).toString();
  const maxPayAmount =
    event.params.maxPayAmount &&
    new BigNumber(event.params.maxPayAmount).div(new BigNumber(`1e${ilk_decimals}`)).toString();
  const minPayAmount =
    event.params.minPayAmount &&
    new BigNumber(event.params.minPayAmount).div(new BigNumber(`1e${ilk_decimals}`)).toString();
  const timestamp = await services.tx.oneOrNone(
    `SELECT timestamp FROM vulcan2x.block WHERE id = \${block_id}`,
    {
      block_id: log.block_id,
    },
  );

  const values = {
    type,
    ilk,
    ddai,
    dgem,
    pay_amount,
    amount,
    maxPayAmount,
    minPayAmount,
    owner: log.address,
    address: log.address,
    log_index: log.log_index,
    tx_id: log.tx_id,
    block_id: log.block_id,
    timestamp: timestamp.timestamp,
  };

  await services.tx.none(
    `INSERT INTO multiply.event(
       type, ilk, amount, pay_amount, dgem, ddai, max_pay_amount, min_pay_amount, owner, address, log_index, tx_id, block_id, timestamp
     ) VALUES (
       \${type}, \${ilk}, \${amount}, \${pay_amount}, \${dgem}, \${ddai}, \${maxPayAmount}, \${minPayAmount}, \${owner}, \${address},
       \${log_index}, \${tx_id}, \${block_id}, \${timestamp}
     );`,
    values,
  );
};

const handlers = {
  async FundGem(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('FundGem', event, log, services);
  },
  async FundDai(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('FundDai', event, log, services);
  },
  async DrawGem(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('DrawGem', event, log, services);
  },
  async DrawDai(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('DrawDai', event, log, services);
  },
  async Adjust(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('Adjust', event, log, services);
  },
  async Buy(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('Buy', event, log, services);
  },
  async Sell(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('Sell', event, log, services);
  },
  async Redeem(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('Redeem', event, log, services);
  },
  async Free(services: LocalServices, { event, log }: FullEventInfo): Promise<void> {
    await handle('Free', event, log, services);
  },
};

export const proxyActionsTransformer: (
  proxyFactories: string[],
  abiNames: string[],
  startingBlock?: number,
) => BlockTransformer = (proxyFactories, abiNames, startingBlock) => ({
  name: 'proxyActionsTransformer',
  startingBlock,
  dependencies: abiNames.map(abiName => getExtractorName(abiName)),
  transformerDependencies: proxyFactories.map(a => `trackAllNewlyCreatedProxies-${a}`),
  transform: async (services, [proxyActionsLogs]) => {
    const proxyActionsLogsFromOurContracts = await onlyLogsFromProxies(services, proxyActionsLogs);

    if (proxyActionsLogsFromOurContracts.length > 0) {
      await handleEvents(services, oasisMultiplyProxyActionsAbi, proxyActionsLogs, handlers);
    }
  },
});

async function onlyLogsFromProxies(services: LocalServices, logs: any[]): Promise<any[]> {
  if (logs.length === 0) {
    return [];
  }

  const addresses = uniq(logs.map(l => l.address));

  const validAddressesWrapped: { proxy: string }[] = await services.tx.query(
    `
  SELECT p.proxy FROM multiply.proxy p WHERE p.proxy IN (\${addresses:csv});
  `,
    { addresses },
  );
  const validAddresses = validAddressesWrapped.map(v => v.proxy);
  return logs.filter(l => validAddresses.includes(l.address));
}
