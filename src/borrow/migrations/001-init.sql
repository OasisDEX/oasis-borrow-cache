CREATE SCHEMA manager;

CREATE TABLE manager.cdp (
  id         serial primary key,
  creator    character varying(66) not null,
  owner      character varying(66) not null,
  address    character varying(66) not null,
  urn        character varying(66),
  cdp_id     character varying(66) not null,
  created_at timestamptz not null,

  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  unique (log_index, tx_id)
);
