import {
  getTestConfig,

  createTestServices
} from '@oasisdex/spock-test-utils';
import { Services, TransactionalServices } from '@oasisdex/spock-etl/dist/services/types';
import { join } from 'path';

export async function createServices(): Promise<[Services, TransactionalServices]> {
  const config = getTestConfig();

  const services = await createTestServices({
    config: {
      ...config,
      ...{
        migrations: {
          borrow: join(__dirname, '../../src/borrow/migrations'),
        },
      },
    },
  });

  const txServices: TransactionalServices = {
    ...services,
    tx: services.db as any,
  };

  return [
    services,
    txServices
  ];
}
