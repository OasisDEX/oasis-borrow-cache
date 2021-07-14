import { expect } from 'earljs';
import { cleanUpString } from '../../../src/utils/cleanUpString';

describe('cleanUpString', () => {
  it('Does not change valid strings', () => {
    const str = 'KNC-A';
    const cleanStr = cleanUpString(str);

    expect(cleanStr).toEqual(str);
  });

  it('does not change valid strings', () => {
    const expected = 'KNC-A';
    const str = decodeURI('%00%00KNC-A%00%00');
    const cleanStr = cleanUpString(str);

    expect(cleanStr).toEqual(expected);
  });
});
