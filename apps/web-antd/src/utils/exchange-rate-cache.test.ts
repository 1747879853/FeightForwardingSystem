import { describe, expect, it } from 'vitest';

import { isExchangeRateEffective } from './exchange-rate-cache';

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
});
