import type { SeFreiPriceOutDto } from '#/api/sea-export/freight-rate-admin';

import { getSeFreiPriceList } from '#/api/sea-export/freight-rate-admin';

/** 箱型名 → 成本/指导价相对上一条运价的差额（涨为正、跌为负） */
export type CtnPriceChange = {
  costDelta?: number;
  sugDelta?: number;
};

export type FreightPriceChangeMap = Record<string, CtnPriceChange>;

export type SeFreiPriceListRow = SeFreiPriceOutDto & {
  _priceChange?: FreightPriceChangeMap;
};

function normId(value: unknown): string {
  if (value === undefined || value === null || value === '') return '';
  return String(value);
}

/** 船公司+起运港+目的港+是否直达+中转港1 */
export function buildFreightRouteKey(row: {
  carrierId?: unknown;
  isDirect?: boolean;
  poT1Id?: unknown;
  podId?: unknown;
  polId?: unknown;
}): string {
  return [
    normId(row.carrierId),
    normId(row.polId),
    normId(row.podId),
    row.isDirect ? '1' : '0',
    normId(row.poT1Id),
  ].join('|');
}

export function getValidTimeEndMs(row: { validTimeEnd?: string }): number {
  if (!row.validTimeEnd) return Number.NaN;
  const ms = new Date(row.validTimeEnd).getTime();
  return Number.isNaN(ms) ? Number.NaN : ms;
}

/**
 * 同航线键下，取有效截止日严格早于当前、且截止日最晚的一条作为「上一个运价」。
 */
export function findPreviousFreightRate(
  current: SeFreiPriceOutDto,
  pool: SeFreiPriceOutDto[],
): SeFreiPriceOutDto | undefined {
  const key = buildFreightRouteKey(current);
  const currentEnd = getValidTimeEndMs(current);
  if (Number.isNaN(currentEnd)) return undefined;

  let best: SeFreiPriceOutDto | undefined;
  let bestEnd = Number.NEGATIVE_INFINITY;

  for (const item of pool) {
    if (item.id === current.id) continue;
    if (buildFreightRouteKey(item) !== key) continue;
    const end = getValidTimeEndMs(item);
    if (Number.isNaN(end) || end >= currentEnd) continue;
    if (end > bestEnd) {
      bestEnd = end;
      best = item;
    }
  }
  return best;
}

function priceDelta(
  current: number | null | undefined,
  previous: number | null | undefined,
): number | undefined {
  if (current === undefined || current === null) return undefined;
  if (previous === undefined || previous === null) return undefined;
  const delta = Number(current) - Number(previous);
  if (Number.isNaN(delta) || delta === 0) return undefined;
  return delta;
}

export function buildCtnPriceChangeMap(
  current: SeFreiPriceOutDto,
  previous?: SeFreiPriceOutDto,
): FreightPriceChangeMap {
  if (!previous) return {};
  const map: FreightPriceChangeMap = {};
  const prevByCtnId = new Map(
    (previous.seFreiPriceCtns ?? []).map((ctn) => [normId(ctn.ctnCodeId), ctn]),
  );
  const prevByName = new Map(
    (previous.seFreiPriceCtns ?? [])
      .filter((ctn) => ctn.ctnCode?.ctnName)
      .map((ctn) => [ctn.ctnCode!.ctnName, ctn]),
  );

  for (const ctn of current.seFreiPriceCtns ?? []) {
    const name = ctn.ctnCode?.ctnName;
    if (!name) continue;
    const prev = prevByCtnId.get(normId(ctn.ctnCodeId)) || prevByName.get(name);
    if (!prev) continue;
    const costDelta = priceDelta(ctn.cost, prev.cost);
    const sugDelta = priceDelta(ctn.sugPrice, prev.sugPrice);
    if (costDelta === undefined && sugDelta === undefined) continue;
    map[name] = {
      ...(costDelta === undefined ? {} : { costDelta }),
      ...(sugDelta === undefined ? {} : { sugDelta }),
    };
  }
  return map;
}

/** 先合并当前页，再按船公司+港口拉历史，保证跨页也能对上「上一个有效截止日」。 */
export async function enrichFreightListPriceChanges(
  items: SeFreiPriceOutDto[],
): Promise<SeFreiPriceListRow[]> {
  if (!items.length) return [];

  const comboKeys = new Map<
    string,
    { carrierId: number; polId: number; podId: number }
  >();
  for (const row of items) {
    const carrierId = Number(row.carrierId);
    const polId = Number(row.polId);
    const podId = Number(row.podId);
    if (!carrierId || !polId || !podId) continue;
    const key = `${carrierId}|${polId}|${podId}`;
    if (!comboKeys.has(key)) {
      comboKeys.set(key, { carrierId, polId, podId });
    }
  }

  const fetched: SeFreiPriceOutDto[] = [];
  const combos = [...comboKeys.values()];
  const concurrency = 4;
  for (let i = 0; i < combos.length; i += concurrency) {
    const chunk = combos.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (combo) => {
        try {
          const page = await getSeFreiPriceList({
            carrierId: combo.carrierId,
            polId: combo.polId,
            podId: combo.podId,
            pageIndex: 1,
            pageSize: 100,
            sorting: 'ValidTimeEnd DESC',
          });
          return page.items ?? [];
        } catch {
          return [] as SeFreiPriceOutDto[];
        }
      }),
    );
    for (const list of results) fetched.push(...list);
  }

  const byId = new Map<string, SeFreiPriceOutDto>();
  for (const item of [...items, ...fetched]) {
    byId.set(String(item.id), item);
  }
  const fullPool = [...byId.values()];

  return items.map((row) => {
    const previous = findPreviousFreightRate(row, fullPool);
    return {
      ...row,
      _priceChange: buildCtnPriceChangeMap(row, previous),
    };
  });
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
