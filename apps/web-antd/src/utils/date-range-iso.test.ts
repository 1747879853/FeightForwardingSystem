import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import {
  toIsoEndOfDay,
  toIsoStartOfDay,
  toIsoStartOfMonth,
  toIsoString,
} from './date-range-iso';

describe('date-range-iso', () => {
  it('把带当前时钟的日期切到当天起止，且起止不相等', () => {
    const value = dayjs('2026-09-08T13:38:43');
    expect(toIsoStartOfDay(value)).toBe(value.startOf('day').toISOString());
    expect(toIsoEndOfDay(value)).toBe(value.endOf('day').toISOString());
    expect(toIsoStartOfDay(value)).not.toBe(toIsoEndOfDay(value));
  });

  it('带时分的区间原样转 ISO，不切日界', () => {
    const value = dayjs('2026-09-08T13:38:43');
    expect(toIsoString(value)).toBe(value.toISOString());
  });

  it('月份起点切到当月 1 日', () => {
    const value = dayjs('2026-09-08T13:38:43');
    expect(toIsoStartOfMonth(value)).toBe(value.startOf('month').toISOString());
  });

  it('空值返回 undefined', () => {
    expect(toIsoStartOfDay(undefined)).toBeUndefined();
    expect(toIsoEndOfDay(null)).toBeUndefined();
    expect(toIsoString('')).toBeUndefined();
  });
});
