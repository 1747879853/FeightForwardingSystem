/** Handsontable 单元格值来源：AI 识别 / 运价新增默认值 */

export type HotFieldOrigin = 'ai' | 'default';

export type HotFieldOriginMap = Record<string, HotFieldOrigin>;

/** 主表字段（不含动态箱型列） */
export const FREIGHT_HOT_ORIGIN_TRACK_FIELDS = [
  'carrierId',
  'polId',
  'podId',
  'isDirect',
  'poT1Id',
  'poT2Id',
  'polFreeDays',
  'podFreeDays',
  'poddem',
  'poddet',
  'voyage',
  'vesselVoyage',
  'contractNo',
  'etd',
  'etdDayOfWeek',
  'etdDayTime',
  'closeDocTime',
  'closeDocDayOfWeek',
  'closeDocDayTime',
  'closingTime',
  'closingDayOfWeek',
  'closingDayTime',
  'validTimeStart',
  'validTimeEnd',
  'remark',
  'currencyId',
  'bookingAgentId',
] as const;

export function isHotOriginEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

export function collectFilledOriginKeys(row: Record<string, any>): string[] {
  const keys: string[] = [];
  for (const field of FREIGHT_HOT_ORIGIN_TRACK_FIELDS) {
    if (!isHotOriginEmpty(row[field])) keys.push(field);
  }
  for (const key of Object.keys(row)) {
    if (
      (key.startsWith('ctn_') || key.startsWith('ctnSug_')) &&
      !isHotOriginEmpty(row[key])
    ) {
      keys.push(key);
    }
  }
  return keys;
}

export function setHotFieldOrigins(
  row: Record<string, any>,
  keys: string[],
  origin: HotFieldOrigin,
) {
  if (keys.length === 0) return;
  const map: HotFieldOriginMap = { ...(row._fieldOrigin || {}) };
  for (const key of keys) {
    map[key] = origin;
  }
  row._fieldOrigin = map;
}

/** 对比补默认前后：原先为空、之后有值的字段记为 default */
export function markDefaultsFilledOrigins(
  before: Record<string, any>,
  after: Record<string, any>,
) {
  const keys: string[] = [];
  const candidates = new Set([
    ...FREIGHT_HOT_ORIGIN_TRACK_FIELDS,
    ...Object.keys(after).filter(
      (k) => k.startsWith('ctn_') || k.startsWith('ctnSug_'),
    ),
  ]);
  for (const key of candidates) {
    if (isHotOriginEmpty(before[key]) && !isHotOriginEmpty(after[key])) {
      keys.push(key);
    }
  }
  setHotFieldOrigins(after, keys, 'default');
}

export function clearHotFieldOrigin(row: Record<string, any>, prop: string) {
  const map = row?._fieldOrigin as HotFieldOriginMap | undefined;
  if (!map || !(prop in map)) return;
  const next = { ...map };
  delete next[prop];
  row._fieldOrigin = Object.keys(next).length > 0 ? next : undefined;
}

export function getHotFieldOriginClass(
  row: Record<string, any> | undefined,
  prop: string,
): string {
  const origin = row?._fieldOrigin?.[prop] as HotFieldOrigin | undefined;
  if (origin === 'ai') return 'ht-from-ai';
  if (origin === 'default') return 'ht-from-default';
  return '';
}

export function appendHotClassName(
  existing: string | string[] | undefined,
  extra: string,
): string {
  const parts = [
    ...(Array.isArray(existing)
      ? existing
      : String(existing || '')
          .split(/\s+/)
          .filter(Boolean)),
    ...extra.split(/\s+/).filter(Boolean),
  ];
  return [...new Set(parts)].join(' ');
}

export function rowHasFieldOrigin(row: Record<string, any> | undefined) {
  return !!row?._fieldOrigin && Object.keys(row._fieldOrigin).length > 0;
}
