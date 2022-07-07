drop type if exists api.token_price cascade;
drop type if exists oracles.token_price cascade;
drop function if exists api.maker_oracle_token_prices(token varchar, date timestamp) cascade;

create type api.token_price as (token varchar(32), price decimal(78,18), timestamp timestamptz);

create type oracles.token_price as (token varchar(32), price decimal(78, 18), timestamp timestamptz);

create or replace function oracles.token_price_within_interval(token varchar(32), date timestamptz, days interval default '2 years')
    returns oracles.token_price
    language sql
as
$$
select
    p.token,
    p.price,
    p.timestamp
from oracles.prices p
where p.token = $1
  and p.timestamp between $2 - days and $2 + days
order by abs(extract(epoch from p.timestamp - $2))
    fetch first 1 rows only
$$;

create or replace function api.maker_oracle_token_prices(token varchar(32), date timestamptz)
    returns api.token_price
    language plpgsql
as
$$
declare
    result api.token_price;
begin
    select r.token, r.price, r.timestamp
    from oracles.token_price_within_interval(token, date, interval '1 day') r
    into result;

    if result is not null then
        return result;
    end if;

    select r.token, r.price, r.timestamp
    from oracles.token_price_within_interval(token, date, interval '5 day') r
    into result;

    if result is not null then
        return result;
    end if;

    select r.token, r.price, r.timestamp
    from oracles.token_price_within_interval(token, date, interval '30 day') r
    into result;

    if result is not null then
        return result;
    end if;

    select r.token, r.price, r.timestamp
    from oracles.token_price_within_interval(token, date, interval '180 day') r
    into result;

    if result is not null then
        return result;
    end if;

    select r.token, r.price, r.timestamp
    from oracles.token_price_within_interval(token, date) r
    into result;

    return result;
end;
$$;