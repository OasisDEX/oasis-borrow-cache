DELETE FROM automation_bot.trigger_added_events;
DELETE FROM automation_bot.trigger_removed_events;
DELETE FROM automation_bot.approval_granted_events;
DELETE FROM automation_bot.approval_removed_events;
DELETE FROM automation_bot.trigger_executed_events;
DELETE FROM vulcan2x.job WHERE name LIKE '%0x6A6561831dA6905DCDD6260b10Dcc26809A4c34d%'