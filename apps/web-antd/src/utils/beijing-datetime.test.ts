import dayjs from 'dayjs';
import { describe, expect, it } from 'vitest';

import {
  convertPayloadToBeijingTime,
  toBeijingDateTimeString,
} from './beijing-datetime';

describe('toBeijingDateTimeString', () => {
  it('UTC Z 串转为北京时间墙钟（+8 小时，去掉 Z）', () => {
    expect(toBeijingDateTimeString('2026-09-08T02:00:00.000Z')).toBe(
      '2026-09-08T10:00:00',
    );
  });

  it('带偏移串按同一时刻换算为北京时间', () => {
    expect(toBeijingDateTimeString('2026-09-08T10:00:00+08:00')).toBe(
      '2026-09-08T10:00:00',
    );
    expect(toBeijingDateTimeString('2026-09-08T03:00:00+01:00')).toBe(
      '2026-09-08T10:00:00',
    );
  });

  it('Date / dayjs 对象按时刻换算（与运行机器时区无关）', () => {
    const instant = Date.UTC(2026, 8, 8, 2, 0, 0);
    expect(toBeijingDateTimeString(new Date(instant))).toBe(
      '2026-09-08T10:00:00',
    );
    expect(toBeijingDateTimeString(dayjs(instant))).toBe('2026-09-08T10:00:00');
  });

  it('空值与非法值返回 undefined', () => {
    expect(toBeijingDateTimeString(null)).toBeUndefined();
    expect(toBeijingDateTimeString(undefined)).toBeUndefined();
    expect(toBeijingDateTimeString('')).toBeUndefined();
    expect(toBeijingDateTimeString('not-a-date')).toBeUndefined();
  });
});

describe('convertPayloadToBeijingTime', () => {
  it('深度转换对象/数组中的 UTC 串、Date 与 dayjs', () => {
    const payload = {
      settlementTime: '2026-09-08T02:00:00.000Z',
      range: ['2026-09-07T16:00:00.000Z', '2026-09-08T15:59:59.999Z'],
      creationTime: new Date(Date.UTC(2026, 8, 8, 1, 30, 0)),
      nested: { etd: dayjs(Date.UTC(2026, 8, 1, 0, 0, 0)) },
    };
    const converted = convertPayloadToBeijingTime(payload);
    expect(converted).toEqual({
      settlementTime: '2026-09-08T10:00:00',
      range: ['2026-09-08T00:00:00', '2026-09-08T23:59:59'],
      creationTime: '2026-09-08T09:30:00',
      nested: { etd: '2026-09-01T08:00:00' },
    });
  });

  it('不带时区标记的串与普通文本原样保留', () => {
    const payload = {
      accountDate: '2026-09-01T00:00:00',
      month: '2026-09',
      remark: '会议时间 2026-09-08T02:00:00.000Z 备注',
      amount: 100,
      flag: false,
      nothing: null,
    };
    expect(convertPayloadToBeijingTime(payload)).toEqual(payload);
  });

  it('返回副本，不修改原对象（避免污染表单模型）', () => {
    const payload = { time: '2026-09-08T02:00:00.000Z' };
    const converted = convertPayloadToBeijingTime(payload);
    expect(payload.time).toBe('2026-09-08T02:00:00.000Z');
    expect(converted.time).toBe('2026-09-08T10:00:00');
  });

  it('空载荷原样返回', () => {
    expect(convertPayloadToBeijingTime(undefined)).toBeUndefined();
    expect(convertPayloadToBeijingTime(null)).toBeNull();
  });
});
