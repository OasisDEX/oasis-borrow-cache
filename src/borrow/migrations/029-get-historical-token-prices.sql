
CREATE OR REPLACE FUNCTION api.get_historical_token_prices(token varchar(32), reference_date date, days integer[]) RETURNS TABLE(
  token varchar(32),
  price numeric(78, 18),
  days_ago integer,
  reference_date date,
  absolute_date date
) AS $$
SELECT DISTINCT ON(p.token, day) p.token,
                                 p.price,
                                 day as days_ago,
                                 $2 as reference_date,
                                 p.timestamp::date as absolute_date
FROM oracles.prices p JOIN unnest($3) day
                           ON p.timestamp::date = ($2 - INTERVAL '1 day' * day)::date
WHERE p.token = $1
$$ LANGUAGE SQL;