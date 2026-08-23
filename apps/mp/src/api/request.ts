import { parseJsonSafe } from '@/utils/safe-json';

/** 后端根地址（不含 /api），附件与上传都基于它拼接 */
export const API_ORIGIN = String(import.meta.env.VITE_API_ORIGIN || '').replace(
  /\/+$/,
  '',
);

/** ABP 应用服务前缀 */
const API_BASE = `${API_ORIGIN}/api`;

const TOKEN_KEY = 'mp_access_token';

export interface AbpError {
  code?: number;
  details?: null | string;
  message?: null | string;
  validationErrors?: null | { message?: string }[];
}

export interface AbpEnvelope<T> {
  error?: AbpError | null;
  result: T;
  success: boolean;
  unAuthorizedRequest?: boolean;
}

/** 业务异常：message 已是后端可直接展示的中文文案 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly unauthorized: boolean;

  constructor(message: string, statusCode = 0, unauthorized = false) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.unauthorized = unauthorized;
  }
}

export function getAccessToken() {
  return uni.getStorageSync(TOKEN_KEY) || '';
}

export function setAccessToken(token: string) {
  uni.setStorageSync(TOKEN_KEY, token);
}

export function clearAccessToken() {
  uni.removeStorageSync(TOKEN_KEY);
}

function pickErrorMessage(
  error: AbpError | null | undefined,
  fallback: string,
) {
  if (!error) return fallback;
  const validation = error.validationErrors
    ?.map((item) => item?.message)
    .filter(Boolean)
    .join('，');
  return validation || error.message || error.details || fallback;
}

export interface RequestOptions {
  data?: Record<string, any>;
  /** 传 false 时不弹默认错误 Toast，由调用方自行处理 */
  header?: Record<string, string>;
  method?: 'DELETE' | 'GET' | 'POST' | 'PUT';
  params?: Record<string, any>;
  /** 不带 /api 前缀的完整地址时使用 */
  rawUrl?: string;
  url?: string;
}

function buildQuery(params?: Record<string, any>) {
  if (!params) return '';
  const pairs = Object.keys(params)
    .filter((key) => {
      const value = params[key];
      return value !== undefined && value !== null && value !== '';
    })
    .map(
      (key) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`,
    );
  return pairs.length > 0 ? `?${pairs.join('&')}` : '';
}

/**
 * 统一请求。成功时直接返回 ABP 的 result，失败抛 ApiError。
 * 401 会清 token 并跳登录页，调用方无需处理。
 */
export function request<T>(options: RequestOptions): Promise<T> {
  const path = options.rawUrl ?? `${API_BASE}${options.url ?? ''}`;
  const url = `${path}${buildQuery(options.params)}`;
  const token = getAccessToken();

  return new Promise<T>((resolve, reject) => {
    uni.request({
      url,
      method: options.method ?? 'GET',
      data: options.data,
      // 关闭自动 JSON 解析，交给 json-bigint 保住雪花 ID 精度
      dataType: 'string',
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.header,
      },
      success: (res) => {
        let payload: AbpEnvelope<T> | undefined;
        if (typeof res.data === 'string' && res.data) {
          try {
            payload = parseJsonSafe<AbpEnvelope<T>>(res.data);
          } catch {
            payload = undefined;
          }
        } else if (res.data && typeof res.data === 'object') {
          payload = res.data as AbpEnvelope<T>;
        }

        const statusCode = res.statusCode ?? 0;
        const unauthorized =
          statusCode === 401 || payload?.unAuthorizedRequest === true;

        if (unauthorized) {
          clearAccessToken();
          redirectToLogin();
          reject(
            new ApiError(
              pickErrorMessage(payload?.error, '登录已失效，请重新登录'),
              statusCode,
              true,
            ),
          );
          return;
        }

        if (statusCode >= 200 && statusCode < 300 && payload?.success) {
          resolve(payload.result);
          return;
        }

        reject(
          new ApiError(
            pickErrorMessage(payload?.error, `请求失败（${statusCode}）`),
            statusCode,
          ),
        );
      },
      fail: (err) => {
        reject(new ApiError(err?.errMsg || '网络异常，请稍后重试'));
      },
    });
  });
}

let redirecting = false;

function redirectToLogin() {
  if (redirecting) return;
  redirecting = true;
  uni.reLaunch({
    url: '/pages/login/index',
    complete: () => {
      redirecting = false;
    },
  });
}

/** 拼接附件访问地址：后端返回相对路径，需接到不带 /api 的根地址上 */
export function buildAttachmentUrl(url?: null | string) {
  if (!url) return '';
  if (/^(?:[a-z][a-z\d+\-.]*:)?\/\//i.test(url) || url.startsWith('data:')) {
    return url;
  }
  return `${API_ORIGIN}${url.startsWith('/') ? url : `/${url}`}`;
}

export function toastError(error: unknown, fallback = '操作失败') {
  const message = error instanceof Error ? error.message : fallback;
  uni.showToast({ icon: 'none', title: message || fallback });
}
