ALTER TABLE automation_bot.trigger_added_events
ADD COLUMN gas_fee decimal(78, 0);
ALTER TABLE automation_bot.trigger_added_events
ADD COLUMN eth_price decimal(78, 0);
ALTER TABLE automation_bot.trigger_removed_events
ADD COLUMN gas_fee decimal(78, 0);
ALTER TABLE automation_bot.trigger_removed_events
ADD COLUMN eth_price decimal(78, 0);