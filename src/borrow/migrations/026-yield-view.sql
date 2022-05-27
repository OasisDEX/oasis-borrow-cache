
-- const yieldResult = await services.tx.oneOrNone(
--   `
-- WITH one_day_yield AS (
--     SELECT Date_trunc('day', timestamp) AS day,
--         token,
--         price
-- )


--   WITH one_day_yield AS
--   (
--          SELECT Date_trunc('day', evt_block_time) AS day,
--                 ilk_text,
--                 ilk,
--                 price,
--                 time_min_7,
--                 price_min_7,
--                 dateminzeven,
--                 (price-price_min_7)/price_min_7       AS percentage_unlev,
--                 ((price-price_min_7)/price_min_7)*365 AS percentage_unlev_ann,
--                 ((((price-price_min_7)/price_min_7)*365)*50-(49*
--                 CASE
--                        WHEN evt_block_time < '2022-04-11 00:00' THEN 0.0025
--                        ELSE 0.0005
--                 END))*100 AS percentage_yield
--          FROM   (
--                           SELECT    a."evt_block_time",
--                                     Rtrim(Encode(a.ilk,'escape'),'\000') AS ilk_text,
--                                     a.ilk,
--                                     Bytea2numeric(a."val")/1E18              AS price,
--                                     b."evt_block_time"                       AS time_min_7,
--                                     Bytea2numeric(b."val")/1E18              AS price_min_7,
--                                     b."evt_block_time"    - interval'1 days' as dateminzeven
--                           FROM      makermcd."SPOT_evt_Poke" a
--                           LEFT JOIN makermcd."SPOT_evt_Poke" b
--                           ON        a."evt_block_time" - interval'1 days' >= b."evt_block_time"
--                           AND       a."evt_block_time" - interval'2 days' <= b."evt_block_time"
--                           WHERE     a.ilk='\x47554e49563344414955534443322d4100000000000000000000000000000000'
--                           AND       b.ilk='\x47554e49563344414955534443322d4100000000000000000000000000000000'
--                           AND       bytea2numeric(a."val")/1E18 > 0
--                           AND       bytea2numeric(b."val")/1E18 > 0
--                           ORDER BY  evt_block_time DESC ) AS foo
--          WHERE  evt_block_time > (now() - interval'60 days') ), 
--   daily AS
--   (
--            SELECT   date_trunc('day', one_day_yield.day)                                                                                 AS day,
--                     one_day_yield.percentage_yield                                                                                       AS daily_yield,
--                     avg(one_day_yield.percentage_yield) OVER (ORDER BY one_day_yield.day rows BETWEEN 7 PRECEDING AND      CURRENT row)  AS seven_day_yield,
--                     avg(one_day_yield.percentage_yield) OVER (ORDER BY one_day_yield.day rows BETWEEN 30 PRECEDING AND      CURRENT row) AS thirty_day_yield
--            FROM     one_day_yield
--            WHERE    day > (now() - interval'60 days') )
--   SELECT day,
--          daily_yield,
--          seven_day_yield,
--          thirty_day_yield
--   FROM   daily
--   WHERE  day > (now() - interval'30 days')`,
--   {
--     ilk: params.ilk,
--     timestart: params.timestart,
--     timeend: params.timeend
--   },
-- );


CREATE SCHEMA earn;

CREATE VIEW earn.yields AS (
WITH
    tokenPrices
    AS
    (
        SELECT Date_trunc('day', timestamp) AS day,
            token,
            price
        FROM vat.fold
    ),
    tokenPricesMin7Days
    AS
    (
        SELECT price
        FROM vat.fold
        WHERE CONVERT(datetime, timestamp,11)>= DATEADD(day,-7, GETDATE())
    )

    
);