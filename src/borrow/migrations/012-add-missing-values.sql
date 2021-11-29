UPDATE vault.multiply_events 
    SET exit_dai = (SELECT dai_left FROM multiply.method_called WHERE vault.multiply_events.tx_id = tx_id) * 10^(-18) 
    WHERE kind = 'CLOSE_VAULT_TO_COLLATERAL';

UPDATE vault.events SET 
	oracle_price = (
		SELECT price FROM oracles.prices 
		WHERE oracles.prices.block_id <= vault.events.block_id
		AND oracles.prices.token = vault.events.collateral
		ORDER BY block_id DESC
		LIMIT 1
	) WHERE (kind = 'AUCTION_STARTED_V2' OR kind = 'AUCTION_STARTED') AND collateral != 'WETH';

UPDATE vault.events SET 
	oracle_price = (
		SELECT price FROM oracles.prices 
		WHERE oracles.prices.block_id <= vault.events.block_id
		AND oracles.prices.token = 'ETH'
		ORDER BY block_id DESC
		LIMIT 1
	) WHERE (kind = 'AUCTION_STARTED_V2' OR kind = 'AUCTION_STARTED') AND collateral = 'WETH';