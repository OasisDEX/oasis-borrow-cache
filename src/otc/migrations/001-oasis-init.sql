CREATE SCHEMA oasis;

CREATE TABLE oasis.log_take (
  id         serial primary key,
  offer_id   integer not null,
  pair       character varying(66) not null,
  maker      character varying(66) not null,
  pay_gem    character varying(66) not null,
  buy_gem    character varying(66) not null,
  taker      character varying(66) not null,
  take_amt   decimal(78,18) not null,
  give_amt   decimal(78,18) not null,
  timestamp  timestamptz not null,
  
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  unique (log_index, tx_id)
);
CREATE INDEX oasis_log_take_block_id_index ON oasis.log_take(block_id);

CREATE TABLE oasis.log_kill (
  id         serial primary key,
  offer_id   integer not null,
  pair       character varying(66) not null,
  maker      character varying(66) not null,
  pay_gem    character varying(66) not null,
  buy_gem    character varying(66) not null,
  pay_amt    decimal(78,18) not null,
  buy_amt    decimal(78,18) not null,
  timestamp  timestamptz not null,
  
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  unique (log_index, tx_id)
);
CREATE INDEX oasis_log_kill_block_id_index ON oasis.log_kill(block_id);

CREATE TABLE oasis.log_trade (
  id         serial primary key,
  pay_amt    decimal(78,18) not null,
  pay_gem    character varying(66) not null,
  buy_amt    decimal(78,18) not null,
  buy_gem    character varying(66) not null,
  
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  unique (log_index, tx_id)
);
CREATE INDEX oasis_log_trade_block_id_index ON oasis.log_trade(block_id);

CREATE TABLE oasis.log_make (
  id         serial primary key,
  offer_id   integer not null,
  pair       character varying(66) not null,
  maker      character varying(66) not null,
  pay_gem    character varying(66) not null,
  buy_gem    character varying(66) not null,
  pay_amt    decimal(78,18) not null,
  buy_amt    decimal(78,18) not null,
  timestamp  timestamptz not null,
  
  log_index  integer not null,
  tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
  block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  unique (log_index, tx_id)
);
CREATE INDEX oasis_log_make_block_id_index ON oasis.log_make(block_id);