ALTER TABLE automation_bot.trigger_added_events
    DROP COLUMN trigger_type;

ALTER TABLE automation_bot.trigger_added_events
    ADD COLUMN command_address character varying(66) not null;
