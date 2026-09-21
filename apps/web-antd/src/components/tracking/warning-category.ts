/** 运踪异常类型：延误 / 甩柜 / 滞留 / 超期，列表与明细用红色强调 */
export const SEVERE_TRACKING_WARNING_CATEGORIES = [
  'DUMPING',
  'DETENTION',
  'DELAY',
  'OVERDUE',
] as const;

export type SevereTrackingWarningCategory =
  (typeof SEVERE_TRACKING_WARNING_CATEGORIES)[number];

const SEVERE_CATEGORY_SET = new Set<string>(SEVERE_TRACKING_WARNING_CATEGORIES);

/** 延误/甩柜/滞留/超期用错误红，开港截港等 CHANGE 仍用原黄 */
export const TRACKING_WARNING_SEVERE_COLOR = '#ff4d4f';
export const TRACKING_WARNING_DEFAULT_COLOR = '#faad14';

export function normalizeTrackingWarningCategory(
  category?: null | string,
): string {
  return category?.trim().toUpperCase() ?? '';
}

export function isSevereTrackingWarningCategory(
  category?: null | string,
): boolean {
  return SEVERE_CATEGORY_SET.has(normalizeTrackingWarningCategory(category));
}

export function getTrackingWarningAccentColor(
  category?: null | string,
): string {
  return isSevereTrackingWarningCategory(category)
    ? TRACKING_WARNING_SEVERE_COLOR
    : TRACKING_WARNING_DEFAULT_COLOR;
}

export function getTrackingWarningAlertType(
  category?: null | string,
): 'error' | 'warning' {
  return isSevereTrackingWarningCategory(category) ? 'error' : 'warning';
}
