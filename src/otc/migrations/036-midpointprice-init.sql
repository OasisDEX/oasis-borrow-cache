CREATE TABLE extracted.storage (
  id serial PRIMARY KEY,
  block_id integer NOT NULL REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
  address character varying(66),
  key character varying(66),
  value text NOT NULL,
  CONSTRAINT extracted_midpoint_offer_index_address_key_block_id UNIQUE (block_id, address, key)
);

CREATE INDEX extracted_storage_block_id_index ON extracted.storage(block_id);


CREATE TABLE oasis_market.midpoint_price (
    id serial PRIMARY KEY,
    block_id integer NOT NULL UNIQUE REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    best_bid numeric(78,18),
    best_ask numeric(78,18),
    price numeric(78,18),
    timestamp timestamp with time zone NOT NULL
);

CREATE INDEX oasis_market_midpoint_price_timestamp_index ON oasis_market.midpoint_price(timestamp);
