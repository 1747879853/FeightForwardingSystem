import { parseJsonSafe } from '@/utils/safe-json';

import { API_ORIGIN, ApiError, getAccessToken } from './request';

/**
 * 相机临时文件在 uploadFile 后常被系统回收，先解码并 saveFile，保证缩略图还能画。
 */
export function persistLocalImage(tempFilePath: string) {
  return new Promise<string>((resolve) => {
    uni.getImageInfo({
      src: tempFilePath,
      success: (info) => {
        const decoded = info.path || tempFilePath;
        uni.saveFile({
          tempFilePath: decoded,
          success: (saved) => resolve(saved.savedFilePath),
          fail: () => resolve(decoded),
        });
      },
      fail: () => resolve(tempFilePath),
    });
  });
}

export interface UploadResultItem {
  attachmentId: number | string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  friendlyFileName?: string;
}

/**
 * 上传单张监装照片，拿到 attachmentId。
 * 注意：上传接口不带 /api 前缀，与 web-antd 的 uploadFile 同一口径。
 */
export function uploadImage(filePath: string) {
  const token = getAccessToken();

  return new Promise<UploadResultItem>((resolve, reject) => {
    uni.uploadFile({
      url: `${API_ORIGIN}/upload/UploadFile`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      success: (res) => {
        let payload: any;
        try {
          payload = parseJsonSafe<any>(res.data);
        } catch {
          reject(new ApiError('上传返回解析失败'));
          return;
        }

        if (res.statusCode >= 200 && res.statusCode < 300 && payload?.success) {
          const first = (payload.result ?? [])[0];
          if (first) {
            resolve(first as UploadResultItem);
          } else {
            reject(new ApiError('上传未返回附件信息'));
          }
          return;
        }

        reject(
          new ApiError(
            payload?.error?.message || `上传失败（${res.statusCode}）`,
            res.statusCode,
          ),
        );
      },
      fail: (err) => reject(new ApiError(err?.errMsg || '上传失败')),
    });
  });
}

export type ImageSource = 'album' | 'camera';

/** 从指定来源选图，返回本地临时路径 */
export function chooseImages(sourceType: ImageSource[], count = 9) {
  return new Promise<string[]>((resolve, reject) => {
    uni.chooseImage({
      count,
      sizeType: ['compressed'],
      sourceType,
      success: (res) => resolve(res.tempFilePaths as string[]),
      fail: (err) => {
        // 用户主动取消不算失败
        if (String(err?.errMsg || '').includes('cancel')) {
          resolve([]);
          return;
        }
        reject(new ApiError(err?.errMsg || '选择图片失败'));
      },
    });
  });
}
