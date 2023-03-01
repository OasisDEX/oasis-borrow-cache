CREATE SCHEMA aave_v3;

create sequence aave_v3.reserve_data_updated_id_seq
    as integer;


create table aave_v3.reserve_data_updated
(
    id                    serial primary key,
    liquidity_rate        numeric(78) not null,
    stable_borrow_rate    numeric(78) not null,
    variable_borrow_rate  numeric(78) not null,
    liquidity_index       numeric(78) not null,
    variable_borrow_index numeric(78) not null,
    log_index             integer     not null,
    tx_id                 integer     not null references vulcan2x.transaction
        on delete cascade,
    block_id              integer     not null references vulcan2x.block
        on delete cascade,
    reserve               varchar(50),
    unique (tx_id, log_index)
);


create materialized view aave_v3.reserve_data_daily_averages as
SELECT avg(rdu.variable_borrow_rate)                                 AS variable_borrow_rate,
       rdu.reserve,
       date_trunc('day'::text, timezone('utc'::text, b."timestamp")) AS date
FROM aave_v3.reserve_data_updated rdu
         JOIN vulcan2x.block b ON rdu.block_id = b.id
GROUP BY rdu.reserve, (date_trunc('day'::text, timezone('utc'::text, b."timestamp")));

create index reserve_data_daily_averages_reserve_idx_v3
    on aave_v3.reserve_data_daily_averages (reserve);

create index reserve_data_daily_averages_date_idx_v3
    on aave_v3.reserve_data_daily_averages (date);


create function api.aave_v3_yield_rate(start_date date, end_date date, multiple numeric,
                                       reserve_address text) returns api.yield
    language plpgsql
as
$$
declare
    result api.yield;
begin
    select avg(
                                   (lpts.post_total_pooled_ether - lpts.pre_total_pooled_ether) * 365 * 24 * 60 * 60 /
                                   (lpts.pre_total_pooled_ether * lpts.time_elapsed) * 100 * 0.9
                           * multiple - br.variable_borrow_rate * 100 / 1e27 * (multiple - 1)) as net_annualised_yield
    from lido.post_total_shares lpts
             join vulcan2x.block b on lpts.block_id = b.id
             join aave_v3.reserve_data_daily_averages br
                  on br.date = date_trunc('day', b.timestamp at time zone 'utc') and br.reserve = reserve_address
    where br.date >= start_date
      and br.date <= end_date
    into result;
    -- details here: https://www.notion.so/oazo/Yield-calculation-for-stETH-ETH-1b70d660039a4587ae781410dbc4c5fb
    return result;
end;
$$;
