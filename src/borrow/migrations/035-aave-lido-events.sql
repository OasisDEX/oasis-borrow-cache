CREATE SCHEMA lido;

CREATE TABLE lido.post_total_shares (
    id         				serial primary key,
    postTotalPooledEther    decimal(78,0) not null,
    preTotalPooledEther     decimal(78,0) not null,
    timeElapsed     		decimal(78,0) not null,
    totalShares   			decimal(78,0) not null,

    log_index  integer not null,
    tx_id      integer not null REFERENCES vulcan2x.transaction(id) ON DELETE CASCADE,
    block_id   integer not null REFERENCES vulcan2x.block(id) ON DELETE CASCADE,
    unique (tx_id, log_index)
);
