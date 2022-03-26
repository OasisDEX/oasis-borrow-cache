CREATE TABLE automation_bot.trigger_executed_events (
    id                  serial primary key,
    trigger_id          decimal(78, 0) not null,
    cdp_id              decimal(78,0) not null,
    vault_closed_event  integer REFERENCES vault.multiply_events(id),
    log_index           integer not null,
    tx_id               integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id            integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    UNIQUE (tx_id, log_index)
);

DROP VIEW api.active_triggers;

CREATE VIEW api.active_triggers AS
    SELECT added.*
    FROM automation_bot.trigger_added_events added
        LEFT JOIN automation_bot.trigger_removed_events removed
            ON added.trigger_id = removed.trigger_id
        LEFT JOIN automation_bot.trigger_executed_events executed
            ON added.trigger_id = executed.trigger_id
    WHERE removed.trigger_id IS NULL AND executed.trigger_id IS NULL;
