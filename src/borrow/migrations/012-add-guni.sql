UPDATE vulcan2x.job SET last_block_id = 4704363 WHERE name = 'multiply-history';
DELETE FROM vault.multiply_events where block_id > 4704363;