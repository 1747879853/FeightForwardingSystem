import type { LoadingOrderCtnDto } from '@/api/loading-order';

export const EMPTY_TEXT = '--';

/** 后端返回 ISO 字符串，这里只取日期部分，按设计稿用 . 分隔 */
export function formatDate(value?: null | string) {
  if (!value) return EMPTY_TEXT;
  const datePart = String(value).slice(0, 10);
  if (datePart.length !== 10) return EMPTY_TEXT;
  return datePart.replaceAll('-', '.');
}

/** 查询条件要的是 yyyy-MM-dd */
export function toQueryDate(value?: null | string) {
  if (!value) return undefined;
  return String(value).slice(0, 10);
}

export function textOr(value?: null | number | string) {
  if (value === null || value === undefined || value === '') return EMPTY_TEXT;
  return String(value);
}

export function joinNames(list?: null | { name?: string }[]) {
  const names = (list ?? []).map((item) => item?.name).filter(Boolean);
  return names.length > 0 ? names.join('、') : EMPTY_TEXT;
}

/** 船名/航次，缺一边时不留空斜杠 */
export function vesselVoyage(vessel?: null | string, voyno?: null | string) {
  const parts = [vessel, voyno].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : EMPTY_TEXT;
}

/** 箱型箱量：按箱型聚合成 40HC*5 的形式，列表接口不返回箱型时为空 */
export function ctnSummary(ctns?: LoadingOrderCtnDto[] | null) {
  if (!ctns || ctns.length === 0) return '';
  const counter = new Map<string, number>();
  for (const ctn of ctns) {
    const name = ctn.ctnCode?.ctnName || ctn.ctnCode?.name || '未知箱型';
    counter.set(name, (counter.get(name) ?? 0) + 1);
  }
  return [...counter.entries()]
    .map(([name, count]) => `${name}*${count}`)
    .join('，');
}
