export type AttachmentPreviewCategory =
  | 'image'
  | 'office'
  | 'ofd'
  | 'other'
  | 'pdf';

export type OfficePreviewKind = 'docx' | 'excel' | 'pptx' | '';

export const IMAGE_PREVIEW_EXTENSIONS = new Set([
  'apng',
  'avif',
  'bmp',
  'gif',
  'ico',
  'jfif',
  'jpeg',
  'jpg',
  'png',
  'svg',
  'tif',
  'tiff',
  'webp',
]);

export const OFFICE_PREVIEW_EXTENSIONS = new Set([
  'csv',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
]);

/** 从文件名或 URL 取扩展名，忽略 query/hash */
export function getAttachmentFileExtension(source = '') {
  const match = String(source).match(/\.([a-z0-9]+)(?:[?#]|$)/i);
  return match?.[1]?.toLowerCase() ?? '';
}

/** 扩展名决定查看器分流：图片 / PDF / OFD / Office / 其它 */
export function resolveAttachmentPreviewCategory(
  fileName = '',
  fileUrl = '',
): AttachmentPreviewCategory {
  const ext = getAttachmentFileExtension(fileName || fileUrl);
  if (ext === 'pdf') return 'pdf';
  if (ext === 'ofd') return 'ofd';
  if (IMAGE_PREVIEW_EXTENSIONS.has(ext)) return 'image';
  if (OFFICE_PREVIEW_EXTENSIONS.has(ext)) return 'office';
  return 'other';
}

/** vue-office 可解析的格式；旧版 .doc / .ppt 返回空 */
export function resolveOfficePreviewKind(extension = ''): OfficePreviewKind {
  const ext = String(extension || '').toLowerCase();
  if (ext === 'docx') return 'docx';
  if (['csv', 'xls', 'xlsx'].includes(ext)) return 'excel';
  if (ext === 'pptx') return 'pptx';
  return '';
}
