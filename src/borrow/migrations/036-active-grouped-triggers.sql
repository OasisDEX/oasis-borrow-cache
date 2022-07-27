DROP VIEW api.active_triggers;
CREATE VIEW api.active_triggers as
SELECT added.*
FROM automation_bot.trigger_added_events added
     LEFT JOIN automation_bot.trigger_removed_events removed ON added.trigger_id = removed.trigger_id
     LEFT JOIN automation_bot.trigger_executed_events executed ON added.trigger_id = executed.trigger_id
     LEFT JOIN automation_bot.trigger_group_added groupped ON added.trigger_id = groupped.trigger_id
WHERE removed.trigger_id IS NULL
     AND executed.trigger_id IS NULL;

CREATE VIEW api.active_groupped_triggers as
SELECT added.*
FROM automation_bot.trigger_added_events added
     LEFT JOIN automation_bot.trigger_removed_events removed ON added.trigger_id = removed.trigger_id
     LEFT JOIN automation_bot.trigger_executed_events executed ON added.trigger_id = executed.trigger_id
     LEFT JOIN automation_bot.trigger_group_added groupped ON added.trigger_id = groupped.trigger_id
WHERE removed.trigger_id IS NULL
     AND executed.trigger_id IS NULL
     AND groupped.group_id IS NOT NULL;

CREATE VIEW api.active_trigger_groups as
SELECT added.*
FROM automation_aggregator_bot.trigger_group_added_events added
     LEFT JOIN automation_aggregator_bot.trigger_group_removed_events removed ON added.group_id = removed.group_id
WHERE removed.group_id IS NULL