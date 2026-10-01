/**
 * 即时运价支持的箱型白名单（按展示优先顺序）。
 * 主数据里高箱常见为 40HQ/45HQ，与 40HC/45HC 视为同一类予以放行。
 */

export const SPOT_SUPPORTED_CTN_NAMES = [
  '20GP',
  '40GP',
  '40HC',
  '45HC',
  '20NOR',
  '40NOR',
  '20RF',
  '40RF',
  '40RH',
  '20OT',
  '40OT',
] as const;

export type SpotSupportedCtnName = (typeof SPOT_SUPPORTED_CTN_NAMES)[number];

const SPOT_SUPPORTED_CTN_NAME_SET = new Set<string>(SPOT_SUPPORTED_CTN_NAMES);

/** 主数据别名 → 白名单规范名 */
const SPOT_CTN_NAME_ALIASES: Record<string, SpotSupportedCtnName> = {
  '40HQ': '40HC',
  '45HQ': '45HC',
};

/** 规范化箱型名（去空格、大写、HQ→HC） */
export function normalizeSpotCtnName(ctnName?: null | string): string {
  const key = String(ctnName ?? '')
    .trim()
    .toUpperCase();
  if (!key) return '';
  return SPOT_CTN_NAME_ALIASES[key] ?? key;
}

/** 箱型是否在即时运价支持名单内 */
export function isSupportedSpotCtnName(ctnName?: null | string): boolean {
  const key = normalizeSpotCtnName(ctnName);
  if (!key) return false;
  return SPOT_SUPPORTED_CTN_NAME_SET.has(key);
}

/** 白名单排序下标，未知箱型靠后 */
export function getSpotCtnSortIndex(ctnName?: null | string): number {
  const key = normalizeSpotCtnName(ctnName);
  const index = SPOT_SUPPORTED_CTN_NAMES.indexOf(key as SpotSupportedCtnName);
  return index === -1 ? SPOT_SUPPORTED_CTN_NAMES.length : index;
}
