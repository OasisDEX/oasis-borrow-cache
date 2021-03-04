CREATE SCHEMA oasis_market;

CREATE TABLE oasis_market.log_take (
  id         serial primary key,
  offer_id   integer not null,
  address    character varying(66) not null,
  maker      character varying(66) not null,
  taker      character varying(66) not null,
  base_gem   character varying(66) not null,
  quote_gem  character varying(66) not null,
  base_amt   decimal(78,18) not null,
  quote_amt  decimal(78,18) not null,
  price      decimal(78,18) not null,
  type       character varying(5) not null,
  timestamp  timestamptz not null,
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  unique (log_index, tx_id)
);
CREATE INDEX oasis_market_log_take_block_id_index ON oasis_market.log_take(block_id);

CREATE TABLE oasis_market.log_kill (
  id         serial primary key,
  offer_id   integer not null,
  address    character varying(66) not null,
  maker      character varying(66) not null,
  base_gem   character varying(66) not null,
  quote_gem  character varying(66) not null,
  base_amt   decimal(78,18) not null,
  quote_amt  decimal(78,18) not null,
  price      decimal(78,18) not null,
  type       character varying(5) not null,
  timestamp  timestamptz not null,
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  unique (log_index, tx_id)
);
CREATE INDEX oasis_market_log_kill_block_id_index ON oasis_market.log_kill(block_id);

CREATE TABLE oasis_market.log_trade (
  id         serial primary key,
  base_gem   character varying(66) not null,
  quote_gem  character varying(66) not null,
  base_amt   decimal(78,18) not null,
  quote_amt  decimal(78,18) not null,
  price      decimal(78,18) not null,
  type       character varying(5) not null,
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  unique (log_index, tx_id)
);
CREATE INDEX oasis_market_log_trade_block_id_index ON oasis_market.log_trade(block_id);

CREATE TABLE oasis_market.log_make (
  id         serial primary key,
  offer_id   integer not null,
  address    character varying(66) not null,
  maker      character varying(66) not null,
  base_gem   character varying(66) not null,
  quote_gem  character varying(66) not null,
  base_amt   decimal(78,18) not null,
  quote_amt  decimal(78,18) not null,
  price      decimal(78,18) not null,
  type       character varying(5) not null,
  timestamp  timestamptz not null,
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  unique (log_index, tx_id)
);
CREATE INDEX oasis_market_log_make_block_id_index ON oasis_market.log_make(block_id);