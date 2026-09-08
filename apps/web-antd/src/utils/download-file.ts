import { $t } from '@vben/locales';
import { downloadFileFromBlob } from '@vben/utils';

import { message } from 'ant-design-vue';

import {
  buildAttachmentUrl,
  resolveSameOriginMediaUrl,
} from './attachment-url';

/**
 * 通过隐藏链接触发文件下载。
 * 跨域时浏览器会忽略 `download` 指定名，附件请改用 `downloadAttachmentWithFriendlyName`。
 */
export function downloadFileByUrl(url: string, filename?: string) {
  if (!url) return;

  const link = document.createElement('a');
  link.href = url;
  if (filename) {
    link.download = filename;
  }
  link.rel = 'noopener noreferrer';
  document.body.append(link);
  link.click();
  link.remove();
}

/**
 * 静默拉取 blob 再下载，确保保存名用友好文件名。
 * 跨域直接 `<a download>` 会被浏览器忽略，落到 URL/存储名。
 * 打印链路请继续走 `use-print-format`，不要用本方法。
 *
 * @returns blob 下载成功为 true；失败已回退直链时为 false
 */
export async function downloadAttachmentWithFriendlyName(
  url?: null | string,
  fileName?: null | string,
): Promise<boolean> {
  const source = String(url || '').trim();
  if (!source) return false;

  const downloadName = String(fileName || '').trim() || 'download';
  const fullUrl = buildAttachmentUrl(source);
  const sameOriginUrl = resolveSameOriginMediaUrl(source);
  const candidateUrls = [sameOriginUrl, fullUrl].filter(
    (candidate, index, list): candidate is string =>
      Boolean(candidate) && list.indexOf(candidate) === index,
  );

  let blob: Blob | undefined;
  for (const candidate of candidateUrls) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const response = await fetch(candidate);
      if (response.ok) {
        // eslint-disable-next-line no-await-in-loop
        blob = await response.blob();
        break;
      }
    } catch {
      // 代理/跨域失败则试下一个候选地址
    }
  }

  if (blob) {
    downloadFileFromBlob({ source: blob, fileName: downloadName });
    return true;
  }

  message.warning($t('component.filePreview.downloadFailed'));
  downloadFileByUrl(fullUrl, downloadName);
  return false;
}
