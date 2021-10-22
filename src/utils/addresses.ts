export function getOraclesAddresses(
  addresses: Record<string, string>,
): { address: string; token: string }[] {
  return Object.entries(addresses)
    .filter(([contract]) => contract.startsWith('PIP_'))
    .map(([contract, address]) => ({ address, token: contract.replace('PIP_', '') }));
}

export function getTokensForOracle(address: string, contracts: Record<string, string>): string[] {
  const oracles = getOraclesAddresses(contracts);

  return oracles
    .filter(desc => desc.address.toLowerCase() === address.toLowerCase())
    .map(desc => desc.token);
}
