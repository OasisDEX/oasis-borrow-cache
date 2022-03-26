DROP VIEW api.vault_multiply_events;

ALTER TABLE multiply.method_called ALTER column method_name TYPE CHARACTER varying(66);

CREATE VIEW api.vault_multiply_events AS (
     SELECT e.method_name as kind, e.*, t.hash, b.timestamp, fl.due as fl_due, fl.borrowed as fl_borrowed, fp.amount as oazo_fee
    FROM multiply.method_called e
    JOIN vulcan2x.transaction t ON e.tx_id = t.id
    JOIN vulcan2x.block b ON e.block_id = b.id
    JOIN multiply.flashloan fl ON fl.tx_id = e.tx_id
    JOIN exchange.fee_paid fp ON fp.tx_id = e.tx_id
    ORDER BY block_id ASC, log_index ASC
);