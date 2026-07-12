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
 * 获取静态文件（如打印生成的 PDF `/PrintTempFile`）的后端根地址。
 * - 生产环境：VITE_GLOB_API_URL 去掉 /api 后缀
 * - 开发环境：VITE_GLOB_STATIC_URL（不能用 localhost，需指向真实后端）
 * 未配置时返回空字符串。
 */
export function getStaticFileOrigin() {
  if (import.meta.env.PROD) {
    return removeApiSuffix(apiURL);
  }
  const devStatic = (import.meta.env.VITE_GLOB_STATIC_URL as string) || '';
  return devStatic ? removeApiSuffix(devStatic) : '';
}

/**
 * 拼接静态文件访问地址：优先使用后端静态根地址，避免开发环境落到 localhost。
 */
export function buildStaticFileUrl(url?: string) {
  if (!url) return '';
  if (PROTOCOL_URL_REGEXP.test(url) || /^(blob:|data:)/i.test(url)) {
    return url;
  }
  const origin = getStaticFileOrigin();
  const path = url.startsWith('/') ? url : `/${url}`;
  return origin
    ? `${trimTrailingSlash(origin)}${path}`
    : buildAttachmentUrl(url);
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

/**
 * 弹窗 iframe 内嵌 PDF 预览地址。
 * 通过 hash 隐藏 Chrome/Edge 自带工具栏与左侧缩略图/分页栏。
 * 仅用于预览；下载、新窗口打开请使用原始 URL。
 */
export function buildPdfEmbedUrl(url?: string) {
  if (!url) return '';
  const base = url.split('#')[0] ?? url;
  return `${base}#toolbar=0&navpanes=0`;
}
