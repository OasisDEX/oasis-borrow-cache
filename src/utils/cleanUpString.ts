export function cleanUpString(str: string) {
  return str.replace(new RegExp(`${decodeURI('%00')}`, 'g'), '');
}
