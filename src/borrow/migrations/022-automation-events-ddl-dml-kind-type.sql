-- command_alias table is for trigger_events VIEW.
-- Insertions are done when starting-etl.
-- command_addresses are network-specyfic, we use 1 db instance per network
 CREATE TABLE automation_bot.command_alias (
 	command_address varchar(66) PRIMARY KEY,
 	kind varchar(66) NULL
 );

-- CREATE view api.trigger_events as (
-- 	SELECT id , trigger_id , cdp_id, tx_id , block_id, command_address , 'added' as event_type  from automation_bot.trigger_added_events tae
-- 	UNION
-- 	SELECT  id , trigger_id , cdp_id, tx_id , block_id, command_address , 'removes' as event_type  from automation_bot.trigger_removed_events tre 
-- 	UNION 
-- 	SELECT  id , trigger_id , cdp_id, tx_id , block_id, command_address , 'executed' as event_type  from automation_bot.trigger_executed_events tee
-- );