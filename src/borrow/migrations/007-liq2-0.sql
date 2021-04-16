CREATE SCHEMA clipper;
CREATE SCHEMA dog;
CREATE SCHEMA cat;

CREATE TABLE clipper.kick (
    id                      serial primary key,
    auction_id              character varying(66) not null,
    coin                    decimal(78,0) not null,
    kpr                     character varying(66) not null,
    lot                     decimal(78,0) not null,
    tab                     decimal(78,0) not null,
    top                     decimal(78,0) not null,
    usr                     character varying(66) not null,
    clipper                 character varying(66) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE TABLE clipper.take (
    id                      serial primary key,
    auction_id              character varying(66) not null,
    lot                     decimal(78,0) not null,
    max                     decimal(78,0) not null,
    owe                     decimal(78,0) not null,
    price                   decimal(78,0) not null,
    tab                     decimal(78,0) not null,
    usr                     character varying(66) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE TABLE clipper.redo (
    id                      serial primary key,
    auction_id              character varying(66) not null,
    coin                    decimal(78,0) not null,
    kpr                     character varying(66) not null,
    lot                     decimal(78,0) not null,
    tab                     decimal(78,0) not null,
    top                     decimal(78,0) not null,
    usr                     character varying(66) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE TABLE clipper.yank (
    id                      serial primary key,
    auction_id              character varying(66) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE TABLE dog.bark (
    id                      serial primary key,
    ilk                     character varying(32) not null,
    urn                     character varying(66) not null,
    ink                     decimal(78,0) not null,
    art                     decimal(78,0) not null,
    due                     decimal(78,0) not null,
    clip                    character varying(66) not null,
    auction_id              character varying(66) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

ALTER TABLE auctions.bite SET SCHEMA cat;
ALTER SCHEMA auctions RENAME TO flipper;

ALTER TABLE vault.events ADD liq_penalty VARCHAR(66) NULL;

DROP VIEW api.vault_events;

CREATE INDEX bark_clip ON dog.bark(clip);
CREATE INDEX bark_auction_id ON dog.bark(auction_id);

CREATE VIEW api.vault_events AS (
    SELECT e.*, t.hash 
    FROM vault.events e JOIN vulcan2x.transaction t ON e.tx_id = t.id 
    WHERE NOT e.kind = ''
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
);