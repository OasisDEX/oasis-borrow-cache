CREATE SCHEMA automation_bot;

CREATE TABLE automation_bot.triggers (
    id                      serial primary key,
    trigger_id              decimal(78,0) not null,
    trigger_type            decimal(78,0) not null,
    cdp_id                  decimal(78,0) not null,
    trigger_data            varchar,
    active                  boolean,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,

    removed_log_index       integer,
    removed_tx_id           integer REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    removed_block_id        integer REFERENCES vulcan2x.block(id) ON DELETE CASCADE,

    unique (tx_id, log_index)
);

CREATE TABLE automation_bot.approvals (
    id                      serial primary key,
    cdp_id                  decimal(78,0) not null,
    approved_entity         character varying(66) not null,
    active                  boolean,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,

    removed_log_index       integer,
    removed_tx_id           integer REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    removed_block_id        integer REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
 
    unique (tx_id, log_index)
);
