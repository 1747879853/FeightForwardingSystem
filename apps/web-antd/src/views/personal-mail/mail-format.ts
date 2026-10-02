import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import dayjs from 'dayjs';

export const MAIL_ATTACHMENT_LIMIT_BYTES = 20 * 1024 * 1024;

const EMAIL_PATTERN = /^[\w.%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function isEmailAddress(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function formatMailAddress(
  info?: null | PersonalMailAdminApi.MailAddressInfo,
) {
  const address = info?.address?.trim() || '';
  const name = info?.name?.trim() || '';
  if (!address) return name;
  return name ? `${name} <${address}>` : address;
}

export function addressListText(
  list?: null | PersonalMailAdminApi.MailAddressInfo[],
) {
  return (list || [])
    .map((item) => formatMailAddress(item))
    .filter(Boolean)
    .join('；');
}

export function addressValues(
  list?: null | PersonalMailAdminApi.MailAddressInfo[],
) {
  return (list || []).map((item) => item.address?.trim() || '').filter(Boolean);
}

export function senderInitial(
  info?: null | PersonalMailAdminApi.MailAddressInfo,
) {
  const source = (info?.name || info?.address || '?').trim();
  return source.slice(0, 1).toUpperCase();
}

export function formatMailTime(value?: null | string) {
  if (!value) return '';
  const date = dayjs(value);
  if (!date.isValid()) return '';
  const now = dayjs();
  if (date.isSame(now, 'day')) return date.format('HH:mm');
  if (date.isSame(now, 'year')) return date.format('MM-DD');
  return date.format('YYYY-MM-DD');
}

export function formatMailDateTime(value?: null | string) {
  if (!value) return '';
  const date = dayjs(value);
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : '';
}

export function formatByteSize(size?: null | number) {
  if (size == null || size < 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export function buildMailSrcdoc(
  htmlBody?: null | string,
  textBody?: null | string,
) {
  const html = htmlBody?.trim();
  const body = html ? html : `<pre>${escapeHtml(textBody || '')}</pre>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"><style>html,body{height:100%;}body{margin:0;font-family:"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;font-size:14px;line-height:1.6;color:#1f1f1f;word-break:break-word;}img{max-width:100%;height:auto;}pre{margin:0;white-space:pre-wrap;font-family:inherit;}a{color:#1677ff;}</style></head><body>${body}</body></html>`;
}

export function fileToBase64Content(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      const result = String(reader.result || '');
      const comma = result.indexOf(',');
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    });
    reader.addEventListener('error', () => {
      reject(reader.error ?? new Error('读取文件失败'));
    });
    reader.readAsDataURL(file);
  });
}

export function visibleAttachments(
  list?: null | PersonalMailAdminApi.MailAttachmentSummary[],
) {
  return (list || []).filter((item) => !item.isInline);
}

const FOLDER_NAME_ZH: Record<string, string> = {
  archive: '归档',
  archives: '归档',
  'deleted items': '已删除',
  'deleted messages': '已删除',
  drafts: '草稿箱',
  inbox: '收件箱',
  junk: '垃圾邮件',
  'junk e-mail': '垃圾邮件',
  'junk email': '垃圾邮件',
  outbox: '发件箱',
  sent: '已发送',
  'sent items': '已发送',
  'sent mail': '已发送',
  'sent messages': '已发送',
  spam: '垃圾邮件',
  trash: '已删除',
};

export function folderDisplayName(
  folder: PersonalMailAdminApi.MailFolderSummary,
) {
  if (folder.isInbox) return '收件箱';
  if (folder.isDrafts) return '草稿箱';
  if (folder.isSent) return '已发送';
  if (folder.isTrash) return '已删除';
  if (folder.isJunk) return '垃圾邮件';
  const raw = (folder.name || folder.fullName || '').trim();
  const key = raw.toLowerCase();
  const leaf = key.split(/[/\\.]/).pop() || key;
  return FOLDER_NAME_ZH[key] || FOLDER_NAME_ZH[leaf] || raw;
}

export function folderCount(folder: PersonalMailAdminApi.MailFolderSummary) {
  const count =
    folder.isDrafts || folder.isSent ? folder.totalCount : folder.unreadCount;
  if (count == null || count < 0 || count === 0) return null;
  return count;
}
