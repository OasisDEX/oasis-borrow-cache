ALTER TABLE oracles.prices ADD next_price decimal(78,18);

CREATE VIEW api.oracle_prices AS
    SELECT DISTINCT on (token)
        p.token, p.price, p.next_price, p.osm_address,
        b.number block_number, t.hash tx_hash
    FROM oracles.prices p
    LEFT JOIN vulcan2x.block b ON p.block_id = b.id
    LEFT JOIN vulcan2x.transaction t ON p.tx_id = t.id
    ORDER BY token, b.timestamp desc;
