CREATE VIEW api.multiply_event AS (
    SELECT e.*, mp.price FROM leveraged.event e
    LEFT JOIN oasis_market.midpoint_price mp ON mp.block_id = e.block_id
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
);
