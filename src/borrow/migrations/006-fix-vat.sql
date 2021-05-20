DELETE FROM vat.fork;
DELETE FROM vat.grab;

ALTER TABLE vault.events ADD ilk character varying(32) NULL;

DROP VIEW api.vault_events;
CREATE VIEW api.vault_events AS (
    SELECT e.*, t.hash
    FROM vault.events e 
    JOIN vulcan2x.transaction t ON e.tx_id = t.id
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
);
