CREATE SCHEMA multiply;

CREATE TABLE multiply.method_called (
    id                          serial primary key,
    method_name                 character varying(32) not null,
    cdp_id                      character varying(66) not null,
    ilk                         character varying(32) not null,
    liquidation_ratio           decimal(4,2) not null,
    
    swap_min_amount             decimal(78,0) not null,
    swap_optimist_amount        decimal(78,0) not null,
    collateral_left             decimal(78,0) not null,
    dai_left                    decimal(78,0) not null,

    log_index                   integer not null,
    tx_id                       integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                    integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE TABLE multiply.flashloan (
    id                          serial primary key,
    borrowed                    decimal(78,0) not null,
    due                         decimal(78,0) not null,

    log_index                   integer not null,
    tx_id                       integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                    integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE INDEX multiply_method_called ON multiply.method_called(tx_id);
CREATE INDEX multiply_flashloan ON multiply.flashloan(tx_id);

CREATE SCHEMA exchange;

CREATE TABLE exchange.asset_swap (
    id                          serial primary key,
    asset_in                    character varying(66) not null,
    asset_out                   character varying(66) not null,
    amount_in                   decimal(78,0) not null,
    amount_out                  decimal(78,0) not null,

    log_index                   integer not null,
    tx_id                       integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                    integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE TABLE exchange.fee_paid (
    id                          serial primary key,
    beneficiary                 character varying(66) not null,
    amount                      decimal(78,0) not null,

    log_index                   integer not null,
    tx_id                       integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                    integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE TABLE exchange.slippage_saved (
    id                          serial primary key,
    minimum_possible            decimal(78,0) not null,
    actual_amount               decimal(78,0) not null,

    log_index                   integer not null,
    tx_id                       integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                    integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE SCHEMA oracles;

CREATE TABLE oracles.prices (
    id          serial primary key,
    price       decimal(78,18),
    token       character varying(32) not null,
    osm_address character varying(66) not null,

    log_index  integer not null,
    tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    timestamp  timestamptz not null,
    unique (tx_id, log_index, token)
);

CREATE INDEX oracles_prices_index ON oracles.prices(token,block_id);

ALTER TABLE vault.events ADD oracle_price decimal(78,18) NULL;

DROP VIEW api.vault_events;
CREATE VIEW api.vault_events AS (
    SELECT e.*, t.hash
    FROM vault.events e 
    JOIN vulcan2x.transaction t ON e.tx_id = t.id
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
);

CREATE VIEW api.vault_multiply_events AS (
     SELECT e.method_name as kind, e.*, t.hash, b.timestamp, fl.due as fl_due, fl.borrowed as fl_borrowed, fp.amount as oazo_fee
    FROM multiply.method_called e 
    JOIN vulcan2x.transaction t ON e.tx_id = t.id
    JOIN vulcan2x.block b ON e.block_id = b.id
    JOIN multiply.flashloan fl ON fl.tx_id = e.tx_id 
    JOIN exchange.fee_paid fp ON fp.tx_id = e.tx_id
    ORDER BY block_id ASC, log_index ASC
);