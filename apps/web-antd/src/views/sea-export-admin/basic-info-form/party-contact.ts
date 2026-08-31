import type { ClientContactAdminApi } from '#/api/sea-export/client-contact-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { getClientContactPagedList } from '#/api/sea-export/client-contact-admin';

/** 标签旁展示用的联系人快照（Id 随保存提交） */
export type PartyContactDisplay = {
  email: string;
  id?: null | number | string;
  mobile: string;
  name: string;
  tel: string;
};

export function emptyPartyContact(): PartyContactDisplay {
  return { email: '', id: undefined, mobile: '', name: '', tel: '' };
}

type ContactLike = {
  email?: null | string;
  id?: null | number | string;
  mobile?: null | string;
  name?: null | string;
  tel?: null | string;
};

export function toPartyContactDisplay(
  contact?: ContactLike | null,
): PartyContactDisplay {
  if (!contact) return emptyPartyContact();
  return {
    email: contact.email ?? '',
    id: contact.id,
    mobile: contact.mobile ?? '',
    name: contact.name ?? '',
    tel: contact.tel ?? '',
  };
}

/** 未禁用里优先默认联系人，否则取第一条 */
export function pickDefaultClientContact(
  items?: ClientContactAdminApi.ClientContactDto[],
): ClientContactAdminApi.ClientContactDto | undefined {
  const enabled = (items ?? []).filter((item) => !item.isDisabled);
  return enabled.find((item) => item.isDefault) ?? enabled[0];
}

export async function fetchDefaultClientContact(
  clientId: unknown,
): Promise<ClientContactAdminApi.ClientContactDto | undefined> {
  if (clientId === undefined || clientId === null || clientId === '') {
    return undefined;
  }
  const result = await getClientContactPagedList({
    ClientId: String(clientId),
    IsDisabled: false,
    PageIndex: 1,
    PageSize: 100,
  });
  return pickDefaultClientContact(result.items);
}

/** 无有效 Id 时提交 null，避免编辑漏传被空覆盖 / 清空客户后仍带旧联系人 */
export function toNullableContactId(
  value: unknown,
): null | SeaExportAdminApi.LongId {
  if (value === undefined || value === null || value === '') return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const text = String(value).trim();
  return text ? text : null;
}
