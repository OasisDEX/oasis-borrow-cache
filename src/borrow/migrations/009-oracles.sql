CREATE SCHEMA oracles;

CREATE TABLE oracles.prices (
    id         serial primary key,
    price      decimal(78,18),
    token      character varying(32) not null,

    log_index  integer not null,
    tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    timestamp  timestamptz not null,
    unique (tx_id, log_index)
);

CREATE INDEX oracles_prices_index ON oracles.prices(token,block_id);