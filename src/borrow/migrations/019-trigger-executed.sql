CREATE TABLE automation_bot.trigger_executed_events (
    id  serial primary key,
    cdp_id                  decimal(78,0) not null,
    trigger_id decimal(78,0) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,

    unique (tx_id, log_index)
)