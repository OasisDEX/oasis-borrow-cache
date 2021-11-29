export interface HistoryEventBase {
  hash: string;
  timestamp: Date;
  id: number;
  urn: string;
  log_index: number;
  tx_id: number;
  block_id: number;
  eth_price: string;
}

interface VaultOpenedEvent extends HistoryEventBase {
  kind: 'OPEN';
  vault_creator: string;
  cdp_id: string;
}

interface DepositEvent extends HistoryEventBase {
  kind: 'DEPOSIT';
  dai_amount: string;
  collateral_amount: string;
  oracle_price: string;
  eth_price: string;
  rate: string;
}

interface WithdrawEvent extends HistoryEventBase {
  kind: 'WITHDRAW';
  dai_amount: string;
  collateral_amount: string;
  oracle_price: string;
  eth_price: string;
  rate: string;
}

interface GenerateEvent extends HistoryEventBase {
  kind: 'GENERATE';
  dai_amount: string;
  collateral_amount: string;
  rate: string;
  oracle_price: string;
  eth_price: string;
}

interface PaybackEvent extends HistoryEventBase {
  kind: 'PAYBACK';
  dai_amount: string;
  collateral_amount: string;
  rate: string;
  oracle_price: string;
  eth_price: string;
}

interface DepositGenerateEvent extends HistoryEventBase {
  kind: 'DEPOSIT-GENERATE';
  dai_amount: string;
  rate: string;
  collateral_amount: string;
  oracle_price: string;
  eth_price: string;
}

interface WithdrawPaybackEvent extends HistoryEventBase {
  kind: 'WITHDRAW-PAYBACK';
  dai_amount: string;
  rate: string;
  collateral_amount: string;
  oracle_price: string;
  eth_price: string;
}

interface AuctionStartedEvent extends HistoryEventBase {
  kind: 'AUCTION_STARTED';
  collateral_amount: string;
  dai_amount: string;
  rate: string;
  auction_id: string;
  collateral: string;
}

interface AuctionStartedV2Event extends HistoryEventBase {
  kind: 'AUCTION_STARTED_V2';
  auction_id: string;
  collateral_amount: string;
  dai_amount: string;
  rate: string;
  liqPenalty: string;
  collateral: string;
}

interface AuctionFinishedV2Event extends HistoryEventBase {
  kind: 'AUCTION_FINISHED_V2';
  auction_id: string;
  remaining_debt: string;
  remaining_collateral: string;
}

interface TakeEvent extends HistoryEventBase {
  kind: 'TAKE';
  auction_id: string;
  remaining_debt: string;
  remaining_collateral: string;
  collateral_price: string;
  covered_debt: string;
  collateral_taken: string;
}

interface VaultTransferredEvent extends HistoryEventBase {
  kind: 'TRANSFER';
  transfer_from: string;
  transfer_to: string;
}

interface MoveSrcEvent extends HistoryEventBase {
  kind: 'MOVE_SRC';
  transfer_from: string;
  transfer_to: string;
  collateral_amount: string;
  dai_amount: string;
  rate: string;
  oracle_price: string;
  eth_price: string;
}

interface MoveDestEvent extends HistoryEventBase {
  kind: 'MOVE_DEST';
  transfer_from: string;
  transfer_to: string;
  collateral_amount: string;
  dai_amount: string;
  rate: string;
  oracle_price: string;
  eth_price: string;
}

interface MigrateEvent extends HistoryEventBase {
  kind: 'MIGRATE';
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
  | PaybackEvent;
