DROP VIEW api.trigger_events ;

CREATE VIEW api.trigger_events AS (
	SELECT tae.id , trigger_id , cdp_id, tae.log_index, tx.hash , b."number", b."timestamp" , 'added' AS event_type, tae.command_address,  alias.kind, tae.trigger_data from automation_bot.trigger_added_events tae
	LEFT JOIN automation_bot.command_alias alias
	ON tae.command_address = alias.command_address
	LEFT JOIN vulcan2x."transaction" tx
	ON tx.id = tae.tx_id
	LEFT JOIN vulcan2x.block b
	ON b.id = tae.block_id
	UNION
	SELECT  tre.id , tre.trigger_id , tre.cdp_id, tre.log_index , tx.hash , b."number", b."timestamp" ,'removed' AS event_type, tae.command_address, alias.kind, tae.trigger_data  from automation_bot.trigger_removed_events tre
	LEFT JOIN automation_bot.trigger_added_events  tae
	ON tre.trigger_id = tae.trigger_id
	LEFT JOIN automation_bot.command_alias alias
	ON tae.command_address = alias.command_address
	LEFT JOIN vulcan2x."transaction" tx
	ON tx.id = tre.tx_id
	LEFT JOIN vulcan2x.block b
	ON b.id = tre.block_id
	UNION
	SELECT  tee.id , tee.trigger_id , tee.cdp_id, tee.log_index , tx.hash , b."number", b."timestamp" ,'executed' AS event_type, tae.command_address,  alias.kind, tae.trigger_data  from automation_bot.trigger_executed_events tee
	LEFT JOIN automation_bot.trigger_added_events  tae
	ON tee.trigger_id = tae.trigger_id
	LEFT JOIN automation_bot.command_alias alias
	ON tae.command_address = alias.command_address
	LEFT JOIN vulcan2x."transaction" tx
	ON tx.id = tee.tx_id
	LEFT JOIN vulcan2x.block b
	ON b.id = tee.block_id
);
