import { describe, expect, it } from 'vitest';

import {
  calcOriginalToSettlementRate,
  collectOriginalCurrencyRatePairs,
  currencyRatePairKey,
  fallbackLocalCurrencyRate,
  inverseRate,
} from './exchange-rate-convert';

describe('exchange-rate-convert', () => {
  it('fallbackLocalCurrencyRate: 表有值用表值，未维护且是公司本位币才兜底 1', () => {
    expect(fallbackLocalCurrencyRate(7.2, 100, 200)).toBe(7.2);
    expect(fallbackLocalCurrencyRate(undefined, 200, 200)).toBe(1);
    expect(fallbackLocalCurrencyRate(undefined, 100, 200)).toBeUndefined();
    expect(fallbackLocalCurrencyRate(undefined, 100, null)).toBeUndefined();
  });

  it('currencyRatePairKey: 同币别不同开船日拆开', () => {
    expect(currencyRatePairKey(11, '2026-03-15')).toBe('11_2026-03-15');
    expect(currencyRatePairKey(11)).toBe('11_');
    expect(currencyRatePairKey(11, '2026-03-15T08:00:00')).toBe(
      '11_2026-03-15',
    );
  });

  it('collectOriginalCurrencyRatePairs: 跳过结算币，按币别+ETD 去重', () => {
    const pairs = collectOriginalCurrencyRatePairs(
      [
        { currencyId: 1, currencyCode: 'CNY', etd: '2026-03-15' },
        { currencyId: 2, currencyCode: 'USD', etd: '2026-03-15' },
        { currencyId: 2, currencyCode: 'USD', etd: '2026-03-15' },
        { currencyId: 2, currencyCode: 'USD', etd: '2026-04-01' },
        { currencyId: 3, currencyCode: 'EUR' },
      ],
      1,
    );
    expect(pairs).toEqual([
      { currencyId: 2, currencyCode: 'USD', asOf: '2026-03-15' },
      { currencyId: 2, currencyCode: 'USD', asOf: '2026-04-01' },
      { currencyId: 3, currencyCode: 'EUR', asOf: undefined },
    ]);
  });

  it('inverseRate: 7 与 1/7 互为倒数', () => {
    expect(inverseRate(7)).toBeCloseTo(0.142_857_142_857, 10);
    expect(inverseRate(inverseRate(7))).toBeCloseTo(7, 10);
    expect(inverseRate(0)).toBeNull();
    expect(inverseRate(null)).toBeNull();
  });

  it('calcOriginalToSettlementRate: 本位币→USD 用 1/美元兑本位币', () => {
    expect(calcOriginalToSettlementRate(1, 7)).toBeCloseTo(1 / 7, 10);
  });

  it('calcOriginalToSettlementRate: USD→本位币 用美元兑本位币', () => {
    expect(calcOriginalToSettlementRate(7, 1)).toBe(7);
  });

  it('calcOriginalToSettlementRate: 交叉汇率 EUR→USD', () => {
    expect(calcOriginalToSettlementRate(7.8, 7.2)).toBeCloseTo(7.8 / 7.2, 10);
  });

  it('calcOriginalToSettlementRate: 缺汇率时不兜底为 1', () => {
    expect(calcOriginalToSettlementRate(undefined, 7)).toBeUndefined();
    expect(calcOriginalToSettlementRate(1, undefined)).toBeUndefined();
  });
});
