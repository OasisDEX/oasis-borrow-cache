DROP VIEW api.oasis_daily_trade_volume;
DROP VIEW api.oasis_daily_trade_proxy;
DROP VIEW api.oasis_trade_proxy;
DROP VIEW api.oasis_trade_price;
DROP VIEW api.oasis_trade;

CREATE VIEW api.oasis_trade AS (
  SELECT t.offer_id,
    t.maker,
    t.taker,
    t.base_gem,
    t.base_amt,
    bt.symbol AS base_tkn,
    t.quote_gem,
    t.quote_amt,
    qt.symbol AS quote_tkn,
    t."timestamp" AS "time",
    tx.hash AS tx,
    tx.to_address,
    tx.from_address,
    t.quote_amt / t.base_amt AS price,
    t.type
  FROM oasis_market.log_take t
    LEFT JOIN oasis.token qt ON qt.key = t.quote_gem
    LEFT JOIN oasis.token bt ON bt.key = t.base_gem
    JOIN vulcan2x.transaction tx ON t.tx_id = tx.id
);

CREATE VIEW api.oasis_trade_proxy AS (
  SELECT
    otp.*,
    ka.name AS proxy_name,
    kaa.name AS proxy_exec_name
  FROM ( SELECT
           ot.*,
           CASE
           WHEN ot.from_address <> ot.taker THEN ot.to_address
           ELSE NULL::character varying
           END AS proxy
         FROM api.oasis_trade ot) otp
    LEFT JOIN vulcan2x.enhanced_transaction et ON et.hash = otp.tx
    LEFT JOIN vulcan2x.known_address ka ON ka.address = otp.proxy
    LEFT JOIN vulcan2x.known_address kaa ON kaa.address = et.arg0
  ORDER BY otp."time"
);