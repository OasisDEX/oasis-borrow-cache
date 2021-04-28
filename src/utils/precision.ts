import { BigNumber } from 'bignumber.js';

BigNumber.set({ DECIMAL_PLACES: 45 });

export const wad = new BigNumber(10).pow(18);
export const ray = new BigNumber(10).pow(27);
export const rad = new BigNumber(10).pow(45);
