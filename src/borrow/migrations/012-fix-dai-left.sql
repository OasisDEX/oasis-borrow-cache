UPDATE vault.multiply_events 
    SET exit_dai = (SELECT dai_left FROM multiply.method_called WHERE vault.multiply_events.tx_id = tx_id) * 10^(-18) 
    WHERE kind = 'CLOSE_VAULT_TO_COLLATERAL';

UPDATE vault.events SET 
	oracle_price = (
		select price from oracles.prices 
		where oracles.prices.block_id <= vault.events.block_id
		and oracles.prices.token = vault.events.collateral
		order by block_id DESC
		limit 1
	) where kind = 'AUCTION_STARTED_V2' OR kind = 'AUCTION_STATED';