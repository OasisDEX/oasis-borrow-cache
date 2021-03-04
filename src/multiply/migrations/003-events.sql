CREATE TABLE leveraged.event (
  id         serial primary key,
  type       character varying(16) not null,
  ilk        character varying(32),
  amount     decimal(78,18),
  pay_amount decimal(78,18),
  dgem       decimal(78,18),
  ddai       decimal(78,18),
  auction_id decimal(78),
  ink        decimal(78,18),
  lot        decimal(78,18),
  bid        decimal(78,18),
  tab        decimal(78,18),
  owner      character varying(66),
  address    character varying(66) not null,
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  timestamp  timestamptz not null,
  unique (log_index, tx_id)
);
CREATE INDEX leveraged_event_block_id_index ON leveraged.event(block_id);
CREATE INDEX leveraged_event_auction_id_index ON leveraged.event(auction_id);
CREATE INDEX leveraged_event_owner_index ON leveraged.event(owner);

CREATE VIEW api.leveraged_event AS (
    SELECT * FROM leveraged.event ORDER BY timestamp ASC, block_id ASC, log_index ASC
);
