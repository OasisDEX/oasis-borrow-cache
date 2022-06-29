create type api.token_price as (token varchar(32), price numeric(78, 18), timestamp timestamp);

create or replace function api.maker_oracle_token_prices(token character varying, date timestamp without time zone DEFAULT now()) returns api.token_price
    language plpgsql
as
$$
declare
    found_item api.token_price;
begin
    create or replace function token_price_interval(token varchar(32), date timestamp, days interval)
        returns api.token_price
        language plpgsql
    as
    $inner$
    declare
        result api.token_price;
    begin
        select
            p.token,
            p.price,
            p.timestamp
        from oracles.prices p
        where p.token = $1
          and p.timestamp between $2 - days and $2 + days
        order by abs(extract(epoch from p.timestamp - $2))
            fetch first 1 rows only
        into result;

        return result;
    end;
    $inner$;

    select
        r.token,
        r.price,
        r.timestamp
    from token_price_interval(token, date, interval '1 day') r
    into found_item;

    if found_item is not null then
        return found_item;
    end if;

    select
        r.token,
        r.price,
        r.timestamp
    from token_price_interval(token, date, interval '5 day') r
    into found_item;

    if found_item is not null then
        return found_item;
    end if;

    select
        r.token,
        r.price,
        r.timestamp
    from token_price_interval(token, date, interval '30 day') r
    into found_item;

    if found_item is not null then
        return found_item;
    end if;

    select
        r.token,
        r.price,
        r.timestamp
    from token_price_interval(token, date, interval '180 day') r
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