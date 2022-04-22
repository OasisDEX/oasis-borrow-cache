UPDATE vault.multiply_events vme
SET collateralization_ratio = vme.collateralization_ratio * ( 1 / ve.rate ) FROM vault.events ve
WHERE vme.standard_event_id = ve.id AND vme.collateralization_ratio IS NOT NULL AND vme.collateralization_ratio > 0 AND ve.rate IS NOT NULL and ve.rate > 0;

UPDATE vault.multiply_events vme
SET before_collateralization_ratio = vme.before_collateralization_ratio * ( 1 / ve.rate ) FROM vault.events ve
WHERE vme.standard_event_id = ve.id AND vme.before_collateralization_ratio IS NOT NULL AND vme.before_collateralization_ratio > 0 AND ve.rate IS NOT NULL and ve.rate > 0;

UPDATE vault.multiply_events vme
SET liquidation_price = vme.liquidation_price * ve.rate FROM vault.events ve
WHERE vme.standard_event_id = ve.id AND vme.liquidation_price IS NOT NULL AND vme.liquidation_price > 0 AND ve.rate IS NOT NULL and ve.rate > 0;

UPDATE vault.multiply_events vme
SET before_liquidation_price = vme.before_liquidation_price * ve.rate FROM vault.events ve
WHERE vme.standard_event_id = ve.id AND vme.before_liquidation_price IS NOT NULL AND vme.before_liquidation_price > 0 AND ve.rate IS NOT NULL and ve.rate > 0;

UPDATE vault.multiply_events vme
SET multiple = (vme.locked_collateral * ve.oracle_price)/(vme.locked_collateral * ve.oracle_price - vme.debt * ve.rate) FROM vault.events ve
WHERE vme.standard_event_id = ve.id AND vme.multiple IS NOT NULL AND vme.multiple > 0 AND ve.rate IS NOT NULL and ve.rate > 0;

UPDATE vault.multiply_events vme
SET before_multiple = (vme.before_locked_collateral * ve.oracle_price)/(vme.before_locked_collateral * ve.oracle_price - vme.before_debt * ve.rate) FROM vault.events ve
WHERE vme.standard_event_id = ve.id AND vme.before_multiple IS NOT NULL AND vme.before_multiple > 0 AND ve.rate IS NOT NULL and ve.rate > 0;

UPDATE vault.multiply_events vme
SET net_value = vme.locked_collateral * vme.market_price - vme.debt * ve.rate FROM vault.events ve
WHERE vme.standard_event_id = ve.id AND vme.net_value IS NOT NULL AND vme.net_value > 0 AND vme.kind != 'OPEN_MULTIPLY_GUNI_VAULT' AND ve.rate IS NOT NULL and ve.rate > 0;

UPDATE vault.multiply_events vme
SET net_value = vme.locked_collateral * ve.oracle_price - vme.debt * ve.rate FROM vault.events ve
WHERE vme.standard_event_id = ve.id AND vme.net_value IS NOT NULL AND vme.net_value > 0 AND vme.kind = 'OPEN_MULTIPLY_GUNI_VAULT' AND ve.rate IS NOT NULL and ve.rate > 0;