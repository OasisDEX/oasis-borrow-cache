CREATE SCHEMA vault;

CREATE TABLE vault.events (
    id                      serial primary key,
    kind                    character varying(20) not null,
    collateral_amount       decimal(78,18),
    dai_amount              decimal(78,18),
    rate                    decimal(78,18),
    vault_creator           character varying(66),
    depositor               character varying(66),
    urn                     character varying(66) not null,
    cdp_id                  character varying(66),
    transfer_from           character varying(66),
    transfer_to             character varying(66),

    timestamp               timestamptz not null,
    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index, kind)
);

CREATE INDEX vault_urn ON vault.events(urn);

CREATE VIEW api.vault_events AS (
    SELECT e.*, t.hash, COALESCE(m.cdp_id, null) as vault_id 
    FROM vault.events e, vulcan2x.transaction t, manager.cdp m 
    WHERE e.tx_id = t.id AND e.urn = m.urn
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
) 