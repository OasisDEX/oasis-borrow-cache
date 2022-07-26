DROP VIEW api.active_triggers;
CREATE VIEW api.active_triggers AS
SELECT added.*
FROM automation_bot.trigger_added_events added
     LEFT JOIN automation_bot.trigger_removed_events removed ON added.trigger_id = removed.trigger_id
     LEFT JOIN automation_bot.trigger_executed_events executed ON added.trigger_id = executed.trigger_id
     LEFT JOIN automation_bot.trigger_group_added groupped ON added.trigger_id = groupped.trigger_id
WHERE removed.trigger_id IS NULL
     AND executed.trigger_id IS NULL
     AND groupped.group_id IS NULL;
     
CREATE VIEW api.active_trigger_groups as
SELECT added.*,
     Group_id
FROM automation_bot.trigger_added_events added
     LEFT JOIN automation_bot.trigger_removed_events removed ON added.trigger_id = removed.trigger_id
     LEFT JOIN automation_bot.trigger_executed_events executed ON added.trigger_id = executed.trigger_id
     LEFT JOIN automation_bot.trigger_group_added groupped ON added.trigger_id = groupped.trigger_id
WHERE removed.trigger_id IS NULL
     AND executed.trigger_id IS NULL
     AND groupped.group_id IS NOT NULL;