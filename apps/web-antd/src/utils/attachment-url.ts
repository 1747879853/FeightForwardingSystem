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
 * 解析可用的后端静态根地址（绝对 URL，不含末尾 /）。
 * 禁止回退到前端 `window.location.origin`。
 */
function resolveBackendStaticOrigin() {
  const candidates = [
    // 开发优先显式静态根；生产/未配时用 API 根
    import.meta.env.PROD
      ? ''
      : (import.meta.env.VITE_GLOB_STATIC_URL as string) || '',
    apiURL,
  ];
  for (const candidate of candidates) {
    const origin = removeApiSuffix(candidate);
    if (origin && PROTOCOL_URL_REGEXP.test(origin)) {
      return origin;
    }
  }
  return '';
}

/**
 * 获取静态文件（如打印生成的 PDF `/PrintTempFile`）的后端根地址。
 * - 开发环境：优先 `VITE_GLOB_STATIC_URL`，否则从绝对 `VITE_GLOB_API_URL` 推导
 * - 生产环境：`VITE_GLOB_API_URL` 去掉 `/api`
 * 未得到绝对后端地址时返回空字符串（不会回退前端端口）。
 */
export function getStaticFileOrigin() {
  return resolveBackendStaticOrigin();
}

/**
 * 拼接静态文件访问地址：必须指向后端端口，禁止拼到前端 origin。
 */
export function buildStaticFileUrl(url?: string) {
  if (!url) return '';
  if (PROTOCOL_URL_REGEXP.test(url) || /^(blob:|data:)/i.test(url)) {
    return url;
  }
  const origin = getStaticFileOrigin();
  const path = url.startsWith('/') ? url : `/${url}`;
  // 无后端绝对根时仍返回相对 path，由调用方感知失败；切勿用前端端口冒充
  return origin ? `${trimTrailingSlash(origin)}${path}` : path;
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
 * - toolbar/navpanes：隐藏工具栏与左侧缩略图
 * - view=FitH：按宽度铺满，避免两侧黑边留白
 * 仅用于预览；下载、新窗口打开请使用原始 URL。
 */
export function buildPdfEmbedUrl(url?: string) {
  if (!url) return '';
  const base = url.split('#')[0] ?? url;
  return `${base}#toolbar=0&navpanes=0&view=FitH`;
}
