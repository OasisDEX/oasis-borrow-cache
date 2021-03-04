CREATE SCHEMA leveraged;

CREATE TABLE leveraged.proxy (
  id         serial primary key,
  owner      character varying(66) not null,
  proxy      character varying(66) not null,
  
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  unique (log_index, tx_id),
  unique (owner, proxy)
);
CREATE INDEX leveraged_proxy_owner_index ON leveraged.proxy(owner);
CREATE INDEX leveraged_proxy_proxy_index ON leveraged.proxy(proxy);