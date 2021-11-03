ALTER TABLE vault.events ADD eth_price decimal(78,18) NULL;

DROP VIEW api.vault_multiply_history;

ALTER TABLE vault.multiply_events DROP COLUMN oracle_price;

CREATE VIEW api.vault_multiply_history AS (
    SELECT 
    t.hash, b.timestamp,
    me.id, me.urn, me.kind, me.market_price, me.before_locked_collateral,
    me.locked_collateral, me.before_collateralization_ratio, me.collateralization_ratio, 
    me.before_debt, me.debt, me.before_multiple, me.multiple, me.before_liquidation_price, me.liquidation_price, 
    me.net_value, me.oazo_fee, me.loan_fee, me.gas_fee, me.total_fee, me.bought, me.deposit_collateral, 
    me.deposit_dai, me.sold, me.withdrawn_collateral, me.withdrawn_dai, me.exit_collateral, me.exit_dai,
    me.tx_id, me.log_index, me.block_id,
    b.number as block_number, b.hash as block_hash,
    e.collateral_amount, e.dai_amount, e.rate, e.vault_creator, e.depositor, e.cdp_id, e.transfer_from,
    e.transfer_to, e.collateral, e.auction_id, e.liq_penalty, e.collateral_price, e.covered_debt, 
    e.remaining_debt, e.remaining_collateral, e.collateral_taken, e.ilk, e.oracle_price, e.eth_price
    FROM vault.multiply_events me
    JOIN vulcan2x.transaction t ON me.tx_id = t.id
    JOIN vulcan2x.block b ON me.block_id = b.id
    LEFT JOIN vault.events e ON me.standard_event_id = e.id
);

CREATE INDEX oracle_timestamp_index ON oracles.prices(timestamp);