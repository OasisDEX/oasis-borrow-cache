CREATE TABLE leveraged.cdp (
  id         serial primary key,
  creator    character varying(66) not null,
  owner      character varying(66) not null,
  ilk        character varying(32) not null,
  urn        character varying(66) not null,
  address    character varying(66) not null,
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  timestamp  timestamptz not null,
  unique (log_index, tx_id)
);
CREATE INDEX leveraged_cdp_owner_index ON leveraged.cdp(owner);
CREATE INDEX leveraged_cdp_urn_index ON leveraged.cdp(urn);
