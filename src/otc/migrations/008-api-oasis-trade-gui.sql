CREATE VIEW api.oasis_trade_gui AS (
  SELECT
    t.offer_id AS offer_id,
    t.timestamp AS "timestamp",
    tx.hash AS tx,
    t.log_index AS log_index,
    t.maker AS maker,
    t.taker AS taker,
    base.symbol AS base_gem,
    quote.symbol AS quote_gem,
    t.base_amt AS base_amt,
    t.quote_amt AS quote_amt,
    t.price AS price,
    t.type AS type
  FROM oasis_market.log_take t
    LEFT JOIN oasis.token base ON t.base_gem = base.key
    LEFT JOIN oasis.token quote ON t.quote_gem = quote.key
    LEFT JOIN vulcan2x.transaction tx ON t.tx_id = tx.id
);

CREATE FUNCTION api.trades_aggregated(time_unit VARCHAR, tz_offset INTERVAL)
RETURNS TABLE (
  base_gem VARCHAR,
  quote_gem VARCHAR,
  open DECIMAL(28,18),
  close DECIMAL(28,18),
  min DECIMAL(28,18),
  max DECIMAL(28,18),
  volume_base DECIMAL(28,18),
  volume_quote DECIMAL(28,18),
  date TIMESTAMP
) AS $$
  SELECT
    base.symbol AS base_gem,
    quote.symbol AS quote_gem,
    (array_agg(t.price ORDER BY timestamp ASC))[1] AS open,
    (array_agg(t.price ORDER BY timestamp DESC))[1] AS close,
    MIN(t.price) AS min,
    MAX(t.price) AS max,
    SUM(t.base_amt) AS volume_base,
    SUM(t.quote_amt) AS volume_quote,
    date_trunc(time_unit, t.timestamp AT TIME ZONE tz_offset) AS date
  FROM oasis_market.log_take t
    LEFT JOIN oasis.token base ON t.base_gem = base.key
    LEFT JOIN oasis.token quote ON t.quote_gem = quote.key
  GROUP BY date, base.symbol, quote.symbol
  ORDER BY date ASC;
$$ LANGUAGE sql STABLE STRICT;
