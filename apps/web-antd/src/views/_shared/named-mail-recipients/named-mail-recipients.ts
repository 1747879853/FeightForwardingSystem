import { isEmailAddress } from '#/views/personal-mail/mail-format';

/** 0 收件人，1 抄送人 */
export const MAIL_RECIPIENT_TO = 0;
export const MAIL_RECIPIENT_CC = 1;

export interface NamedMailRow {
  name: string;
  email: string;
}

export interface NamedMailRecipientInput {
  recipientType: number;
  name?: null | string;
  email: string;
}

export function splitNamedRecipients(
  items?: null | Array<{
    recipientType?: number;
    name?: null | string;
    email?: null | string;
  }>,
) {
  const to: NamedMailRow[] = [];
  const cc: NamedMailRow[] = [];
  for (const item of items ?? []) {
    const row = {
      name: (item.name ?? '').trim(),
      email: (item.email ?? '').trim(),
    };
    if (item.recipientType === MAIL_RECIPIENT_CC) {
      cc.push(row);
    } else {
      to.push(row);
    }
  }
  return { to, cc };
}

/** 同一列表内按邮箱去重（忽略大小写），名字保留第一次出现的。收件人和抄送人互不影响。 */
export function mergeNamedRecipients(
  groups: Array<
    | null
    | undefined
    | Array<{
        recipientType?: number;
        name?: null | string;
        email?: null | string;
      }>
  >,
): NamedMailRecipientInput[] {
  const seen = new Set<string>();
  const result: NamedMailRecipientInput[] = [];
  for (const group of groups) {
    for (const item of group ?? []) {
      const email = (item.email ?? '').trim();
      if (!email) continue;
      const recipientType =
        item.recipientType === MAIL_RECIPIENT_CC
          ? MAIL_RECIPIENT_CC
          : MAIL_RECIPIENT_TO;
      const key = `${recipientType}|${email.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const name = (item.name ?? '').trim();
      result.push({
        recipientType,
        name: name || null,
        email,
      });
    }
  }
  return result;
}

export function toNamedRecipientInputs(
  toRows: NamedMailRow[] = [],
  ccRows: NamedMailRow[] = [],
): NamedMailRecipientInput[] {
  const mapRow = (
    row: NamedMailRow,
    recipientType: number,
  ): NamedMailRecipientInput => {
    const name = row.name.trim();
    return {
      recipientType,
      name: name || null,
      email: row.email.trim(),
    };
  };
  return [
    ...toRows.map((row) => mapRow(row, MAIL_RECIPIENT_TO)),
    ...ccRows.map((row) => mapRow(row, MAIL_RECIPIENT_CC)),
  ];
}

function validateRows(rows: NamedMailRow[], label: string) {
  const seen = new Set<string>();
  for (const row of rows) {
    const email = row.email.trim();
    const name = row.name.trim();
    if (!email) {
      return `${label}邮箱不能为空`;
    }
    if (name.length > 64) {
      return `${label}名字【${name}】长度不能超过64`;
    }
    if (email.length > 256) {
      return `${label}邮箱【${email}】长度不能超过256`;
    }
    if (!isEmailAddress(email)) {
      return `${label}邮箱【${email}】格式不正确，请只填邮箱地址`;
    }
    const key = email.toLowerCase();
    if (seen.has(key)) {
      return `${label}邮箱【${email}】重复`;
    }
    seen.add(key);
  }
  return '';
}

/** 同一列表内不能重复。收件人和抄送人可以是同一个邮箱。 */
export function validateNamedRecipientLists(
  toRows: NamedMailRow[] = [],
  ccRows: NamedMailRow[] = [],
) {
  return validateRows(toRows, '收件人') || validateRows(ccRows, '抄送人');
}
