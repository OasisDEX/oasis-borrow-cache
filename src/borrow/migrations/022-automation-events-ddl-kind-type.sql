-- command_alias table is for trigger_events VIEW.
-- Insertions are done when starting-etl.
-- command_addresses are network-specyfic, we use 1 db instance per network
 CREATE TABLE automation_bot.command_alias (
 	command_address varchar(66) PRIMARY KEY,
 	kind varchar(66) NULL
 );

CREATE VIEW api.trigger_events AS 
	SELECT id , trigger_id , cdp_id, tx_id , block_id , 'added' AS event_type, tae.command_address,  alias.kind  from automatiON_bot.trigger_added_events tae
	LEFT JOIN automation_bot.command_alias alias
	ON tae.command_address = alias.command_address
	UNION
	SELECT  tre.id , tre.trigger_id , tre.cdp_id, tre.tx_id , tre.block_id , 'removes' AS event_type, tae.command_address, alias.kind  from automatiON_bot.trigger_removed_events tre 
	LEFT JOIN automation_bot.trigger_added_events  tae
	ON tre.id = tae.id
	LEFT JOIN automatiON_bot.command_alias alias
	ON tae.command_address = alias.command_address
	UNION
	SELECT  tee.id , tee.trigger_id , tee.cdp_id, tee.tx_id , tee.block_id , 'executed' AS event_type, tae.command_address,  alias.kind  from automatiON_bot.trigger_executed_events tee
	LEFT JOIN automation_bot.trigger_added_events  tae
	ON tee.id = tae.id
	LEFT JOIN automation_bot.command_alias alias
	ON tae.command_address = alias.command_address;