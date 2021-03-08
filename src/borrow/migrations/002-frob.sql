CREATE SCHEMA vat;

CREATE TABLE vat.frob (
    id         serial primary key,
    dart       decimal(78,18) not null,
    dink       decimal(78,18) not null,
    ilk        character varying(32),
    u          character varying(66),
    v          character varying(66),
    w          character varying(66),
    cdp_id     character varying(66),

    log_index  integer not null,
    tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    timestamp  timestamptz not null,
    unique (log_index, tx_id)
);