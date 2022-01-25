DROP VIEW api.active_triggers;

ALTER TABLE automation_bot.trigger_added_events
    DROP COLUMN trigger_type;

DELETE FROM automation_bot.trigger_added_events;

ALTER TABLE automation_bot.trigger_added_events
    ADD COLUMN command_address character varying(66) not null;

CREATE VIEW api.active_triggers as 
    SELECT added.*
    FROM automation_bot.trigger_added_events added
    LEFT JOIN automation_bot.trigger_removed_events removed ON added.trigger_id = removed.trigger_id
    WHERE removed.trigger_id is null;
