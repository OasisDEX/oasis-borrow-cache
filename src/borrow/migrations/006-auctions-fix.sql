DELETE FROM vault.events WHERE kind = 'AUCTION_STARTED';

DROP VIEW api.vault_events;

CREATE VIEW api.vault_events AS (
    SELECT e.*, t.hash, COALESCE(m.cdp_id, null) as vault_id FROM vault.events e, vulcan2x.transaction t, manager.cdp m WHERE e.tx_id = t.id AND e.urn = m.urn AND NOT e.kind = ''
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
);
