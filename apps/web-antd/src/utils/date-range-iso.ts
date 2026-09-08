import dayjs from 'dayjs';

function parseDayjs(value: unknown) {
  if (!value) {
    return undefined;
  }
  const parsed = dayjs(value as Date | string);
  return parsed.isValid() ? parsed : undefined;
}

/** 带时分的区间：原样转 ISO */
export function toIsoString(value: unknown): string | undefined {
  return parseDayjs(value)?.toISOString();
}

/** 无时分日期区间起点：本地当天 00:00:00 再转 ISO */
export function toIsoStartOfDay(value: unknown): string | undefined {
  return parseDayjs(value)?.startOf('day').toISOString();
}

/** 无时分日期区间终点：本地当天 23:59:59.999 再转 ISO */
export function toIsoEndOfDay(value: unknown): string | undefined {
  return parseDayjs(value)?.endOf('day').toISOString();
}

/** 月份区间起点：本地当月 1 日 00:00:00 再转 ISO */
export function toIsoStartOfMonth(value: unknown): string | undefined {
  return parseDayjs(value)?.startOf('month').toISOString();
}

/** 月份区间终点：本地当月最后一刻再转 ISO */
export function toIsoEndOfMonth(value: unknown): string | undefined {
  return parseDayjs(value)?.endOf('month').toISOString();
}
