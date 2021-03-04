import * as pg from 'pg-promise';
import { ethers } from 'ethers';
import { min, max } from 'lodash';
import { BlockExtractor } from '@oasisdex/spock-etl/dist/processors/types';
import { TransactionalServices } from '@oasisdex/spock-etl/dist/services/types';
import { BlockModel } from '@oasisdex/spock-etl/dist/db/models/Block';

export function getVariableIndex(pay_gem: string, buy_gem: string): string {
  const mapping_hash = ethers.utils.solidityKeccak256(['uint256', 'uint256'], [pay_gem, 6]);
  return ethers.utils.solidityKeccak256(['uint256', 'uint256'], [buy_gem, mapping_hash]);
}

// tslint:disable-next-line
export function getColumnSets(pg: pg.IMain) {
  return {
    extracted_storage: new pg.helpers.ColumnSet(['block_id', 'address', 'key', 'value'], {
      table: new pg.helpers.TableName({ table: 'storage', schema: 'extracted' }),
    }),
  };
}

export function makeMidpointOfferExtractors(
  address: string,
  market: [string, string],
  startingBlock?: number,
): BlockExtractor[] {
  return [
    getBestOfferExtractor(getVariableIndex(market[0], market[1]), address, startingBlock),
    getBestOfferExtractor(getVariableIndex(market[1], market[0]), address, startingBlock),
  ];
}

export function getBestOfferExtractorName(index: string, _address: string): string {
  // this should contain address as part of extractor name but we are hitting length limits :(
  return `storage_variable_extractor_${index}`;
}

function getBestOfferExtractor(
  index: string,
  address: string,
  startingBlock?: number,
): BlockExtractor {
  return {
    name: getBestOfferExtractorName(index, address),
    extractorDependencies: [],
    startingBlock,
    async extract(services: TransactionalServices, blocks: BlockModel[]): Promise<void> {
      if (blocks.length === 0) {
        return;
      } else {
        const variables = blocks.map(async (block: BlockModel) => {
          const variable = await services.provider.getStorageAt(address, index, block.number);
          return {
            block_id: block.id,
            key: index,
            value: variable,
            address,
          };
        });

        const variablesToInsert = await Promise.all(variables);
        if (variablesToInsert.length === 0) {
          return;
        }
        const query = services.pg.helpers.insert(
          variablesToInsert,
          getColumnSets(services.pg as any)['extracted_storage'],
        );
        await services.tx.none(query);
      }
    },
    async getData(services: TransactionalServices, blocks: BlockModel[]): Promise<any> {
      const blocksIds = blocks.map(b => b.id);
      const minId = min(blocksIds);
      const maxId = max(blocksIds);

      return (
        services.tx.manyOrNone(
          `
                    SELECT * FROM extracted.storage
                    WHERE block_id >= \${id_min} AND block_id <= \${id_max} AND address=\${address} AND key=\${key};
                    `,
          {
            address,
            id_min: minId,
            id_max: maxId,
            key: index,
          },
        ) || []
      );
    },
  };
}
