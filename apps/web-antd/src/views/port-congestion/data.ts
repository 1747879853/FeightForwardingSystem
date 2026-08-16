import type { TableColumnsType } from 'ant-design-vue';

import type { FeituoPortCongestionApi } from '#/api/port-congestion/feituo-port-congestion-admin';

type PortCongestionRowDto = FeituoPortCongestionApi.PortCongestionRowDto;

interface LevelMeta {
  color: string;
  text: string;
}

/**
 * 拥堵状态图例。与天气影响同为 A/B/C/D，但语义不同，两套文案不可互换。
 */
export const PORT_STATUS_META: Record<string, LevelMeta> = {
  A: { color: 'green', text: '正常' },
  B: { color: 'gold', text: '轻微拥堵' },
  C: { color: 'orange', text: '中度拥堵' },
  D: { color: 'red', text: '严重拥堵' },
};

/** 天气影响程度图例 */
export const PORT_WEATHER_META: Record<string, LevelMeta> = {
  A: { color: 'green', text: '正常' },
  B: { color: 'gold', text: '轻微影响' },
  C: { color: 'orange', text: '中度影响' },
  D: { color: 'red', text: '严重影响' },
};

const UNKNOWN_LEVEL: LevelMeta = { color: 'default', text: '未知' };

export function getPortStatusMeta(status?: string): LevelMeta {
  return PORT_STATUS_META[(status ?? '').trim().toUpperCase()] ?? UNKNOWN_LEVEL;
}

export function getPortWeatherMeta(weather?: string): LevelMeta {
  return (
    PORT_WEATHER_META[(weather ?? '').trim().toUpperCase()] ?? UNKNOWN_LEVEL
  );
}

/** 天气类型中文映射 */
export const WEATHER_TYPE_MAP: Record<string, string> = {
  SUNNY_DAY: '晴（白天）',
  SUNNY_NIGHT: '晴（夜间）',
  CLOUDY_DAY: '多云（白天）',
  CLOUDY_NIGHT: '多云（夜间）',
  OVERCAST: '阴',
  WINDY: '大风',
  HAZE: '雾霾',
  RAINY: '雨',
  SNOWY: '雪',
};

export function getWeatherTypeText(type?: string): string {
  if (!type) return '-';
  return WEATHER_TYPE_MAP[type.trim().toUpperCase()] || type;
}

/** 天气详情里的数字均为字符串，参与展示前统一转换 */
export function parseNumeric(value?: null | string): null | number {
  if (value === null || value === undefined || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

/** 带单位的天气数值，空值统一显示为 '-' */
export function formatMeasure(
  value: null | string | undefined,
  unit: string,
  fractionDigits = 1,
): string {
  const parsed = parseNumeric(value);
  if (parsed === null) return '-';
  return `${parsed.toFixed(fractionDigits)} ${unit}`;
}

export function formatCount(value?: null | number): string {
  return value === null || value === undefined ? '-' : String(value);
}

/** 时长单位为小时 */
export function formatHours(value?: null | number): string {
  return value === null || value === undefined ? '-' : `${value.toFixed(2)} h`;
}

/** 在港时长常见几十上百小时，附带天数更直观 */
export function formatHoursWithDays(value?: null | number): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(2)} h（约 ${(value / 24).toFixed(1)} 天）`;
}

export function formatDays(value?: null | number): string {
  if (value === null || value === undefined) return '';
  return `约 ${(value / 24).toFixed(1)} 天`;
}

export function formatCoordinate(lat?: string, lon?: string): string {
  const latText = (lat ?? '').trim();
  const lonText = (lon ?? '').trim();
  if (!latText && !lonText) return '-';
  return `${latText || '-'}, ${lonText || '-'}`;
}

/** 湿度上游按 0~1 小数返回，展示为百分比 */
export function formatHumidity(value?: null | string): string {
  const parsed = parseNumeric(value);
  if (parsed === null) return '-';
  return `${(parsed <= 1 ? parsed * 100 : parsed).toFixed(0)} %`;
}

export function formatWind(
  wind?: FeituoPortCongestionApi.PortWeatherWindDto | null,
): string {
  if (!wind) return '-';
  const parts = [
    formatMeasure(wind.direction, '°', 0) === '-'
      ? ''
      : `风向 ${formatMeasure(wind.direction, '°', 0)}`,
    formatMeasure(wind.speed, 'm/s', 2) === '-'
      ? ''
      : `风速 ${formatMeasure(wind.speed, 'm/s', 2)}`,
    (wind.power ?? '').trim() ? `${wind.power} 级` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : '-';
}

/** 每日明细表列 */
export function useDailyColumns(): TableColumnsType {
  return [
    { title: '日期', dataIndex: 'key', key: 'key', width: 110, fixed: 'left' },
    {
      title: '拥堵状态',
      dataIndex: 'portStatus',
      key: 'portStatus',
      width: 110,
    },
    {
      title: '在港船数',
      dataIndex: 'ataVesselCount',
      key: 'ataVesselCount',
      width: 100,
      align: 'right',
    },
    {
      title: '靠泊船数',
      dataIndex: 'atbVesselCount',
      key: 'atbVesselCount',
      width: 100,
      align: 'right',
    },
    {
      title: '离港船数',
      dataIndex: 'atdVesselCount',
      key: 'atdVesselCount',
      width: 100,
      align: 'right',
    },
    {
      title: '平均候泊时长',
      dataIndex: 'avgAtbA',
      key: 'avgAtbA',
      width: 120,
      align: 'right',
    },
    {
      title: '平均作业时长',
      dataIndex: 'avgAtbD',
      key: 'avgAtbD',
      width: 120,
      align: 'right',
    },
    {
      title: '平均在港时长',
      dataIndex: 'avgAtd',
      key: 'avgAtd',
      width: 190,
      align: 'right',
    },
    {
      title: '天气影响',
      dataIndex: 'portWeather',
      key: 'portWeather',
      width: 200,
    },
    {
      title: '拥堵原因分析',
      dataIndex: 'portStatusDetails',
      key: 'portStatusDetails',
      ellipsis: true,
      width: 320,
    },
  ];
}

/** 图表按日期升序，表格按日期倒序（最新在前） */
export function sortRowsByDate(
  rows: PortCongestionRowDto[],
  order: 'asc' | 'desc' = 'asc',
): PortCongestionRowDto[] {
  const factor = order === 'asc' ? 1 : -1;
  return [...rows].sort(
    (a, b) => factor * (a.key ?? '').localeCompare(b.key ?? ''),
  );
}
