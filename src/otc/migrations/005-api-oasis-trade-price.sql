CREATE VIEW api.oasis_trade_price as (
SELECT t.offer_id,
  t.pair,
  t.maker,
  t.taker,
  t.lot_gem,
  t.lot_tkn,
  t.lot_amt,
  t.bid_gem,
  t.bid_tkn,
  t.bid_amt,
  t."time",
  t.idx,
  t.tx,
  t.market,
  m.base,
  m.quote,
  CASE
  WHEN m.base::text = t.lot_tkn::text THEN t.bid_amt / t.lot_amt
  WHEN m.base::text = t.bid_tkn::text THEN t.lot_amt / t.bid_amt
  ELSE NULL::numeric
  END AS price
FROM ( SELECT oasis_trade.offer_id,
         oasis_trade.pair,
         oasis_trade.maker,
         oasis_trade.taker,
         oasis_trade.lot_gem,
         oasis_trade.lot_tkn,
         oasis_trade.lot_amt,
         oasis_trade.bid_gem,
         oasis_trade.bid_tkn,
         oasis_trade.bid_amt,
         oasis_trade."time",
         oasis_trade.idx,
         oasis_trade.tx,
         concat(oasis_trade.bid_tkn, oasis_trade.lot_tkn) AS market
       FROM api.oasis_trade) t
  LEFT JOIN oasis.market m ON t.market = m.id::text
);