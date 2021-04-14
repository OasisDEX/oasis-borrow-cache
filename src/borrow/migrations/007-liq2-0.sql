CREATE TABLE auctions.bark (
    id                      serial primary key,
    ilk                     character varying(32) not null,
    urn                     character varying(66) not null,
    ink                     decimal(78,18) not null,
    art                     decimal(78,18) not null,
    due                     decimal(78,18) not null,
    clip                    character varying(66) not null,
    auction_id              character varying(66) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

DROP VIEW api.vault_events;

CREATE VIEW api.vault_events AS (
    SELECT e.*, t.hash FROM vault.events e JOIN vulcan2x.transaction t ON e.tx_id = t.id WHERE NOT e.kind = ''
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
);