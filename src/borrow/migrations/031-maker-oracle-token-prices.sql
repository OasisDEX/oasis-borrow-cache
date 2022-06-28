create type api.token_price as (token varchar(32), price numeric(78, 18), timestamp timestamp);

create or replace function api.maker_oracle_token_prices (token character varying, date timestamp default now())
    returns api.token_price
    language plpgsql
as
$$
declare
    found_item api.token_price;
begin
    select
        p.token,
        p.price,
        p.timestamp as date
    from oracles.prices p
    where p.token = $1 and p.price > 0 and
        p.timestamp between $2 and $2 + interval '1 day'
    order by abs(extract(epoch from p.timestamp - $2))
        fetch first 1 rows only
    into found_item;

    if found_item is not null then
        return found_item;
    end if;

    select
        p.token,
        p.price,
        p.timestamp as date
    from oracles.prices p
    where p.token = $1 and p.price > 0 and
        p.timestamp between $2 and $2 + interval '5 day'
    order by abs(extract(epoch from p.timestamp - $2))
        fetch first 1 rows only
    into found_item;

    if found_item is not null then
        return found_item;
    end if;

    select
        p.token,
        p.price,
        p.timestamp as date
    from oracles.prices p
    where p.token = $1 and p.price > 0 and
        p.timestamp::date between $2 and $2 + interval '30 day'
    order by abs(extract(epoch from p.timestamp - $2))
        fetch first 1 rows only
    into found_item;

    if found_item is not null then
        return found_item;
    end if;

    select
        p.token,
        p.price,
        p.timestamp as date
    from oracles.prices p
    where p.token = $1 and p.price > 0 and
        p.timestamp between $2 and $2 + interval '180 day'
    order by abs(extract(epoch from p.timestamp - $2))
        fetch first 1 rows only
    into found_item;

    if found_item is not null then
        return found_item;
    end if;

    select
        p.token,
        p.price,
        p.timestamp as date
    from oracles.prices p
    where p.token = $1 and p.price > 0
    order by abs(extract(epoch from p.timestamp - $2))
        fetch first 1 rows only
    into found_item;

    return found_item;
end;
$$;