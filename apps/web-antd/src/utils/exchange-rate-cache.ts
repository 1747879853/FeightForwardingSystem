import type { ExchangeRateAdminApi } from '#/api/system/base-data/exchange-rate-admin';

import { shallowRef } from 'vue';

import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';

/** 汇率表体量小，一次拉全量，避免每行按币别打详情 */
const PAGE_SIZE = 1000;

/** 币别 id（string 化，雪花 id 不做数值化）→ 当前生效的汇率记录 */
const rateCache = shallowRef(
  new Map<string, ExchangeRateAdminApi.ExchangeRateDto>(),
);

let loaded = false;
let inflight: null | Promise<void> = null;

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 汇率资料起止为日期（YYYY-MM-DD），按本地日历日比较，结束日当天全天有效 */
function toDateKey(value?: null | string): string | undefined {
  if (!value) return undefined;
  const isoDay = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return isoDay;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return formatLocalDate(date);
}

/**
 * 生效条件：已启用，且今天落在 startDate～endDate（含起止当天；起止为空视为不限）。
 * 不用时刻比较，避免 `YYYY-MM-DD` 被解析成 UTC 0 点后结束日上午就过期。
 */
export function isExchangeRateEffective(
  rate: Pick<
    ExchangeRateAdminApi.ExchangeRateDto,
    'enable' | 'endDate' | 'startDate'
  >,
  now = Date.now(),
): boolean {
  if (!rate.enable) return false;
  const today = formatLocalDate(new Date(now));
  const start = toDateKey(rate.startDate);
  const end = toDateKey(rate.endDate);
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

/** 雪花 id 超出安全整数，按十进制字符串比大小 */
function compareId(a?: null | number | string, b?: null | number | string) {
  const x = String(a ?? '');
  const y = String(b ?? '');
  if (x.length !== y.length) return x.length - y.length;
  if (x === y) return 0;
  return x > y ? 1 : -1;
}

/** 同币别有多条生效记录时，sortId 大者优先，其次 id 大者 */
function isPreferred(
  candidate: ExchangeRateAdminApi.ExchangeRateDto,
  current: ExchangeRateAdminApi.ExchangeRateDto,
) {
  const candidateSort = Number(candidate.sortId ?? 0);
  const currentSort = Number(current.sortId ?? 0);
  if (candidateSort !== currentSort) return candidateSort > currentSort;
  return compareId(candidate.id, current.id) > 0;
}

async function loadCache() {
  try {
    const res = await getExchangeRatePagedList({
      PageIndex: 1,
      PageSize: PAGE_SIZE,
    });
    const now = Date.now();
    const next = new Map<string, ExchangeRateAdminApi.ExchangeRateDto>();
    for (const rate of res?.items ?? []) {
      if (!isExchangeRateEffective(rate, now)) continue;
      const key = String(rate.currencyId ?? '');
      if (key === '') continue;
      const current = next.get(key);
      if (!current || isPreferred(rate, current)) next.set(key, rate);
    }
    rateCache.value = next;
    loaded = true;
  } catch {
    // 拉取失败不落缓存，下次调用重试；本次按「未维护汇率」处理
  }
}

/**
 * 保证汇率缓存可用；并发调用共用同一次请求。
 * @param forceRefresh 页面挂载时传 true，避免用上一次会话的旧汇率
 */
export function ensureExchangeRateCache(forceRefresh = false): Promise<void> {
  if (!forceRefresh && loaded) return Promise.resolve();
  inflight ??= loadCache().finally(() => {
    inflight = null;
  });
  return inflight;
}

/**
 * 读取已加载缓存中的生效汇率：应收取 drValue、应付取 crValue。
 * 缓存未就绪、该币别未维护、或记录已不在有效期内时返回 undefined。
 */
export function peekExchangeRate(
  currencyId?: null | number | string,
  paySide?: null | number,
): number | undefined {
  const key = String(currencyId ?? '');
  if (key === '') return undefined;
  const rate = rateCache.value.get(key);
  if (!rate || !isExchangeRateEffective(rate)) return undefined;
  const value = Number(paySide) === 1 ? rate.crValue : rate.drValue;
  return value ?? undefined;
}

/** 等缓存就绪后取生效汇率，语义同 {@link peekExchangeRate} */
export async function resolveExchangeRate(
  currencyId?: null | number | string,
  paySide?: null | number,
) {
  await ensureExchangeRateCache();
  return peekExchangeRate(currencyId, paySide);
}
