CREATE SCHEMA dai_join;

CREATE TABLE dai_join.exit (
    id         serial primary key,
    usr          character varying(66),
    wad       decimal(78,18) not null,

    log_index  integer not null,
    tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    timestamp  timestamptz not null,
    unique (log_index, tx_id)
);

CREATE TABLE dai_join.join (
    id         serial primary key,
    usr          character varying(66),
    wad       decimal(78,18) not null,
    
    log_index  integer not null,
    tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    timestamp  timestamptz not null,
    unique (log_index, tx_id)
);