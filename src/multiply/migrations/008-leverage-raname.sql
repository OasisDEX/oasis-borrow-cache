DROP VIEW api.multiply_event;
DROP SCHEMA leveraged CASCADE;
CREATE SCHEMA multiply;

CREATE TABLE multiply.proxy (
  id         serial primary key,
  owner      character varying(66) not null,
  proxy      character varying(66) not null,
  
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  unique (log_index, tx_id),
  unique (owner, proxy)
);
CREATE INDEX multiply_proxy_owner_index ON multiply.proxy(owner);
CREATE INDEX multiply_proxy_proxy_index ON multiply.proxy(proxy);

CREATE TABLE multiply.cdp (
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
CREATE INDEX multiply_cdp_owner_index ON multiply.cdp(owner);
CREATE INDEX multiply_cdp_urn_index ON multiply.cdp(urn);

CREATE TABLE multiply.event (
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
  min_pay_amount decimal(78,18),
  max_pay_amount decimal(78,18),
  owner      character varying(66),
  address    character varying(66) not null,
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  timestamp  timestamptz not null,
  unique (log_index, tx_id)
);
CREATE INDEX multiply_event_block_id_index ON multiply.event(block_id);
CREATE INDEX multiply_event_auction_id_index ON multiply.event(auction_id);
CREATE INDEX multiply_event_owner_index ON multiply.event(owner);

CREATE VIEW api.multiply_event AS (
    SELECT * FROM multiply.event ORDER BY timestamp ASC, block_id ASC, log_index ASC
);

DROP VIEW api.multiply_event;
CREATE VIEW api.multiply_event AS (
    SELECT e.*, mp.price FROM multiply.event e
    LEFT JOIN oasis_market.midpoint_price mp ON mp.block_id = e.block_id
    ORDER BY timestamp ASC, block_id ASC, log_index ASC
);

