drop type if exists api.token_price cascade;

create type api.token_price as
(
    token     varchar(32),
    price     numeric(78, 18),
    timestamp timestamp with time zone,
    requested_timestamp timestamp with time zone
);

create or replace function oracles.token_price_within_interval(token character varying, date timestamptz, days interval DEFAULT '2 years'::interval)
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
  and p.price > 0
  and p.timestamp between $2 - days and $2 + days
order by abs(extract(epoch from p.timestamp - $2))
    fetch first 1 rows only
$$;

create or replace function api.maker_oracle_token_prices(token character varying, date timestamp with time zone) returns api.token_price
    language plpgsql
as
$$
declare
    result api.token_price;
begin
    select r.token, r.price, r.timestamp, $2 as requested_timestamp
    from oracles.token_price_within_interval(token, date, interval '1 day') r
    into result;

    if result is not null then
        return result;
    end if;

    select r.token, r.price, r.timestamp, $2 as requested_timestamp
    from oracles.token_price_within_interval(token, date, interval '5 day') r
    into result;

    if result is not null then
        return result;
    end if;

    select r.token, r.price, r.timestamp, $2 as requested_timestamp
    from oracles.token_price_within_interval(token, date, interval '30 day') r
    into result;

    if result is not null then
        return result;
    end if;

    select r.token, r.price, r.timestamp, $2 as requested_timestamp
    from oracles.token_price_within_interval(token, date, interval '180 day') r
    into result;

    if result is not null then
        return result;
    end if;

    select r.token, r.price, r.timestamp, $2 as requested_timestamp
    from oracles.token_price_within_interval(token, date) r
    into result;

    return result;
end;
$$;


create or replace function api.maker_oracle_token_prices_in_dates(token varchar(32), dates timestamptz[])
    returns setof api.token_price
    language plpgsql
as
$$
begin
    return query
        select r.token, r.price, r.timestamp, r.requested_timestamp
        from unnest($2) t left join lateral api.maker_oracle_token_prices(token, t) as r(token, price, timestamp, requested_timestamp) on true;
end;
$$;
