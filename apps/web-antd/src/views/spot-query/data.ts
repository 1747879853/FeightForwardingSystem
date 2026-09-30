import type { RongETongApi } from '#/api/rong-e-tong/rong-e-tong-admin';

import dayjs from 'dayjs';

export type SpotItemDto = RongETongApi.SpotItemDto;
export type SpotQueryResultDto = RongETongApi.SpotQueryResultDto;

/** 排序方式 */
export type SpotSortMode = 'earliestEtd' | 'lowestPrice' | 'shortestVoyage';

/** 起运/目的港运输类型：CY 堆场，SD 门点 */
export type SpotServiceType = 'CY' | 'SD';

export const SPOT_SORT_OPTIONS: Array<{ label: string; value: SpotSortMode }> =
  [
    { label: '运价最低', value: 'lowestPrice' },
    { label: '最早开船', value: 'earliestEtd' },
    { label: '航程最短', value: 'shortestVoyage' },
  ];

export const SPOT_SERVICE_TYPE_OPTIONS: Array<{
  label: string;
  value: SpotServiceType;
}> = [
  { label: '堆场 (CY)', value: 'CY' },
  { label: '门点 (SD)', value: 'SD' },
];

/** 单箱型在某一船名航次下的报价 */
export interface SpotCardPrice {
  ctnCodeId: number;
  ctnName: string;
  freightAmount?: number;
  freightCurrency?: string;
  totalAmount?: number;
  totalCurrency?: string;
  isSoldOut?: boolean;
  /** 费用明细弹窗用完整条目 */
  spot: SpotItemDto;
}

/** 跨箱型合并后的运价卡片（同船司+船名+航次+ETD） */
export interface SpotCard {
  key: string;
  carrierCode: string;
  vessel: string;
  innerVoyno: string;
  routeCode: string;
  etd?: string;
  eta?: string;
  voyage?: number;
  isDirect?: boolean;
  isSoldOut: boolean;
  validTimeEnd?: null | string;
  quotationUpdateTime?: string;
  prices: SpotCardPrice[];
}

export interface SpotCtnFailItem {
  ctnName: string;
  errorMessage: string;
}

export interface SpotReuseHint {
  ctnName: string;
  minutesAgo: number;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/** 开船/预抵：10/24 (周六) */
export function formatSpotDate(value?: null | string): string {
  if (!value) return '-';
  const date = dayjs(value);
  if (!date.isValid()) return '-';
  const weekday = WEEKDAY_LABELS[date.day()] ?? '';
  return `${date.format('M/D')} (周${weekday})`;
}

/** 仅日期 yyyy-MM-dd */
export function formatSpotDateOnly(value?: null | string): string {
  if (!value) return '-';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD') : '-';
}

export function formatMoney(
  amount?: null | number,
  currency?: null | string,
): string {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return '-';
  }
  const code = String(currency ?? '').trim();
  const num = Number(amount);
  const text = Number.isInteger(num)
    ? String(num)
    : num.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      });
  return code ? `${code} ${text}` : text;
}

export function formatMinutesAgo(creationTime?: null | string): null | number {
  if (!creationTime) return null;
  const created = dayjs(creationTime);
  if (!created.isValid()) return null;
  const minutes = Math.max(0, dayjs().diff(created, 'minute'));
  return minutes;
}

export function paymentMethodLabel(method?: null | string): string {
  const value = String(method ?? '')
    .trim()
    .toUpperCase();
  if (value === 'P') return '预付';
  if (value === 'C') return '到付';
  return value || '-';
}

export function priceFeeTypeLabel(type?: null | number): string {
  if (type === 0) return '按箱';
  if (type === 1) return '按票';
  return '-';
}

/** 三方费用分组标题，接口为英文，抽屉展示中文。未收录的名称原样返回。 */
const FEE_CATEGORY_LABELS: Record<string, string> = {
  'origin charges': '起运港费用',
  'origin charge': '起运港费用',
  origin: '起运港费用',
  'freight charges': '海运费',
  'freight charge': '海运费',
  freight: '海运费',
  'ocean freight': '海运费',
  'destination charges': '目的港费用',
  'destination charge': '目的港费用',
  destination: '目的港费用',
  'other charges': '其他费用',
  'others charges': '其他费用',
  others: '其他费用',
  other: '其他费用',
  'additional charges': '附加费',
  'inland charges': '内陆费用',
};

export function feeCategoryLabel(name?: null | string): string {
  const raw = String(name ?? '').trim();
  if (!raw) return '未分类';
  const key = raw.toLowerCase().replaceAll(/\s+/g, ' ');
  return FEE_CATEGORY_LABELS[key] ?? raw;
}

export function dndTypeLabel(type?: null | number): string {
  switch (type) {
    case 1: {
      return '进口滞箱';
    }
    case 2: {
      return '进口滞港';
    }
    case 3: {
      return '堆存';
    }
    case 4: {
      return '合并计算';
    }
    default: {
      return '其他';
    }
  }
}

function buildCardKey(spot: SpotItemDto): string {
  return [
    String(spot.carrierCode ?? '')
      .trim()
      .toUpperCase(),
    String(spot.vessel ?? '')
      .trim()
      .toUpperCase(),
    String(spot.innerVoyno ?? '')
      .trim()
      .toUpperCase(),
    String(spot.etd ?? '').slice(0, 10),
  ].join('|');
}

function minTotalAmount(card: SpotCard): number {
  const amounts = card.prices
    .map((p) => p.totalAmount)
    .filter((n): n is number => typeof n === 'number' && !Number.isNaN(n));
  return amounts.length > 0 ? Math.min(...amounts) : Number.POSITIVE_INFINITY;
}

/** 将按箱型返回的结果合并为运价卡片，并提取失败/复用提示 */
export function buildSpotViewModel(results: SpotQueryResultDto[]): {
  cards: SpotCard[];
  fails: SpotCtnFailItem[];
  reuseHints: SpotReuseHint[];
} {
  const fails: SpotCtnFailItem[] = [];
  const reuseHints: SpotReuseHint[] = [];
  const cardMap = new Map<string, SpotCard>();

  for (const row of results) {
    const ctnName = String(row.ctnCode?.ctnName ?? '').trim() || '未知箱型';
    const ctnCodeId = Number(row.ctnCode?.id ?? 0);

    if (row.status === 2) {
      fails.push({
        ctnName,
        errorMessage: String(row.errorMessage ?? '').trim() || '查询失败',
      });
      continue;
    }

    if (row.isReused) {
      const minutes = formatMinutesAgo(row.creationTime);
      if (minutes !== null) {
        reuseHints.push({ ctnName, minutesAgo: minutes });
      }
    }

    for (const spot of row.spotList ?? []) {
      const key = buildCardKey(spot);
      let card = cardMap.get(key);
      if (!card) {
        card = {
          key,
          carrierCode: String(spot.carrierCode ?? '').trim() || '-',
          vessel: String(spot.vessel ?? '').trim() || '-',
          innerVoyno: String(spot.innerVoyno ?? '').trim() || '-',
          routeCode: String(spot.routeCode ?? '').trim() || '-',
          etd: spot.etd,
          eta: spot.eta,
          voyage: spot.voyage,
          isDirect: spot.isDirect,
          isSoldOut: Boolean(spot.isSoldOut),
          validTimeEnd: spot.validTimeEnd,
          quotationUpdateTime: spot.quotationUpdateTime,
          prices: [],
        };
        cardMap.set(key, card);
      } else if (spot.isSoldOut) {
        card.isSoldOut = true;
      }

      card.prices.push({
        ctnCodeId,
        ctnName,
        freightAmount: spot.freightAmount,
        freightCurrency: spot.freightCurrency,
        totalAmount: spot.totalAmount,
        totalCurrency: spot.totalCurrency,
        isSoldOut: spot.isSoldOut,
        spot,
      });
    }
  }

  for (const card of cardMap.values()) {
    card.prices.sort((a, b) => a.ctnName.localeCompare(b.ctnName, 'zh-CN'));
  }

  return {
    cards: [...cardMap.values()],
    fails,
    reuseHints,
  };
}

export function sortSpotCards(
  cards: SpotCard[],
  mode: SpotSortMode,
): SpotCard[] {
  const list = [...cards];
  list.sort((left, right) => {
    if (mode === 'lowestPrice') {
      const diff = minTotalAmount(left) - minTotalAmount(right);
      if (diff !== 0) return diff;
    } else if (mode === 'earliestEtd') {
      const leftTime = left.etd ? dayjs(left.etd).valueOf() : Number.NaN;
      const rightTime = right.etd ? dayjs(right.etd).valueOf() : Number.NaN;
      if (Number.isFinite(leftTime) && Number.isFinite(rightTime)) {
        const diff = leftTime - rightTime;
        if (diff !== 0) return diff;
      } else if (Number.isFinite(leftTime)) {
        return -1;
      } else if (Number.isFinite(rightTime)) {
        return 1;
      }
    } else if (mode === 'shortestVoyage') {
      const leftVoyage = left.voyage ?? Number.POSITIVE_INFINITY;
      const rightVoyage = right.voyage ?? Number.POSITIVE_INFINITY;
      const diff = leftVoyage - rightVoyage;
      if (diff !== 0) return diff;
    }
    return left.key.localeCompare(right.key);
  });
  return list;
}

/** 当前排序方式下的「最优」卡片 key（用于角标） */
export function pickBestCardKey(
  cards: SpotCard[],
  mode: SpotSortMode,
): null | string {
  if (cards.length === 0) return null;
  return sortSpotCards(cards, mode)[0]?.key ?? null;
}
