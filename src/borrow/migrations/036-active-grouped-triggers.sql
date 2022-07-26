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