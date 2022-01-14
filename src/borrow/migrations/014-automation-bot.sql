CREATE SCHEMA automation_bot;

CREATE TABLE automation_bot.trigger_added_events (
    id                      serial primary key,
    trigger_id              decimal(78,0) not null,
    trigger_type            decimal(78,0) not null,
    cdp_id                  decimal(78,0) not null,
    trigger_data            varchar,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,

    unique (tx_id, log_index)
);

CREATE TABLE automation_bot.trigger_removed_events (
    id                      serial primary key,
    trigger_id              decimal(78,0) not null,
    trigger_type            decimal(78,0) not null,
    cdp_id                  decimal(78,0) not null,
    trigger_data            varchar,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,

    unique (tx_id, log_index)
);

CREATE TABLE automation_bot.approval_granted_events (
    id                      serial primary key,
    cdp_id                  decimal(78,0) not null,
    approved_entity         character varying(66) not null,
    emitter                 character varying(66),

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,

    unique (tx_id, log_index)
);


CREATE TABLE automation_bot.approval_removed_events (
    id                      serial primary key,
    cdp_id                  decimal(78,0) not null,
    approved_entity         character varying(66) not null,
    emitter                 character varying(66),

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,

    unique (tx_id, log_index)
);
