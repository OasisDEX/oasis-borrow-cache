CREATE TABLE
    automation_bot.trigger_executed_events (
        id serial PRIMARY key,
        cdp_id DECIMAL(78, 0) NOT NULL,
        trigger_id DECIMAL(78, 0) NOT NULL,
        log_index INTEGER NOT NULL,
        tx_id INTEGER NOT NULL REFERENCES vulcan2x.transaction(id)
        ON DELETE CASCADE,
        block_id INTEGER NOT NULL REFERENCES vulcan2x.block(id)
        ON DELETE CASCADE,
        UNIQUE (tx_id, log_index)
    )