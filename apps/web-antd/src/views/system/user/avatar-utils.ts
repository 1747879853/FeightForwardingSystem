import type { Attachment } from '#/api/common/upload';

import { buildAttachmentUrl } from '#/utils';

/** 提交用户头像：接口仅接受 URL 字符串 */
export function normalizeAvatarSubmitValue(
  value: unknown,
  fallback?: null | string,
): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }
  if (Array.isArray(value) && value.length > 0) {
    const item = value[0];
    if (typeof item === 'string' && item.trim()) {
      return item.trim();
    }
    if (item && typeof item === 'object' && 'url' in item) {
      const url = (item as Attachment).url;
      if (url?.trim()) return url.trim();
    }
  }
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'url' in value
  ) {
    const url = (value as Attachment).url;
    if (url?.trim()) return url.trim();
  }
  const normalizedFallback = fallback?.trim();
  return normalizedFallback || undefined;
}

/** 将接口返回的头像 URL 转为 FileUploadInput 绑定值 */
export function avatarUrlToFormValue(url?: null | string): Attachment[] {
  const normalized = url?.trim();
  if (!normalized) return [];
  return [
    {
      attachmentId: normalized,
      fileName: 'avatar',
      url: buildAttachmentUrl(normalized),
    },
  ];
}
