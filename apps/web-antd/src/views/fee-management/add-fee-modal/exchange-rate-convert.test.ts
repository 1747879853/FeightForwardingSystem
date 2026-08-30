import { describe, expect, it } from 'vitest';

import {
  collectOriginalCurrencyRatePairs,
  currencyRatePairKey,
  inverseRate,
} from './exchange-rate-convert';

describe('exchange-rate-convert', () => {
  it('currencyRatePairKey: 按原币 id', () => {
    expect(currencyRatePairKey(11)).toBe('11');
    expect(currencyRatePairKey('11')).toBe('11');
  });

  it('collectOriginalCurrencyRatePairs: 跳过结算币，同原币不按开船日拆开', () => {
    const pairs = collectOriginalCurrencyRatePairs(
      [
        { currencyId: 1, currencyCode: 'CNY' },
        { currencyId: 2, currencyCode: 'USD' },
        { currencyId: 2, currencyCode: 'USD' },
        { currencyId: 3, currencyCode: 'EUR' },
      ],
      1,
    );
    expect(pairs).toEqual([
      { currencyId: 2, currencyCode: 'USD' },
      { currencyId: 3, currencyCode: 'EUR' },
    ]);
  });

  it('inverseRate: 7 与 1/7 互为倒数', () => {
    expect(inverseRate(7)).toBeCloseTo(0.142_857_142_857, 10);
    expect(inverseRate(inverseRate(7))).toBeCloseTo(7, 10);
    expect(inverseRate(0)).toBeNull();
    expect(inverseRate(null)).toBeNull();
  });
});
