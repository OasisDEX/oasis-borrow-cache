CREATE SCHEMA redeemer;

CREATE TABLE redeemer.claim (
    id         serial primary key,
    "user"     character varying(66) not null,
    week       decimal(78,0) not null,
    amount     decimal(78,0) not null,
    redeemer   character varying(66) not null,

    log_index  integer not null,
    tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE INDEX claims ON redeemer.claim("user");

CREATE VIEW api.claims AS
    SELECT c.week, c.user as address, c.amount / 10^18 as amount, c.redeemer, t.hash as tx_hash, b.timestamp
    FROM redeemer.claim c
    LEFT JOIN vulcan2x.block b ON c.block_id = b.id
    LEFT JOIN vulcan2x.transaction t ON c.tx_id = t.id
    ORDER BY b.timestamp desc;
    