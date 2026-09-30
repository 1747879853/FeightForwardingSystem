import type { SeFreiPriceOutDto } from '#/api/sea-export/freight-rate-admin';

import { getSeFreiPriceList } from '#/api/sea-export/freight-rate-admin';

/**
 * 列表箱型涨跌角标：null / 0 / 非数字 → 不展示。
 * 差额由列表接口 `seFreiPriceCtns[].costDelta|sugDelta` 给出。
 */
export function normalizePriceDelta(
  value: null | number | undefined,
): number | undefined {
  if (value === null || value === undefined) return undefined;
  const num = Number(value);
  if (Number.isNaN(num) || num === 0) return undefined;
  return num;
}

export function getValidTimeEndMs(row: { validTimeEnd?: string }): number {
  if (!row.validTimeEnd) return Number.NaN;
  const ms = new Date(row.validTimeEnd).getTime();
  return Number.isNaN(ms) ? Number.NaN : ms;
}

/**
 * 批量新增：按起运港+目的港+是否直达取最近一条历史运价，带出 DEM/DET/免箱使/航程（中转时还带中转港）。
 * 港口 id 保持字符串，禁止 Number()（雪花 id 会丢精度导致查不到历史）。
 */
export async function fetchLatestRouteHistory(params: {
  isDirect: boolean;
  podId: number | string;
  polId: number | string;
}): Promise<SeFreiPriceOutDto | undefined> {
  const polId = String(params.polId ?? '').trim();
  const podId = String(params.podId ?? '').trim();
  if (!polId || !podId) return undefined;

  const page = await getSeFreiPriceList({
    // 后端契约标 number，实际按字符串透传雪花 id
    polId: polId as unknown as number,
    podId: podId as unknown as number,
    pageIndex: 1,
    pageSize: 100,
    sorting: 'ValidTimeEnd DESC',
  });
  const items = (page.items ?? []).filter(
    (item) => item.isDirect === params.isDirect,
  );
  if (items.length === 0) return undefined;

  // 已按截止日降序；再兜底取有效截止日最晚的一条
  let best = items[0];
  let bestEnd = getValidTimeEndMs(best);
  for (let i = 1; i < items.length; i++) {
    const item = items[i]!;
    const end = getValidTimeEndMs(item);
    if (Number.isNaN(end)) continue;
    if (Number.isNaN(bestEnd) || end > bestEnd) {
      best = item;
      bestEnd = end;
    }
  }
  return best;
}
