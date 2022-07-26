DROP VIEW api.active_triggers;
CREATE VIEW api.active_triggers as
SELECT added.*
FROM automation_bot.trigger_added_events added
     LEFT JOIN automation_bot.trigger_removed_events removed ON added.trigger_id = removed.trigger_id
     LEFT JOIN automation_bot.trigger_executed_events executed ON added.trigger_id = executed.trigger_id
     LEFT JOIN automation_bot.trigger_group_added groupped ON added.trigger_id = groupped.trigger_id
WHERE removed.trigger_id IS NULL
     AND executed.trigger_id IS NULL;
     
CREATE VIEW api.active_trigger_groups as
select group_added.group_id,
     group_added.group_type,
     group_added.cdp_id,
     array_to_json(
          array_agg(
               json_build_object(
                    'triggerId',
                    added.trigger_id,
                    'commandAddress',
                    added.command_address -- everything else
               )
          )
     ) triggers
from automation_aggregator_bot.trigger_group_added_events group_added
     left join automation_bot.trigger_added_events added on added.group_id = group_added.group_id
group by 1,
     2,
     3;