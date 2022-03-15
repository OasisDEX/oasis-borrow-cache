ALTER TABLE automation_bot.trigger_added_events
	ADD column kind character varying (66);
		
UPDATE automation_bot.trigger_added_events 
	SET kind = 'stop-loss'
	WHERE kind = null ;
	
ALTER TABLE automation_bot.trigger_removed_events 
	ADD column kind character varying (66);
		
UPDATE automation_bot.trigger_removed_events 
	SET kind = 'stop-loss'
	WHERE kind = null ;
	
ALTER TABLE automation_bot.trigger_executed_events  
	ADD column kind character varying (66);
		
UPDATE automation_bot.trigger_executed_events  
	SET kind = 'stop-loss'
	WHERE kind = null ;

ALTER TABLE automation_bot.trigger_added_events 
	ADD column event_type character varying (66);

UPDATE automation_bot.trigger_added_events 
	SET event_type = 'added'
	WHERE kind = null ;
	
ALTER TABLE automation_bot.trigger_removed_events  
	ADD column event_type character varying (66);

UPDATE automation_bot.trigger_removed_events 
	SET event_type = 'removed'
	WHERE kind = null ;	
	
ALTER TABLE automation_bot.trigger_executed_events 
	ADD column event_type character varying (66);

UPDATE automation_bot.trigger_executed_events
	SET event_type = 'executed'
	WHERE kind = null ;	

CREATE view api.trigger_events as (
	SELECT id , trigger_id , cdp_id, tx_id , block_id, kind , event_type  from automation_bot.trigger_added_events tae
	UNION
	SELECT  id , trigger_id , cdp_id, tx_id , block_id, kind , event_type  from automation_bot.trigger_removed_events tre 
	UNION 
	SELECT  id , trigger_id , cdp_id, tx_id , block_id, kind , event_type  from automation_bot.trigger_executed_events tee 
);