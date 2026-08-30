import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getExchangeRatePagedList: vi.fn(),
}));

vi.mock('#/api/system/base-data/exchange-rate-admin', () => ({
  getExchangeRatePagedList: mocks.getExchangeRatePagedList,
}));

import {
  ensureExchangeRateCache,
  isExchangeRateEffective,
  peekExchangeRate,
} from './exchange-rate-cache';

const DAY = 24 * 60 * 60 * 1000;

describe('isExchangeRateEffective', () => {
  it('未启用则无效', () => {
    expect(
      isExchangeRateEffective({
        enable: false,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
      }),
    ).toBe(false);
  });

  it('起止为空则只要启用就有效', () => {
    expect(isExchangeRateEffective({ enable: true })).toBe(true);
  });

  it('结束日当天全天有效（按日历日，不因 UTC 0 点提前过期）', () => {
    const endDayLocalNoon = new Date('2026-08-20T12:00:00').getTime();
    expect(
      isExchangeRateEffective(
        { enable: true, startDate: '2026-08-01', endDate: '2026-08-20' },
        endDayLocalNoon,
      ),
    ).toBe(true);
  });

  it('结束日次日无效', () => {
    const nextDay = new Date('2026-08-20T12:00:00').getTime() + DAY;
    expect(
      isExchangeRateEffective(
        { enable: true, startDate: '2026-08-01', endDate: '2026-08-20' },
        nextDay,
      ),
    ).toBe(false);
  });

  it('开始日当天有效，前一天无效', () => {
    const startNoon = new Date('2026-08-20T12:00:00').getTime();
    expect(
      isExchangeRateEffective(
        { enable: true, startDate: '2026-08-20', endDate: '2026-12-31' },
        startNoon,
      ),
    ).toBe(true);
    expect(
      isExchangeRateEffective(
        { enable: true, startDate: '2026-08-20', endDate: '2026-12-31' },
        startNoon - DAY,
      ),
    ).toBe(false);
  });

  it('匹配日用开船日期而不是今天：落在区间内有效，区间外无效', () => {
    const rate = {
      enable: true,
      startDate: '2026-03-01',
      endDate: '2026-03-31',
    };
    const etd = new Date('2026-03-15T12:00:00').getTime();
    const todayOutside = new Date('2026-08-30T12:00:00').getTime();
    expect(isExchangeRateEffective(rate, etd)).toBe(true);
    expect(isExchangeRateEffective(rate, todayOutside)).toBe(false);
  });
});

describe('peekExchangeRate 按匹配日取值', () => {
  const usd = 11;
  const rmb = 1;

  beforeEach(() => {
    mocks.getExchangeRatePagedList.mockResolvedValue({
      items: [
        {
          id: 2,
          enable: true,
          currencyId: usd,
          localCurrencyId: rmb,
          drValue: 7,
          crValue: 7,
          startDate: '2026-04-01',
          endDate: '2026-04-30',
          sortId: 0,
        },
        {
          id: 3,
          enable: true,
          currencyId: usd,
          localCurrencyId: rmb,
          drValue: 8,
          crValue: 8,
          startDate: '2026-07-01',
          endDate: '2026-12-31',
          sortId: 0,
        },
      ],
    });
  });

  it('先按今天再按落在另一区间的开船日，会取到不同汇率', async () => {
    await ensureExchangeRateCache(true);
    const todayRate = peekExchangeRate(usd, 0, rmb, '2026-08-30');
    const etdRate = peekExchangeRate(usd, 0, rmb, '2026-04-15');
    expect(todayRate).toBe(8);
    expect(etdRate).toBe(7);
    expect(todayRate).not.toBe(etdRate);
  });

  it('本位币对不上视为未维护，不拿别的本位币兜底', async () => {
    await ensureExchangeRateCache(true);
    expect(peekExchangeRate(usd, 0, 999, '2026-08-30')).toBeUndefined();
    expect(peekExchangeRate(usd, 0, undefined, '2026-08-30')).toBeUndefined();
  });
});
