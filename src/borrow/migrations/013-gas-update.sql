UPDATE vault.multiply_events
    SET gas_fee = gas_fee * 10^(-18)
    WHERE gas_fee is not null;

UPDATE vault.multiply_events
    SET total_fee = coalesce(total_fee + gas_fee, total_fee, gas_fee);