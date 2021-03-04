CREATE INDEX oasis_market_log_take_timestamp ON oasis_market.log_take(timestamp, log_index);
CREATE INDEX oasis_market_log_take_maker ON oasis_market.log_take(maker);
CREATE INDEX oasis_market_log_take_taker ON oasis_market.log_take(taker);
CREATE INDEX oasis_market_log_take_tx_id ON oasis_market.log_take(tx_id);
CREATE INDEX vulcan2x_transaction_from_address ON vulcan2x.transaction(from_address);