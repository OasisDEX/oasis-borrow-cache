create table lido.token_rebased
(
    id                    serial primary key,
    postTotalEther        numeric(78) not null,
    postTotalShares       numeric(78) not null,
    preTotalEther         numeric(78) not null,
    preTotalShares        numeric(78) not null,
    reportTimestamp       numeric(78) not null,
    sharesMintedAsFees    numeric(78) not null,
    timeElapsed           numeric(78) not null,

    log_index             integer     not null,
    tx_id                 integer     not null references vulcan2x.transaction
        on delete cascade,
    block_id              integer     not null references vulcan2x.block
        on delete cascade,
    unique (tx_id, log_index)
);
