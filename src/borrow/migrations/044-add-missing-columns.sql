
ALTER TABLE automation_bot.trigger_added_events
ADD COLUMN trigger_type character varying(66) null;
ALTER TABLE automation_bot.trigger_added_events
ADD COLUMN continous character varying(5) null;