-- 17229847 is a block number when AutomationV2 (Bot) was deployed
delete from automation_bot.trigger_removed_events where trigger_id >= 1000000000 and block_id < (select id from vulcan2x.block b where b."number" = 17229847);
delete from automation_bot.trigger_executed_events  where trigger_id >= 1000000000 and block_id < (select id from vulcan2x.block b where b."number" = 17229847);
delete from automation_bot.trigger_added_events where  trigger_id >= 1000000000 and block_id < (select id from vulcan2x.block b where b."number" = 17229847);