DROP VIEW api.active_triggers;

DELETE FROM automation_bot.trigger_added_events;
DELETE FROM automation_bot.trigger_removed_events;

CREATE VIEW api.active_triggers as 
    SELECT added.*
    FROM automation_bot.trigger_added_events added
    LEFT JOIN automation_bot.trigger_removed_events removed ON added.trigger_id = removed.trigger_id
    WHERE removed.trigger_id is null;
