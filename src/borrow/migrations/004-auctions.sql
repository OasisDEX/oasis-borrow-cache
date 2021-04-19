CREATE SCHEMA cat;
CREATE SCHEMA flipper;

CREATE TABLE cat.bite (
    id                      serial primary key,
    ilk                     character varying(32) not null,
    urn                     character varying(66) not null,
    ink                     decimal(78,0) not null,
    art                     decimal(78,0) not null,
    tab                     decimal(78,0) not null,
    flip                    character varying(66)  not null,
    auction_id              character varying(66) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE TABLE flipper.kick (
    id                      serial primary key,
    auction_id              character varying(66) not null,
    lot                     decimal(78,0) not null,
    bid                     decimal(78,0) not null,
    tab                     decimal(78,0) not null,
    usr                     character varying(66) not null,
    gal                     character varying(66) not null,
    flipper                 character varying(66) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE TABLE flipper.tend (
    id                      serial primary key,
    auction_id              character varying(66) not null,
    lot                     decimal(78,0) not null,
    bid                     decimal(78,0) not null,
    flipper                 character varying(66) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE TABLE flipper.dent (
    id                      serial primary key,
    auction_id              character varying(66) not null,
    lot                     decimal(78,0) not null,
    bid                     decimal(78,0) not null,
    flipper                 character varying(66) not null,
    
    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE TABLE flipper.deal (
    id                      serial primary key,
    auction_id              character varying(66) not null,
    flipper                 character varying(66) not null,
    
    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

ALTER TABLE vault.events ADD collateral VARCHAR(66) NULL;
ALTER TABLE vault.events ADD auction_id VARCHAR(66) NULL;
