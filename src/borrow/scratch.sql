-- protocol APR

select post_total_pooled_ether / 1e9                 as post,
       pre_total_pooled_ether / 1e9                     pre,
       time_elapsed,
       b.timestamp,
       (post_total_pooled_ether - pre_total_pooled_ether) * 365 * 24 * 60 * 60 /
       (pre_total_pooled_ether * time_elapsed) * 100 as protocolApr
from lido.post_total_shares lpts
         join vulcan2x.block b on lpts.block_id = b.id
order by timestamp desc;

-- borrow rate

select date_trunc('day', timestamp) as time,
       avg
from aave.reserve_data_updated
         join vulcan2x.block b on reserve_data_updated.block_id = b.id
order by timestamp desc
limit 10;

