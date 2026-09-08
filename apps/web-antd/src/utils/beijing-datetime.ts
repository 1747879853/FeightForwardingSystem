/**
 * 提交侧时间口径统一：北京时间（UTC+8，无时区标记）。
 *
 * 背景：后端所有接口的时间字段均为不带时区标记的本地墙钟字符串
 * （如 `2026-09-08T10:00:00`，即北京时间），但前端大量历史代码在
 * 提交/查询时用 `toISOString()`（UTC，带 Z 后缀）或直接把 `Date`/`dayjs`
 * 对象塞进请求体（JSON 序列化同样产出 UTC Z 串），导致后端按 UTC 墙钟
 * 存储，回显时比用户选择的时间早 8 小时。
 *
 * 本模块在请求出站前做统一转换：
 * - `toBeijingDateTimeString`：把单个时间值显式转为北京时间 ISO 串；
 * - `convertPayloadToBeijingTime`：深度遍历请求体/查询参数，把
 *   UTC(Z)/带偏移的 ISO 字符串与 `Date`/`dayjs` 对象统一转换为
 *   北京时间字符串（返回副本，不修改原对象，避免污染表单模型）。
 */
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/** 北京时间偏移（分钟）：UTC+8，中国无夏令时，固定偏移即可 */
const BEIJING_UTC_OFFSET = 8 * 60;

/** 与后端约定一致的提交格式：不带时区标记的 ISO 本地时间 */
const BEIJING_DATETIME_FORMAT = 'YYYY-MM-DDTHH:mm:ss';

/** 完整匹配「带 Z 或 ±hh:mm 偏移」的 ISO 时间串（仅整串匹配，避免误伤普通文本） */
const OFFSET_ISO_RE =
  /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})$/i;

/**
 * 把时间值转换为北京时间（UTC+8）的无时区标记 ISO 字符串。
 * @param value `Date`/`dayjs`/可被 dayjs 解析的字符串或时间戳
 * @returns 如 `2026-09-08T10:00:00`；入参为空或非法时返回 `undefined`
 */
export function toBeijingDateTimeString(
  value?: Date | dayjs.Dayjs | null | number | string,
): string | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const date = dayjs.isDayjs(value) ? value : dayjs(value);
  if (!date.isValid()) {
    return undefined;
  }
  return date.utcOffset(BEIJING_UTC_OFFSET).format(BEIJING_DATETIME_FORMAT);
}

/** 仅深拷贝「纯 JSON 结构」（plain object / array），其余类型原样返回 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

function convertValue(value: unknown): unknown {
  if (typeof value === 'string') {
    if (!OFFSET_ISO_RE.test(value)) {
      return value;
    }
    return toBeijingDateTimeString(value) ?? value;
  }
  // Date / dayjs 对象若不处理，JSON 序列化会输出 UTC Z 串，这里提前转为北京时间字符串
  if (value instanceof Date) {
    return toBeijingDateTimeString(value) ?? value;
  }
  if (dayjs.isDayjs(value)) {
    return toBeijingDateTimeString(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => convertValue(item));
  }
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = convertValue(item);
    }
    return result;
  }
  // FormData / Blob / URLSearchParams / 类实例等非纯 JSON 值不做处理
  return value;
}

/**
 * 深度遍历请求载荷（body 或 params），把 UTC/带偏移时间与 Date/dayjs
 * 对象统一转换为北京时间字符串；返回转换后的副本，不修改入参。
 */
export function convertPayloadToBeijingTime<T>(payload: T): T {
  if (payload === null || payload === undefined) {
    return payload;
  }
  return convertValue(payload) as T;
}
