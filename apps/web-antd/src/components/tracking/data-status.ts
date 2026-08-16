import { $t } from '#/locales';

/**
 * 服务商返回的整票数据状态码（如 PROCESS / COMPLETE）→ 用户可读文案。
 * 未知码原样回退，避免空白。
 */
export function getTrackingDataStatusLabel(category?: null | string): string {
  const key = category?.trim().toUpperCase();
  if (!key) return '';
  if (key === 'COMPLETE') return $t('tracking.status.complete');
  if (key === 'PROCESS') return $t('tracking.status.process');
  return category!.trim();
}

/** 整票数据状态 Tag 颜色 */
export function getTrackingDataStatusColor(category?: null | string): string {
  const key = category?.trim().toUpperCase();
  if (key === 'COMPLETE') return 'success';
  if (key === 'PROCESS') return 'processing';
  return 'default';
}
