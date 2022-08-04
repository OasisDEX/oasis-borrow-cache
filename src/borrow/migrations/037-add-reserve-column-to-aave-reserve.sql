-- truncate data from aave.reserve_data_updated

-- add new column similar to this:

alter table aave.reserve_data_updated add column reserve bytea not null;

-- delete from vulcan2x/jon WHERE name like 'aave-lending-pool-transformer%'