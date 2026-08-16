import { buildAirTrackingMapSrc } from './build-air-tracking-map-src';

/** 轨迹地图语言（与货物轨迹独立页的 `?lang=` 一致） */
export type VendorMapLang = 'en' | 'zh';

/** 打开轨迹地图所需的数据 */
export interface VendorTrackingMapPayload {
  /** 业务线：空运地图前端拼装，海运地图用后端下发的链接 */
  kind: 'air' | 'ocean';
  /** 展示用单号（航司单号 / 提单号或箱号），仅用于工具栏显示 */
  referenceNo?: string;
  /** 空运：航司单号（11 位纯数字） */
  businessNumber?: null | string;
  /** 海运：服务商下发的轨迹页链接 */
  iframeUrl?: null | string;
  /** 海运：服务商下发的轨迹页短链接（密文），分享时优先用它 */
  iframeShortUrl?: null | string;
}

/**
 * 覆盖/追加轨迹链接上的语言参数。
 *
 * 空运的 `lang` 是服务商明确列出的参数；海运链接由服务商下发，
 * 文档未列出参数表，这里按同名参数追加，未生效时页面语言以服务商默认为准。
 */
export function withMapLang(url: string, lang: VendorMapLang): string {
  const raw = url?.trim() ?? '';
  if (!raw) {
    return '';
  }
  const [path, query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  params.set('lang', lang);
  return `${path}?${params.toString()}`;
}

/** iframe 展示用地址：空运前端拼，海运用下发链接 */
export function resolveVendorMapSrc(
  payload: null | VendorTrackingMapPayload,
  lang: VendorMapLang,
): string {
  if (!payload) {
    return '';
  }
  if (payload.kind === 'air') {
    return buildAirTrackingMapSrc(payload.businessNumber, { lang });
  }
  const url = payload.iframeUrl?.trim() || payload.iframeShortUrl?.trim() || '';
  return url ? withMapLang(url, lang) : '';
}

/**
 * 海运分享令牌：把服务商链接编码后放进本系统分享页的 query。
 *
 * 客户拿到的地址栏始终是本系统域名与路径，令牌只是编码（不是加密），
 * 目的是让链接与界面不出现服务商信息；若合规上要求连 iframe 请求域名都不可见，
 * 需后端提供匿名接口或同源代理，届时把这里换成后端下发的 token。
 */
export function encodeVendorMapToken(url?: null | string): string {
  const raw = url?.trim() ?? '';
  if (!raw) {
    return '';
  }
  try {
    // 先 encodeURIComponent 再 btoa，避免非 ASCII 字符导致 btoa 抛错
    const base64 = btoa(encodeURIComponent(raw));
    return base64.replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
  } catch {
    return '';
  }
}

/** 解码分享令牌，拿回服务商链接；令牌非法时返回空字符串 */
export function decodeVendorMapToken(token?: null | string): string {
  const raw = token?.trim() ?? '';
  if (!raw) {
    return '';
  }
  try {
    const base64 = raw.replaceAll('-', '+').replaceAll('_', '/');
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '=',
    );
    return decodeURIComponent(atob(padded));
  } catch {
    return '';
  }
}
