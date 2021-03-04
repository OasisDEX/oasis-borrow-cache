DROP FUNCTION api.trades_aggregated;

CREATE FUNCTION api.trades_aggregated(time_unit VARCHAR, tz_offset INTERVAL, date_arg TIMESTAMP, base_gem_arg VARCHAR, quote_gem_arg VARCHAR)
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
  SELECT * FROM (SELECT
      base.symbol AS base_gem,
      quote.symbol AS quote_gem,
      (array_agg(t.price ORDER BY timestamp ASC, log_index ASC))[1] AS open,
      (array_agg(t.price ORDER BY timestamp DESC, log_index DESC))[1] AS close,
      MIN(t.price) AS min,
      MAX(t.price) AS max,
      SUM(t.base_amt) AS volume_base,
      SUM(t.quote_amt) AS volume_quote,
      date_trunc(time_unit, t.timestamp AT TIME ZONE tz_offset) AS date
    FROM (
      SELECT * FROM oasis_market.log_take WHERE base_amt > 0.000000000001 AND quote_amt > 0.000000000001
    ) t
      LEFT JOIN oasis.token base ON t.base_gem = base.key
      LEFT JOIN oasis.token quote ON t.quote_gem = quote.key
    GROUP BY date, base.symbol, quote.symbol
    ORDER BY date ASC
  ) x
  WHERE
    base_gem=base_gem_arg AND quote_gem=quote_gem_arg AND
    date >= date_arg
;
$$ LANGUAGE sql STABLE STRICT;
