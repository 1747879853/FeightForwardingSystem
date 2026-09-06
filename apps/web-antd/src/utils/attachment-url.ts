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
 * 当前页能否用相对路径 `/Uploads` 拿到附件。
 * 只有 Vite 开发代理会转这路；各品牌生产是前端端口/域名一套、API 另一套，没有 `/Uploads` 反代。
 */
function canUseDevUploadsProxy() {
  return Boolean(import.meta.env.DEV);
}

/**
 * 浏览器内 fetch / iframe 用的附件地址。
 * - 开发：改成 `/Uploads/...` 相对路径，走 Vite 代理，避开 CORS 与 X-Frame-Options
 * - 生产：前后端不同源且无反代，保持后端绝对地址，避免先打前端站点再 404
 * 下载、img 仍用 `buildAttachmentUrl` 直连后端。
 */
export function resolveSameOriginMediaUrl(url?: string) {
  if (!url) return '';
  if (/^(blob:|data:)/i.test(url)) return url;

  const full = buildAttachmentUrl(url);
  if (!full) return '';
  if (!PROTOCOL_URL_REGEXP.test(full)) {
    return full.startsWith('/') ? full : `/${full}`;
  }

  try {
    const parsed = new URL(full);
    if (
      typeof window !== 'undefined' &&
      parsed.origin === window.location.origin
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }

    // 生产不要把 api.xxx.com/Uploads 改成 admin.xxx.com/Uploads
    if (!canUseDevUploadsProxy()) {
      return full;
    }

    const backendOrigin = getStaticFileOrigin() || removeApiSuffix(apiURL);
    if (backendOrigin && PROTOCOL_URL_REGEXP.test(backendOrigin)) {
      const backend = new URL(backendOrigin);
      if (parsed.origin === backend.origin) {
        return `${parsed.pathname}${parsed.search}`;
      }
    }
  } catch {
    return full;
  }

  return full;
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

/** Microsoft Office 在线嵌入预览 */
export const OFFICE_EMBED_VIEWER_URL =
  'https://view.officeapps.live.com/op/embed.aspx';

/**
 * 还原为公网可访问的素材地址（相对路径拼接当前品牌后端根）。
 * 用于 Office 在线预览：微软服务器会拉取 src，禁止落到前端 origin / localhost。
 */
export function resolvePublicMediaUrl(url?: string) {
  if (!url || typeof url !== 'string') return url || '';
  if (/^(blob:|data:)/i.test(url)) return url;

  const origin = getStaticFileOrigin();

  if (PROTOCOL_URL_REGEXP.test(url)) {
    if (!origin) return url;
    try {
      const parsed = new URL(url);
      const frontendOrigin =
        typeof window !== 'undefined' ? window.location.origin : '';
      if (
        frontendOrigin &&
        parsed.origin === frontendOrigin &&
        parsed.origin !== origin
      ) {
        return `${trimTrailingSlash(origin)}${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return url;
    }
    return url;
  }

  return buildStaticFileUrl(url);
}

/** 将素材地址补全为可访问的公网 URL */
export function resolveMediaUrl(url?: string) {
  return resolvePublicMediaUrl(url);
}

/** 生成 Office 在线文档嵌入预览地址 */
export function buildOfficeEmbedUrl(fileUrl?: string) {
  const publicUrl = resolvePublicMediaUrl(fileUrl);
  if (!publicUrl || /^(blob:|data:)/i.test(publicUrl)) return '';

  return `${OFFICE_EMBED_VIEWER_URL}?src=${encodeURIComponent(publicUrl)}`;
}

function isPdfDocument(fileUrl?: string, extension = '') {
  if (String(extension || '').toLowerCase() === 'pdf') {
    return true;
  }

  if (!fileUrl || typeof fileUrl !== 'string') {
    return false;
  }

  const normalizedUrl = fileUrl.split('?')[0]?.toLowerCase() ?? '';
  return normalizedUrl.endsWith('.pdf');
}

/** PDF 直接预览，其他 Office 文档走微软在线嵌入 */
export function buildDocumentPreviewUrl(fileUrl?: string, extension = '') {
  if (!fileUrl) return '';

  if (isPdfDocument(fileUrl, extension)) {
    return resolvePublicMediaUrl(fileUrl);
  }

  return buildOfficeEmbedUrl(fileUrl);
}
