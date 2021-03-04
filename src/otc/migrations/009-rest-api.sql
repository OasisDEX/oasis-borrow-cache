CREATE SCHEMA rest_api;

CREATE VIEW rest_api.trade AS (
  SELECT
    concat(base.symbol, '/', quote.symbol) AS market,
    t.base_amt AS base_vol,
    t.quote_amt AS quote_vol,
    t.price AS price,
    t.timestamp AS "time"
  FROM oasis_market.log_take t
    LEFT JOIN oasis.token base ON t.base_gem = base.key
    LEFT JOIN oasis.token quote ON t.quote_gem = quote.key
);

CREATE FUNCTION rest_api.market(period INTERVAL)
RETURNS TABLE (
  market VARCHAR,
  low DECIMAL,
  high DECIMAL,
  vol DECIMAL,
  price DECIMAL,
  last DECIMAL
) AS $$
  SELECT
    market,
    MIN(price) AS low,
    MAX(price) AS high,
    SUM(base_vol) AS vol,
    SUM(quote_vol)/SUM(base_vol) AS price,
    (array_agg(price ORDER BY time DESC))[1] AS last
  FROM rest_api.trade trade
  WHERE time > NOW() - period
  GROUP BY market;
$$ LANGUAGE sql STABLE STRICT;

CREATE VIEW rest_api.market_24hours AS SELECT * FROM rest_api.market('24 hours');
CREATE VIEW rest_api.market_12hours AS SELECT * FROM rest_api.market('12 hours');
CREATE VIEW rest_api.market_6hours AS SELECT * FROM rest_api.market('6 hours');
CREATE VIEW rest_api.market_1hour AS SELECT * FROM rest_api.market('1 hour');
