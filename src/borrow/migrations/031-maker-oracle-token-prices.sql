create or replace function api.maker_oracle_token_prices(token character varying, date date)
    returns TABLE(token character varying, price numeric, date date)
    language sql
as
$$
select
        p.token,
        p.price,
        p.timestamp::date as date
    from oracles.prices p
    where p.token = $1 and p.price > 0
    order by abs(p.timestamp::date - $2)
    fetch first 1 rows only
$$;
