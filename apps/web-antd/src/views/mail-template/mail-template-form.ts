import type { MailTemplateAdminApi } from '#/api/mail-template/mail-template-admin';

import { isEmailAddress } from '#/views/personal-mail/mail-format';

export const LOCAL_UPLOAD_LIMIT_BYTES = 20 * 1024 * 1024;
export const TOTAL_ATTACHMENT_LIMIT_BYTES = 50 * 1024 * 1024;

export const NO_MAILBOX_HINT = '还没有配置个人邮箱';

export interface RecipientRow {
  key: string;
  mode: 'email' | 'source';
  email: string;
  recipientSource: null | number;
}

const PLACEHOLDER_PATTERN = /\{\{([^{}]+)\}\}/g;

export function stripUnsupportedPlaceholders(
  text: string,
  allowed: Set<string>,
) {
  const removed: string[] = [];
  const next = text.replace(PLACEHOLDER_PATTERN, (full, rawName: string) => {
    const name = rawName.trim();
    if (allowed.has(name)) {
      return full;
    }
    removed.push(name);
    return '';
  });
  return { next, removed };
}

export function validateRecipientRows(
  rows: RecipientRow[],
  roleLabel: string,
  allowedSources: Set<number>,
) {
  const seenEmail = new Set<string>();
  const seenSource = new Set<number>();
  for (const row of rows) {
    if (row.mode === 'email') {
      const email = row.email.trim();
      if (!email) {
        return `${roleLabel}要么直接填邮箱，要么选收件人来源，只能二选一`;
      }
      if (!isEmailAddress(email)) {
        return `邮箱【${email}】格式不正确`;
      }
      const key = email.toLowerCase();
      if (seenEmail.has(key)) {
        return `【${email}】重复`;
      }
      seenEmail.add(key);
      continue;
    }
    if (row.recipientSource === null || row.recipientSource === undefined) {
      return `${roleLabel}要么直接填邮箱，要么选收件人来源，只能二选一`;
    }
    if (!allowedSources.has(row.recipientSource)) {
      return `来源在当前适用模块中不可用`;
    }
    if (seenSource.has(row.recipientSource)) {
      return `收件人来源重复`;
    }
    seenSource.add(row.recipientSource);
  }
  return '';
}

export function toRecipientInputs(
  toRows: RecipientRow[],
  ccRows: RecipientRow[],
): MailTemplateAdminApi.RecipientInput[] {
  const mapRow = (
    row: RecipientRow,
    recipientType: number,
  ): MailTemplateAdminApi.RecipientInput => {
    if (row.mode === 'email') {
      return {
        recipientType,
        email: row.email.trim(),
        recipientSource: null,
      };
    }
    return {
      recipientType,
      recipientSource: row.recipientSource,
      email: null,
    };
  };
  return [
    ...toRows.map((row) => mapRow(row, 0)),
    ...ccRows.map((row) => mapRow(row, 1)),
  ];
}

export function splitRecipientRows(
  items?: MailTemplateAdminApi.RecipientDto[] | null,
): { ccRows: RecipientRow[]; toRows: RecipientRow[] } {
  const toRows: RecipientRow[] = [];
  const ccRows: RecipientRow[] = [];
  for (const item of items ?? []) {
    const row: RecipientRow = {
      key: item.id || `${item.recipientType}-${item.sortId ?? toRows.length}`,
      mode: item.email ? 'email' : 'source',
      email: item.email || '',
      recipientSource: item.recipientSource ?? null,
    };
    if (item.recipientType === 1) {
      ccRows.push(row);
    } else {
      toRows.push(row);
    }
  }
  return { toRows, ccRows };
}

export function readAbpErrorMessage(error: unknown) {
  const responseData = (error as { response?: { data?: any } })?.response?.data;
  const abpError = responseData?.error;
  if (abpError?.validationErrors?.length) {
    return abpError.validationErrors
      .map((item: { message?: string }) => item.message)
      .filter(Boolean)
      .join(', ');
  }
  return (
    abpError?.message ||
    abpError?.details ||
    (error as { message?: string })?.message ||
    '操作失败'
  );
}

export function formatByteSize(value?: null | number | string) {
  const size = Number(value);
  if (!Number.isFinite(size) || size < 0) {
    return '';
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
