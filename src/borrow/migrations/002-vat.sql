CREATE SCHEMA vat;

CREATE TABLE vat.frob (
    id         serial primary key,
    dart       decimal(78,0) not null,
    dink       decimal(78,0) not null,
    ilk        character varying(32) not null,
    u          character varying(66) not null,
    v          character varying(66) not null,
    w          character varying(66) not null,

    log_index  integer not null,
    tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    timestamp  timestamptz not null,
    unique (tx_id, log_index)
);

CREATE TABLE vat.fold (
    id         serial primary key,
    i          character varying(32) not null,
    rate       decimal(78,0) not null,
    u          character varying(66) not null,

    log_index  integer not null,
    tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    timestamp  timestamptz not null,
    unique (tx_id, log_index)
);

CREATE TABLE vat.fork(
    id         serial primary key,
    ilk        character varying(32) not null,
    src        character varying(66) not null,
    dst        character varying(66) not null,
    dink       decimal(78,0) not null,
    dart       decimal(78,0) not null,

    log_index  integer not null,
    tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    timestamp  timestamptz not null,
    unique (tx_id, log_index)
);

CREATE TABLE vat.grab(
    id         serial primary key,
    i          character varying(32) not null,
    u          character varying(66) not null,
    v          character varying(66) not null,
    w          character varying(66) not null,
    dink       decimal(78,0) not null,
    dart       decimal(78,0) not null,

    log_index  integer not null,
    tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    timestamp  timestamptz not null,
    unique (tx_id, log_index)
);