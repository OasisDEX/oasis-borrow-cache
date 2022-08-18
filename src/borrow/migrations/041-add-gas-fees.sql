ALTER TABLE automation_bot.trigger_added_events
ADD COLUMN gas_fee decimal(78, 0);
ALTER TABLE automation_bot.trigger_added_events
ADD COLUMN eth_price decimal(78, 18);
ALTER TABLE automation_bot.trigger_removed_events
ADD COLUMN gas_fee decimal(78, 0);
ALTER TABLE automation_bot.trigger_removed_events
ADD COLUMN eth_price decimal(78, 18);
ALTER TABLE automation_bot.trigger_executed_events
ADD COLUMN gas_fee decimal(78, 0);
ALTER TABLE automation_bot.trigger_executed_events
ADD COLUMN eth_price decimal(78, 18);

DROP VIEW api.trigger_events ;

CREATE VIEW api.trigger_events AS (
	SELECT tae.id , trigger_id , tae.cdp_id, tae.log_index, tx.hash , b."number", b."timestamp" , 'added' AS event_type, tae.command_address,  alias.kind, tae.trigger_data, tae.group_id, tae.gas_fee, tae.eth_price, tga.group_type from automation_bot.trigger_added_events tae
	LEFT JOIN automation_bot.command_alias alias
	ON tae.command_address = alias.command_address
	LEFT JOIN vulcan2x."transaction" tx
	ON tx.id = tae.tx_id
	LEFT JOIN vulcan2x.block b
	ON b.id = tae.block_id
    LEFT JOIN automation_aggregator_bot.trigger_group_added_events tga
    ON tga.group_id = tae.group_id
	UNION
	SELECT  tre.id , tre.trigger_id , tre.cdp_id, tre.log_index , tx.hash , b."number", b."timestamp" ,'removed' AS event_type, tae.command_address, alias.kind, tae.trigger_data, tae.group_id, tre.gas_fee, tre.eth_price, tga.group_type  from automation_bot.trigger_removed_events tre
	LEFT JOIN automation_bot.trigger_added_events  tae
	ON tre.trigger_id = tae.trigger_id
	LEFT JOIN automation_bot.command_alias alias
	ON tae.command_address = alias.command_address
	LEFT JOIN vulcan2x."transaction" tx
	ON tx.id = tre.tx_id
	LEFT JOIN vulcan2x.block b
	ON b.id = tre.block_id
    LEFT JOIN automation_aggregator_bot.trigger_group_added_events tga
    ON tga.group_id = tae.group_id
	UNION
	SELECT  tee.id , tee.trigger_id , tee.cdp_id, tee.log_index , tx.hash , b."number", b."timestamp" ,'executed' AS event_type, tae.command_address,  alias.kind, tae.trigger_data, tae.group_id, tee.gas_fee, tee.eth_price ,tga.group_type from automation_bot.trigger_executed_events tee
	LEFT JOIN automation_bot.trigger_added_events  tae
	ON tee.trigger_id = tae.trigger_id
	LEFT JOIN automation_bot.command_alias alias
	ON tae.command_address = alias.command_address
	LEFT JOIN vulcan2x."transaction" tx
	ON tx.id = tee.tx_id
    LEFT JOIN automation_aggregator_bot.trigger_group_added_events tga
    ON tga.group_id = tae.group_id
	LEFT JOIN vulcan2x.block b
	ON b.id = tee.block_id
);