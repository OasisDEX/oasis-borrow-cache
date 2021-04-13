CREATE TABLE auctions.bark (
    id                      serial primary key,
    ilk                     character varying(32) not null,
    urn                     character varying(66) not null,
    ink                     decimal(78,18) not null,
    art                     decimal(78,18) not null,
    due                     decimal(78,18) not null,
    clip                    character varying(66)  not null,
    auction_id              character varying(66) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);