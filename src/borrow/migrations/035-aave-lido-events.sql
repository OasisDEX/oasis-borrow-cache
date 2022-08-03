CREATE SCHEMA lido;

CREATE TABLE lido.post_total_shares (
    id         				serial primary key,
    post_total_pooled_ether decimal(78,0) not null,
    pre_total_pooled_ether  decimal(78,0) not null,
    time_elapsed     		decimal(78,0) not null,
    total_shares   			decimal(78,0) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);

CREATE SCHEMA aave;

CREATE TABLE aave.reserve_data_updated (
    id         				serial primary key,
    liquidity_rate    		decimal(78,0) not null,
    stable_borrow_rate     	decimal(78,0) not null,
    variable_borrow_rate    decimal(78,0) not null,
    liquidity_index   		decimal(78,0) not null,
    variable_borrow_index   decimal(78,0) not null,

    log_index               integer not null,
    tx_id                   integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id                integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);
