UPDATE vault.multiply_events
    SET gas_fee = gas_fee * 10^(-18)
    WHERE gas_fee is not null;

UPDATE vault.multiply_events
    SET total_fee = coalesce(total_fee + gas_fee, total_fee, gas_fee)
    WHERE kind IN ('INCREASE_MULTIPLE', 'DECREASE_MULTIPLE', 'OPEN_MULTIPLY_VAULT', 'CLOSE_VAULT_TO_COLLATERAL', 'CLOSE_VAULT_TO_DAI')