CREATE VIEW api.oasis_trade_proxy as (
  SELECT
    otp.offer_id,
    otp.pair,
    otp.maker,
    otp.taker,
    otp.lot_gem,
    otp.lot_tkn,
    otp.lot_amt,
    otp.bid_gem,
    otp.bid_tkn,
    otp.bid_amt,
    otp."time",
    otp.idx,
    otp.tx,
    otp.market,
    otp.base,
    otp.quote,
    CASE
    WHEN lower(t.from_address) <> otp.taker and lower(t.from_address) <> otp.taker THEN t.to_address
    ELSE NULL
    END as proxy
  FROM api.oasis_trade_price otp
    LEFT JOIN vulcan2x.transaction t
      ON otp.tx = t.hash
);


CREATE VIEW api.oasis_daily_trade_proxy AS (
  SELECT date_trunc('day', time),
    count(offer_id) as total_trades,
    count(offer_id) filter (where proxy IS NOT NULL) as proxy_trades

  FROM api.oasis_trade_proxy GROUP BY date_trunc('day', time)
);


CREATE VIEW api.oasis_daily_trade_volume AS (
  SELECT sum(daily_trades.amount) AS sum,
    daily_trades.day,
    daily_trades.quote
  FROM ( SELECT
           CASE
           WHEN oasis_trade_price.quote::text = oasis_trade_price.lot_tkn::text THEN oasis_trade_price.lot_amt
           WHEN oasis_trade_price.quote::text = oasis_trade_price.bid_tkn::text THEN oasis_trade_price.bid_amt
           ELSE NULL::numeric
           END AS amount,
           oasis_trade_price.quote::text AS quote,
           oasis_trade_price.lot_tkn::text AS lot_tkn,
           oasis_trade_price.tx,
           date_trunc('day'::text, oasis_trade_price."time") AS day
         FROM api.oasis_trade_price) as daily_trades
  GROUP BY daily_trades.day, daily_trades.quote
);