import { describe, expect, it } from 'vitest';

import {
  calcOriginalToSettlementRate,
  inverseRate,
  isLocalCurrencyCode,
} from './exchange-rate-convert';

describe('exchange-rate-convert', () => {
  it('isLocalCurrencyCode: 识别人民币编码', () => {
    expect(isLocalCurrencyCode('RMB')).toBe(true);
    expect(isLocalCurrencyCode('cny')).toBe(true);
    expect(isLocalCurrencyCode('USD')).toBe(false);
    expect(isLocalCurrencyCode('')).toBe(false);
  });

  it('inverseRate: 7 与 1/7 互为倒数', () => {
    expect(inverseRate(7)).toBeCloseTo(0.142_857_142_857, 10);
    expect(inverseRate(inverseRate(7))).toBeCloseTo(7, 10);
    expect(inverseRate(0)).toBeNull();
    expect(inverseRate(null)).toBeNull();
  });

  it('calcOriginalToSettlementRate: RMB→USD 用 1/美元兑人民币', () => {
    expect(calcOriginalToSettlementRate(1, 7)).toBeCloseTo(1 / 7, 10);
  });

  it('calcOriginalToSettlementRate: USD→RMB 用美元兑人民币', () => {
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
