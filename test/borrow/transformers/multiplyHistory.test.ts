import { expect } from 'earljs';
import { constants } from 'ethers';
import { getSQL, destroyTestServices, executeSQL } from '@oasisdex/spock-test-utils';

import { Services, TransactionalServices } from '@oasisdex/spock-etl/dist/services/types';
import { createServices } from '../../utils/createServices';

import { multiplyHistoryTransformer } from '../../../src/borrow/transformers/multiplyHisotry';

import { aggregateVaultParams } from '../../../src/borrow/transformers/multiplyHisotry'
import { Event } from '../../../src/types/history';
import BigNumber from 'bignumber.js';

class Counter {
  private tx_id: number;
  private block: number;
  private log_index: number;
  constructor() {
    this.block = 0;
    this.tx_id = 0;
    this.log_index = 0;
  }

  public nextBlock() {
    this.block = this.block + 1;
    this.log_index = 0;
    this.tx_id = this.tx_id + 1;
    return {
      log_index: this.log_index,
      block_id: this.block,
      tx_id: this.tx_id,
    }
  }

  public nextLog() {
    this.log_index = this.log_index + 1;
    this.tx_id = this.tx_id + 1;
    return {
      log_index: this.log_index,
      block_id: this.block,
      tx_id: this.tx_id,
    }
  }
}

const baseOpenEvent = 
  {
    id: 1,
    kind: "OPEN" as const,
    vault_creator: "0x1f7e61d7a0abbd9938718964c7f4e1ac0746069e",
    urn: "0xfdd3c93b4d67014681fe95b874bc3647a93b3295",
    cdp_id: "25553",
    timestamp: new Date("Mon Sep 06 2021 12:39:34 GMT+0200 (Central European Summer Time)"),
    hash: '0xHASH'
  }

const baseWithdrawEvent = 
  {
    id: 2,
    kind: "WITHDRAW" as const,
    rate: "1.000002212345817565",
    urn: "0x7e373237a4a583d111e0b4f84dfc5674062f8610",
    timestamp: new Date("Mon Sep 06 2021 13:18:07 GMT+0200 (Central European Summer Time)"),
    oracle_price: "0.000000000000000000",
    hash: '0xHASH'
  }

const baseDepositEvent = 
  {
    id: 3,
    kind: "DEPOSIT" as const,
    rate: "1.000000000000000000",
    urn: "0x81c64839bdf45238c45753fe8bbb37db4d38ffbb",
    timestamp: new Date("Mon Sep 06 2021 12:47:29 GMT+0200 (Central European Summer Time)"),
    oracle_price: "0.000000000000000000",
    hash: '0xHASH'
  }

const baseGenerateEvent = {
  id: 4,
  kind: "GENERATE" as const,
  urn: "0x934c8295b3b449385cbe121242dda1252a7f9b20",
  timestamp: new Date('Mon Sep 06 2021 12:52:30 GMT+0200 (Central European Summer Time)'),
  hash: '0xHASH'
}

const basePaybackEvent = {
  id: 5,
  kind: "PAYBACK" as const,
  urn: "0x934c8295b3b449385cbe121242dda1252a7f9b20",
  timestamp: new Date('Mon Sep 06 2021 12:52:30 GMT+0200 (Central European Summer Time)'),
  hash: '0xHASH'
}

const baseWithdrawAndPaybackEvent = {
  id: 6,
  kind: "WITHDRAW-PAYBACK" as const,
  urn: "0x934c8295b3b449385cbe121242dda1252a7f9b20",
  timestamp: new Date('Mon Sep 06 2021 12:52:30 GMT+0200 (Central European Summer Time)'),
  hash: '0xHASH'
}

const baseDepositAndGenerateEvent = {
  id: 7,
  kind: "DEPOSIT-GENERATE" as const,
  urn: "0x934c8295b3b449385cbe121242dda1252a7f9b20",
  timestamp: new Date('Mon Sep 06 2021 12:52:30 GMT+0200 (Central European Summer Time)'),
  hash: '0xHASH'
}

const baseMoveDestEvent = {
  id: 8,
  kind: "MOVE_DESC" as const,
  urn: "0x934c8295b3b449385cbe121242dda1252a7f9b20",
  timestamp: new Date('Mon Sep 06 2021 12:52:30 GMT+0200 (Central European Summer Time)'),
  hash: '0xHASH'
}

const baseMoveSrcEvent = {
  id: 9,
  kind: "MOVE_SRC" as const,
  urn: "0x934c8295b3b449385cbe121242dda1252a7f9b20",
  timestamp: new Date('Mon Sep 06 2021 12:52:30 GMT+0200 (Central European Summer Time)'),
  hash: '0xHASH'
}

const baseAuctionStartedEvent = {
  id: 10,
  kind: "AUCTION_STARTED" as const,
  urn: "0x934c8295b3b449385cbe121242dda1252a7f9b20",
  timestamp: new Date('Mon Sep 06 2021 12:52:30 GMT+0200 (Central European Summer Time)'),
  hash: '0xHASH'
}

const baseAuctionStartedV2Event = {
  id: 11,
  kind: "AUCTION_STARTED_V2" as const,
  urn: "0x934c8295b3b449385cbe121242dda1252a7f9b20",
  timestamp: new Date('Mon Sep 06 2021 12:52:30 GMT+0200 (Central European Summer Time)'),
  hash: '0xHASH'
}


describe('aggregateVaultParams', () => {
  it('Calculates deposits before batch', () => {
    const eventsBefore: Event[] = [
      {
        ...baseOpenEvent,
        log_index: 0,
        block_id: 0,
        tx_id: 1,
      }, 
      {
        ...baseDepositEvent,
        collateral_amount: '10',
        log_index: 0,
        block_id: 1,
        tx_id: 2,
      },
      {
        ...baseDepositEvent,
        collateral_amount: '15',
        log_index: 0,
        block_id: 1,
        tx_id: 2,
      },
    ]
    const events: Event[] = [{
      ...baseDepositEvent,
      collateral_amount: '10',
      log_index: 0,
      block_id: 3,
      tx_id: 3,
    }]

    const aggregated = aggregateVaultParams(events, eventsBefore)

    expect(aggregated[0].beforeLockedCollateral).toEqual(new BigNumber(25))
    expect(aggregated[0].lockedCollateral).toEqual(new BigNumber(35))
  })

  it('Aggregates collateral in correct order', () => {
    const eventsBefore: Event[] = []
    const events: Event[] = [
      { // we assume that events in the array are not in correct order
      ...baseDepositEvent,
      collateral_amount: '30',
      log_index: 1,
      block_id: 4, // third
      tx_id: 2,
    },
    {
      ...baseDepositEvent,
      collateral_amount: '10',
      log_index: 100,
      block_id: 3, // first
      tx_id: 2,
    },
    {
      ...baseDepositEvent,
      collateral_amount: '20',
      log_index: 0,
      block_id: 4, // second
      tx_id: 3,
    }]

    const aggregated = aggregateVaultParams(events, eventsBefore)

    expect(aggregated[0].lockedCollateral).toEqual(new BigNumber(10))
    expect(aggregated[1].lockedCollateral).toEqual(new BigNumber(30))
    expect(aggregated[2].lockedCollateral).toEqual(new BigNumber(60))
  })

  it('Handlers deposits and withdraws of collateral before batch', () => {
    const eventsBefore: Event[] = [
      {
        ...baseDepositEvent,
        collateral_amount: '100',
        log_index: 0,
        block_id: 0, 
        tx_id: 0,
      },
      {
        ...baseWithdrawEvent,
        collateral_amount: '-10',
        log_index: 1,
        block_id: 0, 
        tx_id: 1,
      }
    ]
    const events: Event[] = [
    {
      ...baseDepositEvent,
      collateral_amount: '20',
      log_index: 0,
      block_id: 4,
      tx_id: 2,
    }]

    const aggregated = aggregateVaultParams(events, eventsBefore)

    expect(aggregated[0].beforeLockedCollateral).toEqual(new BigNumber(90))
    expect(aggregated[0].lockedCollateral).toEqual(new BigNumber(110))
  })

  it('Calculates generates before batch', () => {
    const eventsBefore: Event[] = [
      {
        ...baseDepositEvent,
        collateral_amount: '15',
        log_index: 0,
        block_id: 0,
        tx_id: 0,
      },
      {
        ...baseGenerateEvent,
        dai_amount: '1000',
        rate: '1.015',
        log_index: 1,
        block_id: 0,
        tx_id: 1,
      },
      {
        ...baseGenerateEvent,
        dai_amount: '1000',
        rate: '1.015',
        log_index: 1,
        block_id: 1,
        tx_id: 2,
      },
    ]
    const events: Event[] = [{
      ...baseGenerateEvent,
      dai_amount: '300',
      rate: '1.015',
      log_index: 0,
      block_id: 2,
      tx_id: 3,
    }]

    const aggregated = aggregateVaultParams(events, eventsBefore)

    expect(aggregated[0].beforeDebt.times('1.015').toFixed(18)).toEqual(new BigNumber(2000).toFixed(18))
    expect(aggregated[0].debt.times('1.015').toFixed(18)).toEqual(new BigNumber(2300).toFixed(18))
  })

  it('Aggregates debt in correct order', () => {
    const eventsBefore: Event[] = []
    const events: Event[] = [
      { // we assume that events in the array are not in correct order
      ...baseGenerateEvent,
      rate: '1.1',
      dai_amount: '300',
      log_index: 1,
      block_id: 4, // third
      tx_id: 2,
    },
    {
      ...baseGenerateEvent,
      rate: '1.1',
      dai_amount: '100',
      log_index: 100,
      block_id: 3, // first
      tx_id: 2,
    },
    {
      ...baseGenerateEvent,
      rate: '1.1',
      dai_amount: '200',
      log_index: 0,
      block_id: 4, // second
      tx_id: 3,
    }]

    const aggregated = aggregateVaultParams(events, eventsBefore)

    expect(aggregated[0].debt.times(1.1).toFixed(18)).toEqual(new BigNumber(100).toFixed(18))
    expect(aggregated[1].debt.times(1.1).toFixed(18)).toEqual(new BigNumber(300).toFixed(18))
    expect(aggregated[2].debt.times(1.1).toFixed(18)).toEqual(new BigNumber(600).toFixed(18))
  })

  it('Handlers generates and paybacks of dai before batch', () => {
    const eventsBefore: Event[] = [
      {
        ...baseGenerateEvent,
        rate: '1.1',
        dai_amount: '100',
        log_index: 0,
        block_id: 0, 
        tx_id: 0,
      },
      {
        ...basePaybackEvent,
        rate: '1.1',
        dai_amount: '-10',
        log_index: 1,
        block_id: 0, 
        tx_id: 1,
      }
    ]
    const events: Event[] = [
    {
      ...baseGenerateEvent,
      rate: '1.1',
      dai_amount: '20',
      log_index: 0,
      block_id: 4,
      tx_id: 2,
    }]

    const aggregated = aggregateVaultParams(events, eventsBefore)

    expect(aggregated[0].beforeDebt.times(1.1).toFixed(18)).toEqual(new BigNumber(90).toFixed(18))
    expect(aggregated[0].debt.times(1.1).toFixed(18)).toEqual(new BigNumber(110).toFixed(18))
  })

  it('Handles normalized debt', () => {
    const rate1 = '1.5'
    const rate2 = '1.6'

    const drawnDebt = '1000'
    const normalizedDrawnDebt = new BigNumber(drawnDebt).div(rate1)
    const rateDelta = new BigNumber(rate2).minus(rate1)
    const accruedDebt = rateDelta.times(normalizedDrawnDebt)
    const debtAtEvent = accruedDebt.plus(drawnDebt)

    const eventsBefore: Event[] = [
      {
        ...baseDepositAndGenerateEvent,
        rate: rate1,
        dai_amount: drawnDebt,
        collateral_amount: '1000',
        log_index: 0,
        block_id: 0, 
        tx_id: 0,
      },
    ]

    const events: Event[] = [
      {
        ...baseWithdrawAndPaybackEvent,
        rate: rate2,
        dai_amount: '-100',
        collateral_amount: '-100',
        log_index: 1,
        block_id: 1, 
        tx_id: 1,
      }
  ]

    const aggregated = aggregateVaultParams(events, eventsBefore)

    expect(aggregated[0].beforeDebt.times(rate2).toFixed(18)).toEqual(debtAtEvent.toFixed(18))
  })

  it('Handles different event kinds before batch', () => {
    const counter = new Counter()
    const eventsBefore: Event[] = [
      {
        ...baseOpenEvent,
        ...counter.nextBlock()
      },
      {
        ...baseDepositAndGenerateEvent,
        dai_amount: '1000',
        collateral_amount: '1000',
        rate: '1',
        ...counter.nextBlock()
      },
      {
        ...baseWithdrawAndPaybackEvent,
        dai_amount: '-100',
        collateral_amount: '-100',
        rate: '1',
        ...counter.nextBlock()
      },
      {
        ...baseAuctionStartedEvent,
        dai_amount: '900',
        collateral_amount: '900',
        rate: '1',
        auction_id: '0',
        ...counter.nextBlock()
      },
      {
        ...baseMoveDestEvent,
        transfer_from: '0x00',
        transfer_to: '0x00',
        dai_amount: '100',
        collateral_amount: '200',
        rate: '1',
        ...counter.nextBlock()
      },
    ]

    const events: Event[] = [
      {
        ...baseDepositEvent,
        rate: '1',
        collateral_amount: '100',
        ...counter.nextBlock()
      }]

      const aggregated = aggregateVaultParams(events, eventsBefore)

      expect(aggregated[0].beforeDebt).toEqual(new BigNumber(100))
      expect(aggregated[0].beforeLockedCollateral).toEqual(new BigNumber(200))
  })

  it.only('Handles different event kinds before batch', () => {
    const counter = new Counter()
    const eventsBefore: Event[] = []

    const events: Event[] = [
      {
        ...baseOpenEvent,
        ...counter.nextLog()
      },
      {
        ...baseDepositAndGenerateEvent,
        dai_amount: '1000',
        collateral_amount: '1000',
        rate: '1',
        ...counter.nextLog()
      },
      {
        ...baseWithdrawAndPaybackEvent,
        dai_amount: '-100',
        collateral_amount: '-100',
        rate: '1',
        ...counter.nextBlock()
      },
      {
        ...baseAuctionStartedEvent,
        dai_amount: '900',
        collateral_amount: '900',
        rate: '1',
        auction_id: '0',
        ...counter.nextLog()
      },
      {
        ...baseMoveDestEvent,
        transfer_from: '0x00',
        transfer_to: '0x00',
        dai_amount: '1000',
        collateral_amount: '2000',
        rate: '1',
        ...counter.nextLog()
      },
      {
        ...baseAuctionStartedV2Event,
        dai_amount: '1000',
        collateral_amount: '2000',
        rate: '1',
        auction_id: '0',
        liqPenalty: '100',
        ...counter.nextBlock()
      },
      {
        ...baseDepositAndGenerateEvent,
        dai_amount: '100',
        collateral_amount: '10',
        rate: '1',
        ...counter.nextBlock()
      },
      {
        ...baseMoveSrcEvent,
        transfer_from: '0x00',
        transfer_to: '0x00',
        dai_amount: '100',
        collateral_amount: '10',
        rate: '1',
        ...counter.nextBlock()
      }
    ]

      const aggregated = aggregateVaultParams(events, eventsBefore)

      // DEBT CHECKS
      expect(aggregated[0].debt).toEqual(new BigNumber(0)) //     OPEN
      expect(aggregated[1].debt).toEqual(new BigNumber(1000)) //  GENERATE    1000
      expect(aggregated[2].debt).toEqual(new BigNumber(900)) //   PAYBACK     100
      expect(aggregated[3].debt).toEqual(new BigNumber(0)) //     AUCTION     900
      expect(aggregated[4].debt).toEqual(new BigNumber(1000)) //  MOVE DEST   1000
      expect(aggregated[5].debt).toEqual(new BigNumber(0)) //     AUCTION V2  1000
      expect(aggregated[6].debt).toEqual(new BigNumber(100)) //   GENERATE    100
      expect(aggregated[7].debt).toEqual(new BigNumber(0)) //     MOVE SRC    100


      expect(aggregated[0].beforeDebt).toEqual(new BigNumber(0)) 
      expect(aggregated[1].beforeDebt).toEqual(new BigNumber(0)) 
      expect(aggregated[2].beforeDebt).toEqual(new BigNumber(1000)) 
      expect(aggregated[3].beforeDebt).toEqual(new BigNumber(900)) 
      expect(aggregated[4].beforeDebt).toEqual(new BigNumber(0)) 
      expect(aggregated[5].beforeDebt).toEqual(new BigNumber(1000)) 
      expect(aggregated[6].beforeDebt).toEqual(new BigNumber(0)) 
      expect(aggregated[7].beforeDebt).toEqual(new BigNumber(100)) 


      // COLLATERAL CHECKS
      expect(aggregated[0].lockedCollateral).toEqual(new BigNumber(0)) //     OPEN
      expect(aggregated[1].lockedCollateral).toEqual(new BigNumber(1000)) //  DEPOSIT     1000
      expect(aggregated[2].lockedCollateral).toEqual(new BigNumber(900)) //   WITHDRAW    100
      expect(aggregated[3].lockedCollateral).toEqual(new BigNumber(0)) //     AUCTION     900
      expect(aggregated[4].lockedCollateral).toEqual(new BigNumber(2000)) //  MOVE DEST   1000
      expect(aggregated[5].lockedCollateral).toEqual(new BigNumber(0)) //     AUCTION V2  1000
      expect(aggregated[6].lockedCollateral).toEqual(new BigNumber(10)) //   DEPOSIT     100
      expect(aggregated[7].lockedCollateral).toEqual(new BigNumber(0)) //     MOVE SRC    100


      expect(aggregated[0].beforeLockedCollateral).toEqual(new BigNumber(0)) 
      expect(aggregated[1].beforeLockedCollateral).toEqual(new BigNumber(0)) 
      expect(aggregated[2].beforeLockedCollateral).toEqual(new BigNumber(1000)) 
      expect(aggregated[3].beforeLockedCollateral).toEqual(new BigNumber(900)) 
      expect(aggregated[4].beforeLockedCollateral).toEqual(new BigNumber(0)) 
      expect(aggregated[5].beforeLockedCollateral).toEqual(new BigNumber(2000)) 
      expect(aggregated[6].beforeLockedCollateral).toEqual(new BigNumber(0)) 
      expect(aggregated[7].beforeLockedCollateral).toEqual(new BigNumber(10)) 
  })
});


/*


let services: Services;
  let txServices: TransactionalServices;

  beforeEach(async () => {
    [services, txServices] = await createServices();

    await executeSQL(
      services.db,
      `
      INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(1, '0x01', '2019-07-02 11:18:01+00');
      INSERT INTO vulcan2x.block(number, hash, timestamp) VALUES(2, '0x02', '2019-07-02 11:18:02+00');
      INSERT INTO vulcan2x.transaction (hash, to_address, from_address, block_id, nonce, value, gas_limit, gas_price, data) 
        VALUES('0x01', '0x01', '0x00', 1, 1, 0, 0, 0, '');
    `,
    );
  });

  afterEach(() => destroyTestServices(services));

  it.skip('combines events into WITHDRAW-PAYBACK event', async () => {
    const multiplyHistoryTransformerInstance = multiplyHistoryTransformer(constants.AddressZero, 0, {
        dogAddress: '0x',
        multiplyProxyActionsAddress: '0x'
    })

    const data = require('../../fixture/combine-withdraw-payback-log.json');
   
    await multiplyHistoryTransformerInstance.transform(txServices, data)

  });

  */