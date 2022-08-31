CREATE INDEX "reserve_index" ON "aave"."reserve_data_updated" ("reserve");

CREATE INDEX "reserve_data_updated_block_id_index" ON "aave"."reserve_data_updated" ("block_id");

CREATE INDEX "post_total_shares_block_id_index" ON "lido"."post_total_shares" ("block_id");

create index "block_timstamp_trunc_day_utc_index" on vulcan2x.block (date_trunc('day', vulcan2x.block.timestamp at time zone 'utc'));

create index "block_timstamp_utc_index" on vulcan2x.block ((vulcan2x.block.timestamp at time zone 'utc'));

create or replace function api.aave_yield_rate_steth_eth(start_date date, end_date date, multiple decimal)
    returns api.yield
    language plpgsql
as
$$
declare
    result api.yield;
begin
    with borrow_rates as (select avg(variable_borrow_rate) * 100 / 1e27            as variable_borrow_rate,
                                 date_trunc('day', b.timestamp at time zone 'utc') as date

                          from aave.reserve_data_updated rdu
                                   join vulcan2x.block b on rdu.block_id = b.id
                              and b.timestamp at time zone 'utc' >= start_date and
                                                            b.timestamp at time zone 'utc' <= end_date
                          where rdu.reserve = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'

                          group by 2)


    select avg(
                                   (post_total_pooled_ether - pre_total_pooled_ether) * 365 * 24 * 60 * 60 /
                                   (pre_total_pooled_ether * time_elapsed) * 100 * 0.9
                           * multiple - variable_borrow_rate * (multiple - 1)) as net_annualised_yield
    from lido.post_total_shares lpts
             join vulcan2x.block b on lpts.block_id = b.id
             join borrow_rates br on br.date = date_trunc('day', b.timestamp at time zone 'utc')
    where br.date >= start_date
      and br.date <= end_date
    into result;
    -- details here: https://www.notion.so/oazo/Yield-calculation-for-stETH-ETH-1b70d660039a4587ae781410dbc4c5fb
    return result;
end;
$$;