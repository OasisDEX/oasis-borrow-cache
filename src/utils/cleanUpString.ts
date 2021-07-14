export function cleanUpString(str: string): string {
  return str.replace(new RegExp(`${decodeURI('%00')}`, 'g'), '');
}
