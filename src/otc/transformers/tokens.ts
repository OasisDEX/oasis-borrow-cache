import { getAddressesFromConfig } from './utils';
import { Token } from '../../addresses-utils';
import { values } from 'lodash';
import { LocalServices, Services } from '@oasisdex/spock-etl/dist/services/types';
import { withConnection } from '@oasisdex/spock-etl/dist/db/db';
import { getLogger } from '@oasisdex/spock-etl/dist/utils/logger';

const logger = getLogger('transformers/tokens');

function getToken(services: LocalServices, address: string): Token | undefined {
  const tokens = getAddressesFromConfig(services).tokens;

  return values(tokens).filter(t => t.key === address)[0];
}

export async function getTokenDecimals(
  services: LocalServices,
  tokenAddress: string,
): Promise<number> {
  const tokenInfo = getToken(services, tokenAddress.toLowerCase());
  if (!tokenInfo) {
    return 18;
  } else {
    return tokenInfo.decimals;
  }
}

export async function loadTokens(services: Services): Promise<void> {
  const addresses = getAddressesFromConfig(services);

  const tokens = values(addresses.tokens);

  await withConnection(services.db, async c => {
    // first clear token table
    await c.none('TRUNCATE TABLE oasis.token;');

    // then load tokens for current chain
    for (const token of tokens) {
      await c.none(
        `
        INSERT INTO oasis.token(key, symbol, decimals)
        VALUES (E\${key},E\${symbol},\${decimals});`,
        { ...token },
      );
    }

    // we need to ANALYZE after TRUNCATE to avoid perf degradation (especially in REST-API)
    // more: https://dba.stackexchange.com/questions/162240/is-vacuum-full-necessary-on-a-drop-table-truncate-approach-for-a-datawarehouse
    await c.none('ANALYZE oasis.token;');
  });

  logger.info(`Loaded ${tokens.length} tokens info`);
}
