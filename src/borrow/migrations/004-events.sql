CREATE SCHEMA vault 

CREATE TABLE vault.events (
    id                      serial primary key,
    kind                    character varying(20) not null,
    collateral_amount       decimal(78,18),
    dai_amount              decimal(78,18),
    vault_creator           character varying(66),
    depositor               character varying(66),
    urn                     character varying(66) not null,
    v_gem                   character varying(66),
    w_dai                   character varying(66),
    cdp_id                  character varying(66),
    transfer_from           character varying(66),
    transfer_to             character varying(66),

    timestamp               timestamptz not null,
    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
)

CREATE INDEX vault_urn ON vault.events(urn);

CREATE VIEW api.vault_events AS (
    SELECT e.*, t.hash FROM vault.events e, vulcan2x.transaction t WHERE e.tx_id = t.id
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
) 