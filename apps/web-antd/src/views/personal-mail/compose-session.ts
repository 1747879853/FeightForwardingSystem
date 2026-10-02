import type { PersonalMailAdminApi } from '#/api/personal-mail/personal-mail-admin';

import {
  addressListText,
  addressValues,
  escapeHtml,
  formatMailAddress,
  formatMailDateTime,
  visibleAttachments,
} from '#/views/personal-mail/mail-format';

export type ComposeKind = 'draft' | 'forward' | 'new' | 'reply' | 'reply-all';

export interface KeptAttachment {
  fileName: string;
  index: number;
  size: number;
}

export interface ComposeSession {
  bcc: string[];
  body: string;
  cc: string[];
  draftFolderName: string;
  draftUid?: number;
  folderName: string;
  id: number;
  includeOriginalAttachments: boolean;
  inReplyToMessageId: string;
  keptAttachments: KeptAttachment[];
  kind: ComposeKind;
  lockedCc: string[];
  lockedTo: string[];
  messageId: string;
  quoteHtml: string;
  sourceAttachments: KeptAttachment[];
  subject: string;
  to: string[];
  uid?: number;
}

let sessionSeed = 0;

function nextSession(partial: Omit<ComposeSession, 'id'>): ComposeSession {
  sessionSeed += 1;
  return { id: sessionSeed, ...partial };
}

function emptySession(kind: ComposeKind): Omit<ComposeSession, 'id'> {
  return {
    bcc: [],
    body: '',
    cc: [],
    draftFolderName: '',
    folderName: '',
    includeOriginalAttachments: true,
    inReplyToMessageId: '',
    keptAttachments: [],
    kind,
    lockedCc: [],
    lockedTo: [],
    messageId: '',
    quoteHtml: '',
    sourceAttachments: [],
    subject: '',
    to: [],
  };
}

function replySubject(subject?: null | string) {
  const text = subject?.trim() || '';
  return /^re:/i.test(text) ? text : `Re: ${text}`;
}

function forwardSubject(subject?: null | string) {
  const text = subject?.trim() || '';
  return /^(?:fw|fwd):/i.test(text) ? text : `Fw: ${text}`;
}

function uniqueAddresses(list: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of list) {
    const address = item.trim();
    const key = address.toLowerCase();
    if (!address || seen.has(key)) continue;
    seen.add(key);
    result.push(address);
  }
  return result;
}

function replyTargets(detail: PersonalMailAdminApi.MailDetail) {
  const specified = addressValues(detail.replyTo);
  if (specified.length > 0) return specified;
  const from = detail.from?.address?.trim();
  return from ? [from] : [];
}

export function buildQuoteHtml(detail: PersonalMailAdminApi.MailDetail) {
  const original = detail.htmlBody?.trim()
    ? detail.htmlBody
    : `<pre>${escapeHtml(detail.textBody || '')}</pre>`;
  return [
    '<p><br></p>',
    '<p>----- 原始邮件 -----</p>',
    `<p>发件人：${escapeHtml(formatMailAddress(detail.from))}</p>`,
    `<p>时间：${escapeHtml(formatMailDateTime(detail.date))}</p>`,
    `<p>收件人：${escapeHtml(addressListText(detail.to))}</p>`,
    `<p>主题：${escapeHtml(detail.subject || '')}</p>`,
    `<blockquote>${original}</blockquote>`,
  ].join('');
}

export function buildForwardQuoteHtml(detail: PersonalMailAdminApi.MailDetail) {
  const original = detail.htmlBody?.trim()
    ? detail.htmlBody
    : `<pre>${escapeHtml(detail.textBody || '')}</pre>`;
  return [
    '<p><br></p>',
    '<p>----- 转发邮件 -----</p>',
    `<p>发件人：${escapeHtml(formatMailAddress(detail.from))}</p>`,
    `<p>时间：${escapeHtml(formatMailDateTime(detail.date))}</p>`,
    `<p>收件人：${escapeHtml(addressListText(detail.to))}</p>`,
    `<p>主题：${escapeHtml(detail.subject || '')}</p>`,
    original || '',
  ].join('');
}

export function createNewMailSession() {
  return nextSession(emptySession('new'));
}

export function createReplySession(
  detail: PersonalMailAdminApi.MailDetail,
  replyAll: boolean,
) {
  const lockedTo = replyTargets(detail);
  const lockedCc = replyAll
    ? uniqueAddresses([
        ...addressValues(detail.to),
        ...addressValues(detail.cc),
      ]).filter(
        (address) =>
          !lockedTo.some(
            (item) => item.toLowerCase() === address.toLowerCase(),
          ),
      )
    : [];
  return nextSession({
    ...emptySession(replyAll ? 'reply-all' : 'reply'),
    folderName: detail.folderName || '',
    inReplyToMessageId: detail.messageId || '',
    lockedCc,
    lockedTo,
    messageId: detail.messageId || '',
    quoteHtml: buildQuoteHtml(detail),
    subject: replySubject(detail.subject),
    uid: detail.uid,
  });
}

export function createForwardSession(detail: PersonalMailAdminApi.MailDetail) {
  return nextSession({
    ...emptySession('forward'),
    folderName: detail.folderName || '',
    messageId: detail.messageId || '',
    quoteHtml: buildForwardQuoteHtml(detail),
    sourceAttachments: originalAttachmentsOf(detail),
    subject: forwardSubject(detail.subject),
    uid: detail.uid,
  });
}

export function createDraftSession(detail: PersonalMailAdminApi.MailDetail) {
  return nextSession({
    ...emptySession('draft'),
    bcc: addressValues(detail.bcc),
    body: detail.htmlBody?.trim()
      ? detail.htmlBody
      : detail.textBody
        ? `<pre>${escapeHtml(detail.textBody)}</pre>`
        : '',
    cc: addressValues(detail.cc),
    draftFolderName: detail.folderName || '',
    draftUid: detail.uid,
    folderName: detail.folderName || '',
    keptAttachments: visibleAttachments(detail.attachments).map((item) => ({
      fileName: item.fileName || '附件',
      index: item.index,
      size: item.size || 0,
    })),
    messageId: detail.messageId || '',
    subject: detail.subject || '',
    to: addressValues(detail.to),
    uid: detail.uid,
  });
}

export function originalAttachmentsOf(detail: PersonalMailAdminApi.MailDetail) {
  return visibleAttachments(detail.attachments).map((item) => ({
    fileName: item.fileName || '附件',
    index: item.index,
    size: item.size || 0,
  }));
}
