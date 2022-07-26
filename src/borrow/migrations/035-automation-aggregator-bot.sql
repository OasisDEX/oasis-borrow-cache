CREATE SCHEMA automation_aggregator_bot;
CREATE TABLE automation_aggregator_bot.trigger_group_added_events (
    id serial primary key,
    group_id decimal(78, 0) not null,
    group_type decimal(78, 0) not null,
    cdp_id decimal(78, 0) not null,
    trigger_ids decimal(78, 0) [],
    log_index integer not null,
    tx_id integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);
CREATE TABLE automation_aggregator_bot.trigger_group_removed_events (
    id serial primary key,
    group_id decimal(78, 0) not null,
    trigger_ids decimal(78, 0) [],
    log_index integer not null,
    tx_id integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);
CREATE TABLE automation_bot.groupped_triggers (
    id serial primary key,
    group_id decimal(78, 0) not null,
    trigger_id decimal(78, 0),
    unique (group_id, trigger_id)
);