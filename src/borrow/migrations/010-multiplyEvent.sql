CREATE TABLE vault.multiply_events (
    id                              serial primary key,
    urn                             character varying(66) not null,
    standard_event_id               integer REFERENCES vault.events(id),

    kind                            character varying(50),
    market_price                    decimal(78,18),
    oracle_price                    decimal(78,18),
    before_collateral               decimal(78,18),
    collateral                      decimal(78,18),
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
  
    log_index                       integer not null,
    tx_id                           integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                        integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

DROP VIEW api.vault_events;

ALTER TABLE vault.events
ALTER COLUMN rate TYPE numeric(78,45);

CREATE VIEW api.vault_events AS (
    SELECT e.*, t.hash
    FROM vault.events e 
    JOIN vulcan2x.transaction t ON e.tx_id = t.id
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
);