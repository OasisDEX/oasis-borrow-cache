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