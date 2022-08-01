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
ALTER TABLE automation_bot.trigger_added_events
ADD COLUMN trigger_type decimal(78, 0);
DROP VIEW api.active_triggers;
CREATE VIEW api.active_triggers as
SELECT added.*
FROM automation_bot.trigger_added_events added
    LEFT JOIN automation_bot.trigger_removed_events removed ON added.trigger_id = removed.trigger_id
    LEFT JOIN automation_bot.trigger_executed_events executed ON added.trigger_id = executed.trigger_id
WHERE removed.trigger_id IS NULL
    AND executed.trigger_id IS NULL;
CREATE VIEW api.active_trigger_groups as
select b.group_id,
    a.group_type,
    b.cdp_id,
    array_agg(b.trigger_id) trigger_ids,
    array_agg(
        b.trigger_type
        order by b.trigger_type
    ) trigger_types,
    array_agg(b.command_address) trigger_commands
from automation_bot.trigger_added_events b
    left join automation_aggregator_bot.trigger_group_added_events a on a.group_id = b.group_id
    left join automation_bot.trigger_removed_events r ON b.trigger_id = r.trigger_id
    left join automation_bot.trigger_executed_events e ON b.trigger_id = e.trigger_id
where r.trigger_id is null
    AND e.trigger_id is null
    and b.group_id is not null
group by a.group_type,
    b.group_id,
    b.cdp_id
order by b.group_id asc;
CREATE VIEW api.active_trigger_ungroupped_groups AS
select b.group_id,
    a.group_type,
    b.cdp_id,
    b.trigger_id,
    b.trigger_type,
    b.command_address
from automation_bot.trigger_added_events b
    left join automation_aggregator_bot.trigger_group_added_events a on a.group_id = b.group_id
    left join automation_bot.trigger_removed_events r ON b.trigger_id = r.trigger_id
    left join automation_bot.trigger_executed_events e ON b.trigger_id = e.trigger_id
where r.trigger_id is null
    AND e.trigger_id is null
    and b.group_id is not null
order by b.group_id asc;