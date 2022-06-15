drop view api.historic_token_prices;

create view api.historic_token_prices as with token as (
    select distinct token
    from oracles.prices
    where timestamp > CURRENT_DATE - interval '6 days'
),
price as (
    select token,
        price,
        timestamp,
        rank() over (
            partition by token
            order by timestamp desc
        ) as r
    from oracles.prices
    where timestamp > current_date - interval '6 days'
),
price_7 as (
    select token,
        price,
        timestamp,
        rank() over (
            partition by token
            order by timestamp desc
        ) as r
    from oracles.prices
    where timestamp between current_date - interval '12 days'
        and current_date - interval '6 days'
),
price_30 as (
    select token,
        price,
        timestamp,
        rank() over (
            partition by token
            order by timestamp desc
        ) as r
    from oracles.prices
    where timestamp between current_date - interval '35 days'
        and current_date - interval '29 days'
),
price_90 as (
    select token,
        price,
        timestamp,
        rank() over (
            partition by token
            order by timestamp desc
        ) as r
    from oracles.prices
    where timestamp between current_date - interval '95 days'
        and current_date - interval '89 days'
),
price_365 as (
    select token,
        price,
        timestamp,
        rank() over (
            partition by token
            order by timestamp desc
        ) as r
    from oracles.prices
    where timestamp between current_date - interval '370 days'
        and current_date - interval '364 days'
)
select t.token,
    price.price,
    price_7.price as price_7,
    price_30.price as price_30,
    price_90.price as price_90,
    price_365.price as price_365
from token t
    left join price on t.token = price.token
    and price.r = 1
    left join price_7 on t.token = price_7.token
    and price_7.r = 1
    left join price_30 on t.token = price_30.token
    and price_30.r = 1
    left join price_90 on t.token = price_90.token
    and price_90.r = 1
    left join price_365 on t.token = price_365.token
    and price_365.r = 1;