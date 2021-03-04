CREATE VIEW api.oasis_trade AS (
 SELECT t.offer_id,
    t.pair,
    t.maker,
    t.taker,
    t.pay_gem AS lot_gem,
    lot.symbol AS lot_tkn,
    t.take_amt AS lot_amt,
    t.buy_gem AS bid_gem,
    bid.symbol AS bid_tkn,
    t.give_amt AS bid_amt,
    t."timestamp" AS "time",
    t.log_index AS idx,
    tx.hash AS tx
   FROM oasis.log_take t
     LEFT JOIN oasis.token lot ON lot.key::text = t.pay_gem::text
     LEFT JOIN oasis.token bid ON bid.key::text = t.buy_gem::text
     INNER JOIN vulcan2x.transaction tx ON t.tx_id = tx.id
);