import { baseRequestClient } from '#/api/request';

const API_PREFIX = '/services/app/Test';

/**
 * 获取 OSS 私有文件签名 URL（默认有效期由后端控制）
 */
export async function getOssPrivateFileUrl(objectName: string) {
  const response = await baseRequestClient.get<unknown>(
    `${API_PREFIX}/GetOssUrlAsync`,
    {
      params: { objectName },
    },
  );
  if (typeof response === 'string') {
    return response;
  }
  if (typeof (response as { result?: unknown })?.result === 'string') {
    return (response as { result: string }).result;
  }
  if (typeof (response as { data?: unknown })?.data === 'string') {
    return (response as { data: string }).data;
  }
  if (
    typeof (response as { data?: { result?: unknown } })?.data?.result ===
    'string'
  ) {
    return (response as { data: { result: string } }).data.result;
  }
  throw new Error('GetOssUrlAsync 返回格式异常');
}

function isOssTrafficLimitError(error: unknown): boolean {
  const err = error as {
    message?: string;
    response?: { data?: { error?: { message?: string } }; status?: number };
  };
  const status = err?.response?.status;
  const serverMessage =
    err?.response?.data?.error?.message ?? err?.message ?? '';
  return (
    status === 500 && String(serverMessage).includes('24小时内请求流量超限')
  );
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
      // 命中后端 24h 流量上限后直接停止 OSS 请求，交给上层回退本地资源
      if (isOssTrafficLimitError(error)) {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError ?? new Error('获取 OSS 私有文件签名 URL 失败');
}
