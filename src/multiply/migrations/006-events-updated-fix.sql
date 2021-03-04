ALTER TABLE leveraged.event RENAME COLUMN minPayAmount TO min_pay_amount;
ALTER TABLE leveraged.event RENAME COLUMN maxPayAmount TO max_pay_amount;

-- recreate leveraged_event view to make new fields avaiable
DROP VIEW api.leveraged_event;
CREATE VIEW api.leveraged_event AS (
    SELECT e.*, mp.price FROM leveraged.event e
    LEFT JOIN oasis_market.midpoint_price mp ON mp.block_id = e.block_id
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
);
