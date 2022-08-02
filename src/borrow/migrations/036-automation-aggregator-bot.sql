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
    cdp_id decimal(78, 0),
    log_index integer not null,
    tx_id integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);
CREATE TABLE automation_aggregator_bot.trigger_group_updated_events (
    id serial primary key,
    group_id decimal(78, 0) not null,
    cdp_id decimal(78, 0),
    new_trigger_id decimal(78, 0),
    trigger_type decimal(78, 0),
    log_index integer not null,
    tx_id integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);
ALTER TABLE automation_bot.trigger_added_events
ADD COLUMN group_id decimal(78, 0);
DROP VIEW api.active_triggers;
CREATE VIEW api.active_triggers as
SELECT added.*
FROM automation_bot.trigger_added_events added
    LEFT JOIN automation_bot.trigger_removed_events removed ON added.trigger_id = removed.trigger_id
    LEFT JOIN automation_bot.trigger_executed_events executed ON added.trigger_id = executed.trigger_id
WHERE removed.trigger_id IS NULL
    AND executed.trigger_id IS NULL;
CREATE VIEW api.active_groupped_triggers AS
SELECT b.group_id,
    a.group_type,
    b.cdp_id,
    b.trigger_id,
    b.command_address,
    b.trigger_data,
    b.block_id
FROM automation_bot.trigger_added_events b
    LEFT JOIN automation_aggregator_bot.trigger_group_added_events a ON a.group_id = b.group_id
    LEFT JOIN automation_bot.trigger_removed_events r ON b.trigger_id = r.trigger_id
    LEFT JOIN automation_bot.trigger_executed_events e ON b.trigger_id = e.trigger_id
WHERE r.trigger_id IS NULL
    AND e.trigger_id IS NULL
    AND b.group_id IS NOT NULL
ORDER BY b.group_id asc;