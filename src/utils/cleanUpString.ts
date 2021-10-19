// when the EVM converts bytes to string we can end up with invisible null characters that prevent us from saving it to db
// e.g. 'ETH-A%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00%00'

export function cleanUpString(str: string): string {
  return str.replace(new RegExp(`${decodeURI('%00')}`, 'g'), '');
}
