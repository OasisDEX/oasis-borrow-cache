create or replace view lido.shares as
select ltr.pretotalether * 1e27 / ltr.pretotalshares   as pre_share_rate,
       ltr.posttotalether * 1e27 / ltr.posttotalshares as post_share_rate,
       ltr.timeelapsed,
       ltr.block_id
from lido.token_rebased ltr;


create or replace function api.aave_v3_yield_rate(start_date date, end_date date, multiple numeric,
                                                  reserve_address text) returns api.yield
    language plpgsql
as
$$
declare
    result api.yield;
begin
    with calculation as (select (lpts.post_total_pooled_ether - lpts.pre_total_pooled_ether) * 365 * 24 * 60 * 60 /
                                (lpts.pre_total_pooled_ether * lpts.time_elapsed) * 100 * 0.9 as calculations,
                                br.date,
                                br.variable_borrow_rate
                         from lido.post_total_shares lpts
                                  join vulcan2x.block b on lpts.block_id = b.id
                                  join aave_v3.reserve_data_daily_averages br
                                       on br.date = date_trunc('day', b.timestamp at time zone 'utc') and
                                          br.reserve = reserve_address
                         where br.date <= date_smaller('2023-05-15', end_date)
                           and br.date >= start_date
                         union
                         select (ltr.post_share_rate - ltr.pre_share_rate) * 365 * 24 * 60 * 60 /
                                (ltr.pre_share_rate * ltr.timeelapsed) * 100 * 0.9 as calculations,
                                br.date,
                                br.variable_borrow_rate
                         from lido.shares ltr
                                  join vulcan2x.block b on ltr.block_id = b.id
                                  join aave_v3.reserve_data_daily_averages br
                                       on br.date = date_trunc('day', b.timestamp at time zone 'utc') and
                                          br.reserve = reserve_address
                         where br.date >= date_larger('2023-05-15', start_date)
                           and br.date <= end_date)
    select avg(c.calculations * multiple - c.variable_borrow_rate * 100 / 1e27 * (multiple - 1)) as net_annualised_yield
    from calculation c
    into result;
    -- details here: https://www.notion.so/oazo/Yield-calculation-for-stETH-ETH-1b70d660039a4587ae781410dbc4c5fb
    return result;
end;
$$;


create or replace function api.aave_yield_rate(start_date date, end_date date, multiple numeric,
                                               reserve_address text) returns api.yield
    language plpgsql
as
$$
declare
    result api.yield;
begin
    with calculation as (select (lpts.post_total_pooled_ether - lpts.pre_total_pooled_ether) * 365 * 24 * 60 * 60 /
                                (lpts.pre_total_pooled_ether * lpts.time_elapsed) * 100 * 0.9 as calculations,
                                br.date,
                                br.variable_borrow_rate
                         from lido.post_total_shares lpts
                                  join vulcan2x.block b on lpts.block_id = b.id
                                  join aave.reserve_data_daily_averages br
                                       on br.date = date_trunc('day', b.timestamp at time zone 'utc') and
                                          br.reserve = reserve_address
                         where br.date <= date_smaller('2023-05-15', end_date)
                           and br.date >= start_date
                         union
                         select (ltr.post_share_rate - ltr.pre_share_rate) * 365 * 24 * 60 * 60 /
                                (ltr.post_share_rate * ltr.timeelapsed) * 100 * 0.9 as calculations,
                                br.date,
                                br.variable_borrow_rate
                         from lido.shares ltr
                                  join vulcan2x.block b on ltr.block_id = b.id
                                  join aave.reserve_data_daily_averages br
                                       on br.date = date_trunc('day', b.timestamp at time zone 'utc') and
                                          br.reserve = reserve_address
                         where br.date >= date_larger('2023-05-15', start_date)
                           and br.date <= end_date)
    select avg(c.calculations * multiple - c.variable_borrow_rate * 100 / 1e27 * (multiple - 1)) as net_annualised_yield
    from calculation c
    into result;
    -- details here: https://www.notion.so/oazo/Yield-calculation-for-stETH-ETH-1b70d660039a4587ae781410dbc4c5fb
    return result;
end;
$$;