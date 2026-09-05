import { parseJsonSafe } from '@/utils/safe-json';

import type { AbpEnvelope } from './request';
import {
  API_ORIGIN,
  ApiError,
  clearAccessToken,
  getAccessToken,
} from './request';

/** 识别箱号接口超时与后端 Gemini 超时对齐（180 秒） */
const EXTRACT_TIMEOUT_MS = 180_000;

export interface GeminiCtnNoUploadDto {
  attachmentId?: number | string;
  /** 识别失败或图里没有箱号时为 null，接口仍 success */
  ctnNo?: null | string;
  fileName?: string;
  filePath?: string;
  fileUrl?: string;
}

/**
 * 上传一张箱号照片并识别。后端会落附件，小程序忽略 attachmentId，只回填箱号。
 * POST /api/services/app/GeminiAdmin/UploadAndExtractCtnNoAsync
 */
export function uploadAndExtractCtnNo(filePath: string) {
  const token = getAccessToken();

  return new Promise<GeminiCtnNoUploadDto>((resolve, reject) => {
    uni.uploadFile({
      url: `${API_ORIGIN}/api/services/app/GeminiAdmin/UploadAndExtractCtnNoAsync`,
      filePath,
      name: 'file',
      timeout: EXTRACT_TIMEOUT_MS,
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        let payload: AbpEnvelope<GeminiCtnNoUploadDto> | undefined;
        try {
          payload =
            res.data && typeof res.data === 'object'
              ? (res.data as AbpEnvelope<GeminiCtnNoUploadDto>)
              : parseJsonSafe<AbpEnvelope<GeminiCtnNoUploadDto>>(
                  String(res.data ?? ''),
                );
        } catch {
          reject(new ApiError('识别返回解析失败'));
          return;
        }

        const statusCode = res.statusCode ?? 0;
        const unauthorized =
          statusCode === 401 || payload?.unAuthorizedRequest === true;
        if (unauthorized) {
          clearAccessToken();
          uni.reLaunch({ url: '/pages/login/index' });
          reject(new ApiError('登录已失效，请重新登录', statusCode, true));
          return;
        }

        if (statusCode >= 200 && statusCode < 300 && payload?.success) {
          resolve(payload.result ?? {});
          return;
        }

        reject(
          new ApiError(
            payload?.error?.message || `识别失败（${statusCode}）`,
            statusCode,
          ),
        );
      },
      fail: (err) => reject(new ApiError(err?.errMsg || '识别失败')),
    });
  });
}
