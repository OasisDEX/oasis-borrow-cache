UPDATE vault.multiply_events 
    SET exit_dai = (SELECT dai_left FROM multiply.method_called WHERE vault.multiply_events.tx_id = tx_id) * 10^(-18) 
    WHERE kind = 'CLOSE_VAULT_TO_COLLATERAL';

