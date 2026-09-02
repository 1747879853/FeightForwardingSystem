import type { FeituoScheduleAdminApi } from '#/api/schedule/feituo-schedule-admin';

import dayjs from 'dayjs';

export type ScheduleItem = FeituoScheduleAdminApi.FeituoScheduleItemDto;

export interface ScheduleFilters {
  carrierCodes: string[];
  keyword: string;
  podTerminals: string[];
  polTerminals: string[];
  transitType: 'all' | 'direct' | 'transit';
}

export interface ScheduleGroup {
  carriers: string[];
  departureDay: string;
  duration?: null | number;
  groupName: string;
  id: string;
  isTransit: boolean;
  items: ScheduleItem[];
  minDuration?: null | number;
  nearestCyCutoff: string;
  nextEtd: string;
  podTerminal: string;
  polTerminal: string;
  routeCodes: string[];
  transitPath: string[];
}

export const transportModeMap: Record<string, string> = {
  BARGE: '支线',
  FEEDER: '驳船',
  RAIL: '铁路',
  TRUCK: '卡车',
  VESSEL: '大船',
};

/** 飞驼 routeEtd：SUN–SAT → 星期几 */
export const ROUTE_ETD_WEEKDAYS: Record<string, string> = {
  FRI: '星期五',
  MON: '星期一',
  SAT: '星期六',
  SUN: '星期日',
  THU: '星期四',
  TUE: '星期二',
  WED: '星期三',
};

export const WEEKDAY_SORT: Record<string, number> = {
  星期一: 1,
  星期三: 3,
  星期二: 2,
  星期五: 5,
  星期六: 6,
  星期四: 4,
  星期日: 7,
};

export const WEEKDAY_SHORT: Record<string, string> = {
  星期一: '周一',
  星期三: '周三',
  星期二: '周二',
  星期五: '周五',
  星期六: '周六',
  星期四: '周四',
  星期日: '周日',
};

export function formatWeekdayShort(day?: string): string {
  if (!day) return '';
  return WEEKDAY_SHORT[day] ?? day.replace('星期', '周');
}

export function getTransportModeText(mode?: string): string {
  if (!mode) return '-';
  return transportModeMap[mode] || mode;
}

export const AIS_IFRAME_CONFIG = {
  baseUrl:
    (import.meta.env.VITE_GLOB_FREIGHTOWER_AIS_URL as string) ||
    'https://i.saas.freightower.com/#/ais/vessel',
  clientId:
    (import.meta.env.VITE_GLOB_FREIGHTOWER_AIS_CLIENT_ID as string) || '',
  key: (import.meta.env.VITE_GLOB_FREIGHTOWER_AIS_KEY as string) || '',
};

/** 定位入参：有数字 MMSI 用 MMSI；否则用船名并去掉空格（文档示例 `WANHAIA19`） */
export function getAisQuery(
  item?: null | Pick<ScheduleItem, 'mmsi' | 'vessel'>,
): string {
  const mmsi = item?.mmsi?.trim() ?? '';
  if (mmsi && mmsi !== '0' && /^\d+$/.test(mmsi)) return mmsi;
  const fromMmsi = mmsi.replaceAll(/\s+/g, '');
  if (fromMmsi && fromMmsi !== '0') return fromMmsi;
  return (item?.vessel ?? '').replaceAll(/\s+/g, '').trim();
}

/**
 * 飞驼 AIS iframe，对齐官方文档：
 * `https://i.saas.freightower.com/#/ais/vessel?key=秘钥&clientId=客户账号&mmsi=MMSI号/船名`
 * 查询串必须接在 hash 路由后面；船名空格去掉，不要编成 `+` 或 `%20`。
 */
export function buildAisIframeUrl(mmsiOrVessel?: string): string {
  const { baseUrl, clientId, key } = AIS_IFRAME_CONFIG;
  const mmsi = getAisQuery({ mmsi: mmsiOrVessel, vessel: mmsiOrVessel });
  if (!baseUrl || !key || !clientId || !mmsi) return '';

  const query = [
    `key=${key}`,
    `clientId=${clientId}`,
    `mmsi=${mmsi}`,
    'lang=zh',
  ].join('&');

  const hashIndex = baseUrl.indexOf('#');
  if (hashIndex >= 0) {
    const origin = baseUrl.slice(0, hashIndex);
    let hash = baseUrl.slice(hashIndex);
    const hashQuery = hash.indexOf('?');
    if (hashQuery >= 0) hash = hash.slice(0, hashQuery);
    return `${origin}${hash}?${query}`;
  }

  const [path] = baseUrl.split('?');
  return `${path}?${query}`;
}

export function formatDate(value?: string): string {
  if (!value) return '-';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD') : value;
}

export function formatDateTime(value?: string): string {
  if (!value) return '-';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : value;
}

/** 零点只展示日期，避免班次表里全是 00:00 */
export function formatScheduleMoment(value?: string): string {
  if (!value) return '-';
  const date = dayjs(value);
  if (!date.isValid()) return value;
  if (date.hour() === 0 && date.minute() === 0 && date.second() === 0) {
    return date.format('YYYY-MM-DD');
  }
  return date.format('YYYY-MM-DD HH:mm');
}

export function formatCardDate(value?: string): string {
  if (!value) return '';
  const date = dayjs(value);
  return date.isValid() ? date.format('M月D日') : value;
}

/** 方案卡「最近离港 / 最早截关」主数字：09-02 */
export function formatMonthDay(value?: string): string {
  if (!value) return '';
  const date = dayjs(value);
  return date.isValid() ? date.format('MM-DD') : value;
}

export interface SplitMoment {
  date: string;
  time: string;
}

/** 班次表把日期和时间拆成两行；零点不显示时间 */
export function splitScheduleMoment(value?: string): SplitMoment {
  if (!value) return { date: '—', time: '' };
  const date = dayjs(value);
  if (!date.isValid()) return { date: value, time: '' };
  const midnight =
    date.hour() === 0 && date.minute() === 0 && date.second() === 0;
  return {
    date: date.format('YYYY-MM-DD'),
    time: midnight ? '' : date.format('HH:mm'),
  };
}

/** 方案卡航程数字：6 或 6-8，对齐设计稿连字符 */
export function formatDurationFigure(
  min?: null | number,
  max?: null | number,
): string {
  if (typeof min !== 'number' && typeof max !== 'number') return '—';
  if (typeof min !== 'number') return String(max);
  if (typeof max !== 'number') return String(min);
  return min === max ? String(min) : `${min}-${max}`;
}

export function formatDurationRange(
  min?: null | number,
  max?: null | number,
): string {
  if (typeof min !== 'number' && typeof max !== 'number') return '-';
  if (typeof min !== 'number') return String(max);
  if (typeof max !== 'number') return String(min);
  return min === max ? String(min) : `${min}–${max}`;
}

export function formatTerminalPath(pol?: string, pod?: string): string {
  if (pol && pod) return `${pol} → ${pod}`;
  return pol || pod || '';
}

export function text(value?: null | number | string): string {
  return value === null || value === undefined || value === ''
    ? '-'
    : String(value);
}

export function getDelayDays(actual?: string, planned?: string): number {
  if (!actual || !planned) return 0;
  const actualDate = dayjs(actual);
  const plannedDate = dayjs(planned);
  if (!actualDate.isValid() || !plannedDate.isValid()) return 0;
  return actualDate.startOf('day').diff(plannedDate.startOf('day'), 'day');
}

/** 班次表延误文案：只在晚于计划日时返回「延误N天」 */
export function formatDelayLabel(actual?: string, planned?: string): string {
  const days = getDelayDays(actual, planned);
  return days > 0 ? `延误${days}天` : '';
}

/** 详情展示：标准名优先，再回退原文 */
export function getTerminal(item: ScheduleItem, side: 'pod' | 'pol'): string {
  if (side === 'pol') {
    return item.polTerminalCn || item.polTerminal || '-';
  }
  return item.podTerminalCn || item.podTerminal || '-';
}

/** 分组/筛选只用标准化码头名；空值不合组、不进筛选项 */
export function getStandardTerminal(
  item: ScheduleItem,
  side: 'pod' | 'pol',
): string {
  const value = side === 'pol' ? item.polTerminalCn : item.podTerminalCn;
  return value?.trim() || '';
}

export function getDepartureDay(item: ScheduleItem): string {
  const departure = item.staticEtd || item.etd;
  if (!departure) return getRouteEtdWeekday(item) || '班期未标注';
  const date = dayjs(departure);
  if (!date.isValid()) return getRouteEtdWeekday(item) || '班期未标注';
  const weekDays = [
    '星期日',
    '星期一',
    '星期二',
    '星期三',
    '星期四',
    '星期五',
    '星期六',
  ];
  return weekDays[date.day()] ?? '班期未标注';
}

export function getRouteEtdWeekday(item: ScheduleItem): string {
  const code = item.routeEtd?.trim().toUpperCase() ?? '';
  const mapped = ROUTE_ETD_WEEKDAYS[code];
  if (mapped) return mapped;
  const departure = item.staticEtd || item.etd;
  if (!departure) return '';
  const date = dayjs(departure);
  if (!date.isValid()) return '';
  const weekDays = [
    '星期日',
    '星期一',
    '星期二',
    '星期三',
    '星期四',
    '星期五',
    '星期六',
  ];
  return weekDays[date.day()] ?? '';
}

/** 卡片展示组内全部星期，不进分组键 */
export function formatGroupWeekdays(items: ScheduleItem[]): string {
  const days = [
    ...new Set(
      items
        .map((item) => getRouteEtdWeekday(item))
        .filter((day): day is string => Boolean(day)),
    ),
  ].sort(
    (left, right) => (WEEKDAY_SORT[left] ?? 99) - (WEEKDAY_SORT[right] ?? 99),
  );
  return days.map((day) => formatWeekdayShort(day)).join('、');
}

export function getTransitPath(item: ScheduleItem): string[] {
  return (item.transits ?? []).map(
    (transit) =>
      transit.portName || transit.portEn || transit.portCode || '未知中转港',
  );
}

export function getItemCarriers(item: ScheduleItem): string[] {
  const carriers = [item.carrierCd];
  for (const cabin of item.shareCabins ?? []) {
    carriers.push(cabin.carrier);
  }
  return uniqueTokens(carriers);
}

export function getItemRouteCodes(item: ScheduleItem): string[] {
  const routes = [item.routeCode, item.displayName];
  for (const cabin of item.shareCabins ?? []) {
    routes.push(cabin.routeCode, cabin.displayName);
  }
  return uniqueTokens(routes);
}

export function formatCarrierRoute(
  carrier?: string,
  routeCode?: string,
): string {
  const name = carrier?.trim();
  if (!name) return '';
  const route = routeCode?.trim();
  return route ? `${name}(${route})` : name;
}

/**
 * 飞驼方案身份：有共舱时用共舱 `船公司(航线)` 去重字母序拼接；
 * 无共舱时退回本班次承运人+航线。
 */
export function getGroupName(item: ScheduleItem): string {
  const cabins = item.shareCabins ?? [];
  const tokens =
    cabins.length > 0
      ? cabins.map((cabin) =>
          formatCarrierRoute(cabin.carrier, cabin.routeCode),
        )
      : [formatCarrierRoute(item.carrierCd, item.routeCode)];
  return uniqueCarrierRoutes(tokens).join('/');
}

export function isUsableScheduleItem(item: ScheduleItem): boolean {
  const vessel = item.vessel?.trim() ?? '';
  if (!vessel) return false;
  const lower = vessel.toLowerCase();
  return (
    lower !== 'feeder' && !lower.includes('to be') && !lower.includes('tbn')
  );
}

export function sanitizeScheduleItems(items: ScheduleItem[]): ScheduleItem[] {
  return items.filter((item) => isUsableScheduleItem(item));
}

function uniqueTokens(values: Array<undefined | string>): string[] {
  return [
    ...new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

function uniqueCarrierRoutes(values: Array<undefined | string>): string[] {
  const map = new Map<string, string>();
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLocaleUpperCase();
    if (!map.has(key)) map.set(key, trimmed);
  }
  return [...map.values()].sort((left, right) =>
    left.localeCompare(right, 'en'),
  );
}

function normalize(value?: null | number | string): string {
  return String(value ?? '')
    .trim()
    .toLocaleUpperCase();
}

function pickGroupTerminal(items: ScheduleItem[], side: 'pod' | 'pol'): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    const terminal = getStandardTerminal(item, side);
    if (!terminal) continue;
    counts.set(terminal, (counts.get(terminal) ?? 0) + 1);
  }
  return (
    [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ??
    ''
  );
}

function dedupeByVesselVoyage(items: ScheduleItem[]): ScheduleItem[] {
  const map = new Map<string, ScheduleItem>();
  for (const item of [...items].sort(compareItemEtd)) {
    const key = `${normalize(item.vessel)}$${normalize(item.voyage)}`;
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()].sort(compareItemEtd);
}

function pickEarliestValue(
  items: ScheduleItem[],
  pick: (item: ScheduleItem) => string | undefined,
): string {
  let best: { raw: string; time: number } | undefined;
  for (const item of items) {
    const raw = pick(item)?.trim();
    if (!raw) continue;
    const date = dayjs(raw);
    if (!date.isValid()) continue;
    const time = date.valueOf();
    if (!best || time < best.time) best = { raw, time };
  }
  return best?.raw ?? '';
}

function pickGroupWeekday(items: ScheduleItem[]): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    const day = getRouteEtdWeekday(item);
    if (!day) continue;
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return (
    [...counts.entries()].sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return (WEEKDAY_SORT[left[0]] ?? 99) - (WEEKDAY_SORT[right[0]] ?? 99);
    })[0]?.[0] ?? ''
  );
}

/**
 * 对齐飞驼 `/application/schedule/p2p/group`：
 * 直达/中转 + 共舱 groupName。计划班期只作卡片展示，不拆组。
 * 单班航程、码头原文、中转港不进分组键。
 */
export function getScheduleGroupKey(item: ScheduleItem): string {
  return [item.isTransit ? 'transit' : 'direct', getGroupName(item)]
    .map(normalize)
    .join('|');
}

export function groupSchedules(items: ScheduleItem[]): ScheduleGroup[] {
  const map = new Map<string, ScheduleItem[]>();
  for (const item of sanitizeScheduleItems(items)) {
    const key = getScheduleGroupKey(item);
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }

  return [...map.entries()]
    .map(([id, groupItems]) => {
      const sortedItems = dedupeByVesselVoyage(groupItems);
      const first = sortedItems[0]!;
      const durations = sortedItems
        .map((item) => item.totalDuration ?? item.transitTime)
        .filter((value): value is number => typeof value === 'number');
      return {
        carriers: uniqueTokens(sortedItems.flatMap(getItemCarriers)),
        departureDay:
          pickGroupWeekday(sortedItems) ||
          getRouteEtdWeekday(first) ||
          getDepartureDay(first),
        duration: durations.length > 0 ? Math.max(...durations) : undefined,
        groupName: getGroupName(first),
        id,
        isTransit: Boolean(first.isTransit),
        items: sortedItems,
        minDuration: durations.length > 0 ? Math.min(...durations) : undefined,
        nearestCyCutoff: pickEarliestValue(
          sortedItems,
          (item) => item.cyCutoff,
        ),
        nextEtd: first.etd || first.staticEtd || '',
        podTerminal: pickGroupTerminal(sortedItems, 'pod'),
        polTerminal: pickGroupTerminal(sortedItems, 'pol'),
        routeCodes: uniqueTokens(sortedItems.flatMap(getItemRouteCodes)),
        transitPath: getTransitPath(first),
      } satisfies ScheduleGroup;
    })
    .sort(compareGroupWeekday);
}

export function compareGroupWeekday(
  left: ScheduleGroup,
  right: ScheduleGroup,
): number {
  const day =
    (WEEKDAY_SORT[left.departureDay] ?? 99) -
    (WEEKDAY_SORT[right.departureDay] ?? 99);
  if (day !== 0) return day;
  return left.groupName.localeCompare(right.groupName, 'en');
}

export function filterSchedules(
  items: ScheduleItem[],
  filters: ScheduleFilters,
): ScheduleItem[] {
  const keyword = normalize(filters.keyword);
  const selectedCarriers = new Set(filters.carrierCodes.map(normalize));
  const selectedPolTerminals = new Set(filters.polTerminals.map(normalize));
  const selectedPodTerminals = new Set(filters.podTerminals.map(normalize));

  return sanitizeScheduleItems(items).filter((item) => {
    if (filters.transitType === 'direct' && item.isTransit) return false;
    if (filters.transitType === 'transit' && !item.isTransit) return false;

    if (
      selectedCarriers.size > 0 &&
      !getItemCarriers(item).some((carrier) =>
        selectedCarriers.has(normalize(carrier)),
      )
    ) {
      return false;
    }
    if (
      selectedPolTerminals.size > 0 &&
      !selectedPolTerminals.has(normalize(getStandardTerminal(item, 'pol')))
    ) {
      return false;
    }
    if (
      selectedPodTerminals.size > 0 &&
      !selectedPodTerminals.has(normalize(getStandardTerminal(item, 'pod')))
    ) {
      return false;
    }
    if (!keyword) return true;

    const searchable = [
      item.vessel,
      item.voyage,
      item.routeCode,
      item.displayName,
      item.carrierCd,
      item.scac,
      item.polName,
      item.polCode,
      item.podName,
      item.podCode,
      item.solutionDescription,
      getGroupName(item),
      ...getTransitPath(item),
      ...getItemCarriers(item),
      ...getItemRouteCodes(item),
    ]
      .map(normalize)
      .join(' ');
    return searchable.includes(keyword);
  });
}

export function compareItemEtd(
  left?: ScheduleItem,
  right?: ScheduleItem,
): number {
  const leftDeparture = left?.etd || left?.staticEtd;
  const rightDeparture = right?.etd || right?.staticEtd;
  const leftTime = leftDeparture ? dayjs(leftDeparture).valueOf() : Number.NaN;
  const rightTime = rightDeparture
    ? dayjs(rightDeparture).valueOf()
    : Number.NaN;
  const safeLeft = Number.isNaN(leftTime) ? Number.MAX_SAFE_INTEGER : leftTime;
  const safeRight = Number.isNaN(rightTime)
    ? Number.MAX_SAFE_INTEGER
    : rightTime;
  return safeLeft - safeRight;
}

export function makeScheduleRowKey(item: ScheduleItem, index = 0): string {
  return (
    item.solutionCode ||
    [item.carrierCd, item.vessel, item.voyage, item.etd, index]
      .map(normalize)
      .join('|')
  );
}
