import BigNumber from 'bignumber.js';

interface HistoryEventBase {
  hash: string
  timestamp: string
  id: string
  isMultiply?: boolean
  isHidden?: boolean
  oraclePrice: BigNumber
  rate: BigNumber
  liquidationRatio: BigNumber
  urn: string
  log_index: number,
  tx_id: number,
  block_id: number,
}

interface VaultOpenedEvent extends HistoryEventBase {
  kind: 'OPEN'
  vaultCreator: string
  cdpId: string
}

interface DepositEvent extends HistoryEventBase {
  kind: 'DEPOSIT'
  collateralAmount: BigNumber
}

interface WithdrawEvent extends HistoryEventBase {
  kind: 'WITHDRAW'
  collateralAmount: BigNumber
}

interface GenerateEvent extends HistoryEventBase {
  kind: 'GENERATE'
  daiAmount: BigNumber
}

interface PaybackEvent extends HistoryEventBase {
  kind: 'PAYBACK'
  daiAmount: BigNumber
  rate: BigNumber
}

interface DepositGenerateEvent extends HistoryEventBase {
  kind: 'DEPOSIT-GENERATE'
  daiAmount: BigNumber
  rate: BigNumber
  collateralAmount: BigNumber
}

interface WithdrawPaybackEvent extends HistoryEventBase {
  kind: 'WITHDRAW-PAYBACK'
  daiAmount: BigNumber
  rate: BigNumber
  collateralAmount: BigNumber
}

interface AuctionStartedEvent extends HistoryEventBase {
  kind: 'AUCTION_STARTED'
  collateralAmount: BigNumber
  daiAmount: BigNumber
  rate: BigNumber
  auctionId: string
}

interface AuctionStartedV2Event extends HistoryEventBase {
  kind: 'AUCTION_STARTED_V2'
  auctionId: string
  collateralAmount: BigNumber
  daiAmount: BigNumber
  rate: BigNumber
  liqPenalty: BigNumber
}

interface AuctionFinishedV2Event extends HistoryEventBase {
  kind: 'AUCTION_FINISHED_V2'
  auctionId: string
  remainingDebt: BigNumber
  remainingCollateral: BigNumber
}

interface TakeEvent extends HistoryEventBase {
  kind: 'TAKE'
  auctionId: string
  remainingDebt: BigNumber
  remainingCollateral: BigNumber
  collateralPrice: BigNumber
  coveredDebt: BigNumber
  collateralTaken: BigNumber
}

interface VaultTransferredEvent extends HistoryEventBase {
  kind: 'TRANSFER'
  transferFrom: string
  transferTo: string
}

interface MoveSrcEvent extends HistoryEventBase {
  kind: 'MOVE_SRC'
  transferFrom: string
  transferTo: string
  collateralAmount: BigNumber
  daiAmount: BigNumber
}

interface MoveDestEvent extends HistoryEventBase {
  kind: 'MOVE_DESC'
  transferFrom: string
  transferTo: string
  collateralAmount: BigNumber
  daiAmount: BigNumber
}

interface MigrateEvent extends HistoryEventBase {
  kind: 'MIGRATE'
}

export type Event = 
| VaultOpenedEvent
| WithdrawEvent
| GenerateEvent
| MigrateEvent 
| DepositEvent
| MoveDestEvent 
| MoveSrcEvent 
| VaultTransferredEvent 
| TakeEvent 
| AuctionFinishedV2Event 
| AuctionStartedV2Event 
| AuctionStartedEvent 
| WithdrawPaybackEvent
| DepositGenerateEvent
