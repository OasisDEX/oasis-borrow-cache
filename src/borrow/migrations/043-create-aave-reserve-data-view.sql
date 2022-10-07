------------------------------
-- create materialized view --
------------------------------

create materialized view aave.reserve_data_daily_averages as
select avg(variable_borrow_rate)                         as variable_borrow_rate,
       reserve,
       date_trunc('day', b.timestamp at time zone 'utc') as date

from aave.reserve_data_updated rdu
         join vulcan2x.block b on rdu.block_id = b.id

group by 2, 3;

CREATE INDEX "reserve_data_daily_averages_reserve_idx" ON "aave"."reserve_data_daily_averages" ("reserve");
CREATE INDEX "reserve_data_daily_averages_date_idx" ON "aave"."reserve_data_daily_averages" ("date");

-------------------------------
-- create new yield function --
-------------------------------

create or replace function api.aave_yield_rate(start_date date, end_date date, multiple decimal, reserve_address text)
    returns api.yield
    language plpgsql
as
$$
declare
    result api.yield;
begin
    select avg(
                                   (post_total_pooled_ether - pre_total_pooled_ether) * 365 * 24 * 60 * 60 /
                                   (pre_total_pooled_ether * time_elapsed) * 100 * 0.9
                           * multiple - variable_borrow_rate * 100 / 1e27 * (multiple - 1)) as net_annualised_yield
    from lido.post_total_shares lpts
             join vulcan2x.block b on lpts.block_id = b.id
             join aave.reserve_data_daily_averages br
                  on br.date = date_trunc('day', b.timestamp at time zone 'utc') and br.reserve = reserve_address
    where br.date >= start_date
      and br.date <= end_date
    into result;
    -- details here: https://www.notion.so/oazo/Yield-calculation-for-stETH-ETH-1b70d660039a4587ae781410dbc4c5fb
    return result;
end;
$$;