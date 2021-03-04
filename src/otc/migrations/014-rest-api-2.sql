CREATE VIEW rest_api.trade_details AS (
  SELECT
    t.id AS id,
    concat(base.symbol, '/', quote.symbol) AS market,
    t.base_amt AS base_vol,
    t.quote_amt AS quote_vol,
    t.price AS price,
    t.timestamp AS "time",
    t.offer_id AS offer_id,
    tx.hash AS tx,
    t.log_index AS idx
  FROM oasis_market.log_take t
    LEFT JOIN oasis.token base ON t.base_gem = base.key
    LEFT JOIN oasis.token quote ON t.quote_gem = quote.key
    JOIN vulcan2x.transaction tx ON t.tx_id = tx.id
);
