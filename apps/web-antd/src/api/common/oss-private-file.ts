import { requestClient } from '#/api/request';

const API_PREFIX = '/services/app/Test';

/**
 * 获取 OSS 私有文件签名 URL（默认有效期由后端控制）
 */
export async function getOssPrivateFileUrl(objectName: string) {
  return requestClient.get<string>(`${API_PREFIX}/GetOssUrlAsync`, {
    params: { objectName },
  });
}

/**
 * 按候选 Key 顺序尝试获取 OSS 私有文件签名 URL
 */
export async function getOssPrivateFileUrlByCandidates(
  objectNames: string[],
): Promise<string> {
  let lastError: unknown;
  for (const objectName of objectNames) {
    try {
      return await getOssPrivateFileUrl(objectName);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('获取 OSS 私有文件签名 URL 失败');
}
