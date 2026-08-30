import type { ExchangeRateAdminApi } from '#/api/system/base-data/exchange-rate-admin';

import { shallowRef } from 'vue';

import { getExchangeRatePagedList } from '#/api/system/base-data/exchange-rate-admin';

/** 汇率表体量小，一次拉全量，避免每行按币别打详情 */
const PAGE_SIZE = 1000;

/** 币别 id（string 化，雪花 id 不做数值化）→ 已启用的汇率记录列表 */
// 本位币改外键后同一币别可并存多条不同本位币的记录，故按币别存全量再按本位币/日期筛
const rateCache = shallowRef(
  new Map<string, ExchangeRateAdminApi.ExchangeRateDto[]>(),
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
export function toExchangeRateDateKey(
  value?: Date | null | number | string,
): string | undefined {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : formatLocalDate(date);
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : formatLocalDate(value);
  }
  const isoDay = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return isoDay;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return formatLocalDate(date);
}

/** 匹配日：未传则今天；字符串取本地日历日，避免时区把日期提前一天 */
function resolveAsOfTime(asOf?: Date | null | number | string): number {
  if (asOf == null || asOf === '') return Date.now();
  if (typeof asOf === 'number') return asOf;
  if (asOf instanceof Date) return asOf.getTime();
  const key = toExchangeRateDateKey(asOf);
  if (!key) return Date.now();
  return new Date(`${key}T12:00:00`).getTime();
}

/**
 * 生效条件：已启用，且指定日期落在 startDate～endDate（含起止当天；起止为空视为不限）。
 * 不用时刻比较，避免 `YYYY-MM-DD` 被解析成 UTC 0 点后结束日上午就过期。
 * @param dateStr 业务日期（YYYY-MM-DD 或 ISO 字符串），为空按今天
 */
export function isExchangeRateEffectiveOn(
  rate: Pick<
    ExchangeRateAdminApi.ExchangeRateDto,
    'enable' | 'endDate' | 'startDate'
  >,
  dateStr?: null | string,
): boolean {
  if (!rate.enable) return false;
  const day = dateStr ? toExchangeRateDateKey(dateStr) : undefined;
  const today = day ?? formatLocalDate(new Date());
  const start = toExchangeRateDateKey(rate.startDate);
  const end = toExchangeRateDateKey(rate.endDate);
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

/**
 * 生效条件：已启用，且今天落在 startDate～endDate（含起止当天；起止为空视为不限）。
 * 不用时刻比较，避免 `YYYY-MM-DD` 被解析成 UTC 0 点后结束日上午就过期。
 * @param now 匹配日时间戳；业务联系单有开船日期时传入 ETD 当天，否则默认今天
 */
export function isExchangeRateEffective(
  rate: Pick<
    ExchangeRateAdminApi.ExchangeRateDto,
    'enable' | 'endDate' | 'startDate'
  >,
  now = Date.now(),
): boolean {
  return isExchangeRateEffectiveOn(rate, formatLocalDate(new Date(now)));
}

/** 人民币币别 id（币别种子数据）。发票只有中国有，发票汇率的本位币恒为人民币 */
const RMB_CURRENCY_ID = '1';

/**
 * 汇率记录的本位币是否为人民币。
 * 发票只有中国有：发票汇率（invoiceValue）恒为「外币兑人民币」。
 * 本位币改外键后同一币别可并存多条不同本位币的记录，取发票汇率前必须过滤。
 */
export function isRmbLocalCurrencyRate(
  rate: Pick<
    ExchangeRateAdminApi.ExchangeRateDto,
    'localCurrency' | 'localCurrencyId'
  >,
): boolean {
  return (
    String(rate.localCurrencyId ?? '') === RMB_CURRENCY_ID ||
    rate.localCurrency?.code === 'RMB'
  );
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
    // 只剔除停用记录；日期有效性在取数时按「今天」或业务日期判断，
    // 提前按今天过滤会把历史/未来 ETD 可用的汇率丢掉。
    const next = new Map<string, ExchangeRateAdminApi.ExchangeRateDto[]>();
    for (const rate of res?.items ?? []) {
      if (!rate.enable) continue;
      const key = String(rate.currencyId ?? '');
      if (key === '') continue;
      const list = next.get(key) ?? [];
      list.push(rate);
      next.set(key, list);
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

function pickQuotedRate(
  currencyId?: null | number | string,
  quoteCurrencyId?: null | number | string,
  asOf?: Date | null | number | string,
): ExchangeRateAdminApi.ExchangeRateDto | undefined {
  const key = String(currencyId ?? '');
  const quoteKey = String(quoteCurrencyId ?? '');
  if (key === '' || quoteKey === '') return undefined;
  const list = rateCache.value.get(key);
  if (!list || list.length === 0) return undefined;
  const asOfTime = resolveAsOfTime(asOf);
  let rate: ExchangeRateAdminApi.ExchangeRateDto | undefined;
  for (const item of list) {
    if (String(item.localCurrencyId ?? '') !== quoteKey) continue;
    if (!isExchangeRateEffective(item, asOfTime)) continue;
    if (!rate || isPreferred(item, rate)) rate = item;
  }
  return rate;
}

function pickEffectiveRate(
  currencyId?: null | number | string,
  localCurrencyId?: null | number | string,
  asOf?: Date | null | number | string,
): ExchangeRateAdminApi.ExchangeRateDto | undefined {
  const quoted = pickQuotedRate(currencyId, localCurrencyId, asOf);
  if (quoted) return quoted;
  const key = String(currencyId ?? '');
  if (key === '') return undefined;
  const list = rateCache.value.get(key);
  if (!list || list.length === 0) return undefined;
  const asOfTime = resolveAsOfTime(asOf);
  let rate: ExchangeRateAdminApi.ExchangeRateDto | undefined;
  for (const item of list) {
    if (!isExchangeRateEffective(item, asOfTime)) continue;
    if (!rate || isPreferred(item, rate)) rate = item;
  }
  return rate;
}

/**
 * 付费申请指定结算币别：只取「费用币别兑结算币」且**今天**有效的资料，
 * 不交叉折算、不按开船日。未维护则 undefined。
 */
export function peekQuotedExchangeRate(
  currencyId?: null | number | string,
  paySide?: null | number,
  quoteCurrencyId?: null | number | string,
  asOf?: Date | null | number | string,
): number | undefined {
  const rate = pickQuotedRate(currencyId, quoteCurrencyId, asOf);
  if (!rate) return undefined;
  const value = Number(paySide) === 1 ? rate.crValue : rate.drValue;
  return value ?? undefined;
}

/**
 * 读取已加载缓存中指定日期有效的汇率：应收取 drValue、应付取 crValue。
 * 缓存未就绪、该币别未维护、或没有满足条件的记录时返回 undefined。
 * @param localCurrencyId 业务所属公司的本位币；传入时优先取本位币匹配的记录。
 * @param dateStr 业务日期（如 ETD），为空按今天判有效期。
 * @param opts.strictLocalCurrency 为 true 时本位币严格匹配：传入 localCurrencyId 后
 * 找不到匹配记录直接返回 undefined，不做跨本位币兜底（费用录入用，避免填错公司的汇率）。
 * 默认 false，保留「取不到再按 sortId/id 优先级兜底」的兼容行为。
 */
export function peekExchangeRateOnDate(
  currencyId?: null | number | string,
  paySide?: null | number,
  localCurrencyId?: null | number | string,
  dateStr?: null | string,
  opts?: { strictLocalCurrency?: boolean },
): number | undefined {
  const localKey = String(localCurrencyId ?? '');
  const strict = opts?.strictLocalCurrency === true && localKey !== '';
  const rate = strict
    ? pickQuotedRate(currencyId, localCurrencyId, dateStr)
    : pickEffectiveRate(currencyId, localCurrencyId, dateStr);
  if (!rate) return undefined;
  const value = Number(paySide) === 1 ? rate.crValue : rate.drValue;
  return value ?? undefined;
}

/**
 * 读取已加载缓存中的生效汇率：应收取 drValue、应付取 crValue。
 * 缓存未就绪、该币别未维护、或记录在匹配日已不在有效期内时返回 undefined。
 * @param localCurrencyId 业务所属公司的本位币；传入时优先取本位币匹配的记录，
 * 取不到再兜底按 sortId/id 优先级选（兼容未传本位币的旧调用方）
 * @param asOf 匹配日；不传则今天。业务联系单有开船日期时传 ETD
 */
export function peekExchangeRate(
  currencyId?: null | number | string,
  paySide?: null | number,
  localCurrencyId?: null | number | string,
  asOf?: Date | null | number | string,
): number | undefined {
  return peekExchangeRateOnDate(
    currencyId,
    paySide,
    localCurrencyId,
    asOf == null || asOf === '' ? undefined : toExchangeRateDateKey(asOf),
  );
}

/** 等缓存就绪后取指定日期生效汇率，语义同 {@link peekExchangeRateOnDate} */
export async function resolveExchangeRateOnDate(
  currencyId?: null | number | string,
  paySide?: null | number,
  localCurrencyId?: null | number | string,
  dateStr?: null | string,
  opts?: { strictLocalCurrency?: boolean },
) {
  await ensureExchangeRateCache();
  return peekExchangeRateOnDate(
    currencyId,
    paySide,
    localCurrencyId,
    dateStr,
    opts,
  );
}

/** 等缓存就绪后取生效汇率，语义同 {@link peekExchangeRate} */
export async function resolveExchangeRate(
  currencyId?: null | number | string,
  paySide?: null | number,
  localCurrencyId?: null | number | string,
  asOf?: Date | null | number | string,
) {
  await ensureExchangeRateCache();
  return peekExchangeRate(currencyId, paySide, localCurrencyId, asOf);
}
