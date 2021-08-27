

export function getOraclesAddresses(addresses: Record<string, string>) {
    return Object.entries(addresses)
        .filter(([contract]) => contract.startsWith('PIP_'))
        .map(([contract, address]) => ({address, token: contract.replace('PIP_', '')}))
}