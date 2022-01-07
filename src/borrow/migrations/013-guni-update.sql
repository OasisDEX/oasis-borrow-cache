DELETE FROM vault.multiply_events WHERE block_id in (SELECT block_id from vault.multiply_events vme JOIN vulcan2x.block vb ON vb.id = vme.block_id WHERE vb.number > 13733654);

UPDATE vulcan2x.job vj SET last_block_id = (SELECT id FROM vulcan2x.block where number = 13733654) WHERE vj.name = 'multiply-history' and 13733654 = (SELECT number FROM vulcan2x.block where number = 13733654);
UPDATE vulcan2x.job vj SET last_block_id = (SELECT id FROM vulcan2x.block where number = 13733654) WHERE vj.name = 'eventEnhancerGasPrice' and 13733654 = (SELECT number FROM vulcan2x.block where number = 13733654);

UPDATE vault.multiply_events SET
    exit_dai = (
        select dai_left / 10 ^ 18 from multiply.method_called
        where multiply.method_called.tx_id = vault.multiply_events.tx_id
    ) where kind = 'CLOSE_VAULT_TO_COLLATERAL' and exit_dai is null;