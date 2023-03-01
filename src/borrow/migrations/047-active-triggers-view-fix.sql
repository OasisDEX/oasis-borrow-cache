DROP VIEW api.active_triggers;

CREATE VIEW api.active_triggers as
    SELECT added.*
    FROM automation_bot.trigger_added_events added
    LEFT JOIN automation_bot.trigger_removed_events removed ON added.trigger_id = removed.trigger_id
    LEFT JOIN automation_bot.trigger_executed_events executed ON added.trigger_id = executed.trigger_id
    WHERE removed.trigger_id is null AND executed.trigger_id is null;