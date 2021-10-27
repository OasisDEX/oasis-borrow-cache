CREATE TABLE vault.multiply_events (
    id                              serial primary key,
    urn                             character varying(66) not null,
    standard_event_id               integer REFERENCES vault.events(id),

    kind                            character varying(50),
    market_price                    decimal(78,18),
    oracle_price                    decimal(78,18),
    before_locked_collateral        decimal(78,18),
    locked_collateral               decimal(78,18),
    before_collateralization_ratio  decimal(78,18),
    collateralization_ratio         decimal(78,18),
    before_debt                     decimal(78,18),
    debt                            decimal(78,18),
    before_multiple                 decimal(78,18),
    multiple                        decimal(78,18),
    before_liquidation_price        decimal(78,18),
    liquidation_price               decimal(78,18),
    net_value                       decimal(78,18),
    
    oazo_fee                        decimal(78,18),
    loan_fee                        decimal(78,18),
    gas_fee                         decimal(78,18),
    total_fee                       decimal(78,18),

    bought                          decimal(78,18),
    deposit_collateral              decimal(78,18),
    deposit_dai                     decimal(78,18),

    sold                            decimal(78,18),
    withdrawn_collateral            decimal(78,18),
    withdrawn_dai                   decimal(78,18),

    exit_collateral                 decimal(78,18),
    exit_dai                        decimal(78,18),
  
    order_index                     decimal(78,0),
    log_index                       integer not null,
    tx_id                           integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                        integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index, kind)
);

CREATE INDEX multiply_event_urn ON vault.multiply_events(urn);
CREATE INDEX multiply_event_block_id ON vault.multiply_events(block_id);
CREATE INDEX multiply_event_order ON vault.multiply_events(order_index);

DROP VIEW api.vault_events;

ALTER TABLE vault.events
ALTER COLUMN rate TYPE numeric(78,45);

CREATE VIEW api.vault_events AS (
    SELECT e.*, t.hash
    FROM vault.events e 
    JOIN vulcan2x.transaction t ON e.tx_id = t.id
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
);

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
    e.remaining_debt, e.remaining_collateral, e.collateral_taken, e.ilk, COALESCE(e.oracle_price, me.oracle_price) as oracle_price
    FROM vault.multiply_events me
    JOIN vulcan2x.transaction t ON me.tx_id = t.id
    JOIN vulcan2x.block b ON me.block_id = b.id
    LEFT JOIN vault.events e ON me.standard_event_id = e.id
);
