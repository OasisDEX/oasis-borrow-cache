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