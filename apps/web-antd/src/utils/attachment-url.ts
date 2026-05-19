import { useAppConfig } from '@vben/hooks';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);
const PROTOCOL_URL_REGEXP = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const removeApiSuffix = (value: string) =>
  trimTrailingSlash(String(value || '').trim()).replace(/\/api$/i, '');

/**
 * 获取请求使用的后端根地址（不带 /api）。
 * - 生产环境：返回 VITE_GLOB_API_URL 去掉 /api 后缀
 * - 开发环境：返回空字符串，保持代理行为
 */
export function getApiRootUrl() {
  if (!import.meta.env.PROD) {
    return '';
  }
  return removeApiSuffix(apiURL);
}

/**
 * 拼接附件访问地址。
 * 规则：VITE_GLOB_API_URL 去掉末尾 /api 后，与附件相对路径拼接。
 */
export function buildAttachmentUrl(url?: string) {
  if (!url) return '';

  // 已经是完整地址或 data/blob 等协议地址，直接返回。
  if (PROTOCOL_URL_REGEXP.test(url) || /^(blob:|data:)/i.test(url)) {
    return url;
  }

  const origin = removeApiSuffix(apiURL);
  const fallbackOrigin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : '';
  const base =
    origin && PROTOCOL_URL_REGEXP.test(origin) ? origin : fallbackOrigin;
  const path = url.startsWith('/') ? url : `/${url}`;
  return base ? `${trimTrailingSlash(base)}${path}` : path;
}
