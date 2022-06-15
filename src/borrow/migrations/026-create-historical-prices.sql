create view api.historic_token_prices as with token as (
    select distinct token
    from oracles.prices
    where timestamp > CURRENT_DATE - interval '92 days'
),
price as (
    select distinct on(token) token,
        avg(price) as price

    from oracles.prices
    where timestamp > current_date - interval '3 days'
    group by token
),
price_7 as (
    select distinct on(token) token,
        avg(price)  as price

    from oracles.prices
    where
    timestamp between current_date - interval '8 days' and current_date - interval '6 days'
    group by token
),
price_30 as (
    select distinct on(token) token,
        avg(price) as price

    from oracles.prices
    where

    timestamp between current_date - interval '31 days' and current_date - interval '29 days'
    group by token
),
price_90 as (
select distinct on(token) token,
        avg(price) as price

    from oracles.prices
	where

	timestamp between current_date - interval '91 days' and current_date - interval '89 days'
    group by token
)
select t.token,
    price.price,
    price_7.price as price_7,
    price_30.price as price_30,
    price_90.price as price_90
from token t
    left join price on t.token = price.token
    left join price_7 on t.token = price_7.token
    left join price_30 on t.token = price_30.token
    left join price_90 on t.token = price_90.token;