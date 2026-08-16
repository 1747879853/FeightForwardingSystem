import { preferences } from '@vben/preferences';

/**
 * 空运运踪可视化地图 iframe 地址（前端拼装）。
 *
 * 海运的轨迹页链接由后端随运踪摘要下发（`iframeUrl`），空运摘要不含链接，
 * 因此空运由前端按环境变量拼装，参照船期 AIS 的做法（见 `views/schedule-query/data.ts`）。
 *
 * 地址、客户号与可视化 key 一律来自 env，禁止写死在源码里。
 */
export const AIR_TRACKING_MAP_CONFIG = {
  /** iframe 基础地址（hash 路由） */
  baseUrl:
    (import.meta.env.VITE_GLOB_FREIGHTOWER_AIR_TRACKING_URL as string) || '',
  /** 客户账号 */
  clientId:
    (import.meta.env.VITE_GLOB_FREIGHTOWER_AIR_TRACKING_CLIENT_ID as string) ||
    '',
  /** 可视化 iframe 密钥（不是取 token 的 secret） */
  key: (import.meta.env.VITE_GLOB_FREIGHTOWER_AIR_TRACKING_KEY as string) || '',
};

/** 左侧信息菜单展示方式：0 隐藏 / 1 展开 / 2 收起 */
export type AirTrackingMapInfoMode = 0 | 1 | 2;

export interface BuildAirTrackingMapOptions {
  /** 语言，默认跟随当前界面语言 */
  lang?: 'en' | 'zh';
  /**
   * 左侧信息菜单，默认 `2`（收起）：弹窗内高度有限，且关键节点信息本系统已自行展示，
   * 需要看服务商侧明细时用户可自行展开。
   */
  showInfo?: AirTrackingMapInfoMode;
}

/** 配置是否齐全；缺任一项时界面不展示轨迹地图入口 */
export function hasAirTrackingMapConfig(): boolean {
  const { baseUrl, clientId, key } = AIR_TRACKING_MAP_CONFIG;
  return Boolean(baseUrl && clientId && key);
}

/** 界面语言映射为 iframe 的 lang 参数 */
function resolveLang(lang?: 'en' | 'zh'): 'en' | 'zh' {
  if (lang) {
    return lang;
  }
  return preferences.app.locale === 'en-US' ? 'en' : 'zh';
}

/**
 * 拼装空运运踪地图 iframe 地址。
 *
 * @param businessNumber 航司单号（11 位纯数字，取运踪摘要的 businessNumber，与订阅参数一致）
 * @param options 语言与左侧菜单展示方式
 * @returns 完整 iframe 地址；配置缺失或单号为空时返回空字符串
 */
export function buildAirTrackingMapSrc(
  businessNumber?: null | string,
  options?: BuildAirTrackingMapOptions,
): string {
  const reference = businessNumber?.trim() ?? '';
  const { baseUrl, clientId, key } = AIR_TRACKING_MAP_CONFIG;
  if (!reference || !baseUrl || !clientId || !key) {
    return '';
  }
  const [path, query = ''] = baseUrl.split('?');
  const params = new URLSearchParams(query);
  params.set('key', key);
  params.set('clientId', clientId);
  params.set('businessNumber', reference);
  params.set('showInfo', String(options?.showInfo ?? 2));
  params.set('lang', resolveLang(options?.lang));
  return `${path}?${params.toString()}`;
}
