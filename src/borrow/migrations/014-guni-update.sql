DELETE FROM vault.multiply_events WHERE block_id in (SELECT block_id from vault.multiply_events vme JOIN vulcan2x.block vb ON vb.id = vme.block_id WHERE vb.number > 13733654);

UPDATE vulcan2x.job vj SET last_block_id = (SELECT id FROM vulcan2x.block where number = 13733654) WHERE vj.name = 'multiply-history' and 13733654 = (SELECT number FROM vulcan2x.block where number = 13733654);