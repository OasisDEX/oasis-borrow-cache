CREATE VIEW api.historic_token_prices as (
    with token as (
        select distinct token
        from oracles.prices
    ),
    price as (
        select distinct on(token) token,
            price,
            timestamp as timestamp
        from oracles.prices
        where timestamp > current_date - interval '2 days'
        order by token,
            timestamp desc
    ),
    price_7 as (
        select distinct on(token) token,
            price as price_7,
            timestamp as timestamp_7
        from oracles.prices
        where timestamp < current_date - interval '7 days'
            and timestamp > current_date - interval '8 days'
        order by token,
            timestamp desc
    ),
    price_30 as (
        select distinct on(token) token,
            price as price_30,
            timestamp as timestamp_30
        from oracles.prices
        where timestamp < current_date - interval '30 days'
            and timestamp > current_date - interval '31 days'
        order by token,
            timestamp desc
    ),
    price_90 as (
        select distinct on(token) token,
            price as price_90,
            timestamp as timestamp_90
        from oracles.prices
        where timestamp < current_date - interval '90 days'
            and timestamp > current_date - interval '91 days'
        order by token,
            timestamp desc
    )
    select t.token,
        price.price,
        price.timestamp,
        price_7.price_7,
        price_7.timestamp_7,
        price_30.price_30,
        price_30.timestamp_30,
        price_90.price_90,
        price_90.timestamp_90
    from token t
        left join price on t.token = price.token
        left join price_7 on t.token = price_7.token
        left join price_30 on t.token = price_30.token
        left join price_90 on t.token = price_90.token
);