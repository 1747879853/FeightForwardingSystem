import type { ClientContactAdminApi } from '#/api/sea-export/client-contact-admin';

import { getClientContactPagedList } from '#/api/sea-export/client-contact-admin';

/** 往来单位联系人 id（后端 long，前端可能是数字或字符串） */
export type PartyContactId = number | string;

/** 标签旁展示、随保存提交的联系人快照 */
export type PartyContactDisplay = {
  email: string;
  id: PartyContactId;
  mobile: string;
  name: string;
  tel: string;
};

type ContactLike = {
  email?: null | string;
  id?: null | number | string;
  mobile?: null | string;
  name?: null | string;
  tel?: null | string;
};

function hasContactId(id: unknown): id is PartyContactId {
  return id !== undefined && id !== null && id !== '' && id !== 0;
}

export function toPartyContactDisplay(
  contact: ContactLike & { id: PartyContactId },
): PartyContactDisplay {
  return {
    email: contact.email ?? '',
    id: contact.id,
    mobile: contact.mobile ?? '',
    name: contact.name ?? '',
    tel: contact.tel ?? '',
  };
}

/** 详情里的联系人数组转成展示快照，丢掉没有 id 的脏数据 */
export function toPartyContactDisplays(
  contacts?: ContactLike[] | null,
): PartyContactDisplay[] {
  return (contacts ?? [])
    .filter((item): item is ContactLike & { id: PartyContactId } =>
      hasContactId(item?.id),
    )
    .map((item) => toPartyContactDisplay(item));
}

/** 未禁用里优先默认联系人，否则取第一条 */
export function pickDefaultClientContact(
  items?: ClientContactAdminApi.ClientContactDto[],
): ClientContactAdminApi.ClientContactDto | undefined {
  const enabled = (items ?? []).filter((item) => !item.isDisabled);
  return enabled.find((item) => item.isDefault) ?? enabled[0];
}

/** 往来单位下未禁用的联系人（最多 100 条），供多选弹层列出 */
export async function fetchClientContactOptions(
  clientId: unknown,
): Promise<ClientContactAdminApi.ClientContactDto[]> {
  if (clientId === undefined || clientId === null || clientId === '') {
    return [];
  }
  const result = await getClientContactPagedList({
    ClientId: String(clientId),
    IsDisabled: false,
    PageIndex: 1,
    PageSize: 100,
  });
  return result.items ?? [];
}

/** 选了往来单位后默认勾选的联系人：默认联系人，没有则第一条未禁用的；都没有为空数组 */
export async function fetchDefaultPartyContacts(
  clientId: unknown,
): Promise<PartyContactDisplay[]> {
  const contact = pickDefaultClientContact(
    await fetchClientContactOptions(clientId),
  );
  return contact ? [toPartyContactDisplay(contact)] : [];
}

/**
 * 提交用的联系人 id 数组。没选往来单位时传空数组，避免带着旧单位的联系人；
 * 编辑时后端按数组覆盖保存，漏传等于清空，所以始终要带上。
 */
export function toPartyContactIds(
  parentId: unknown,
  contactIds?: null | unknown[],
): PartyContactId[] {
  if (parentId === undefined || parentId === null || parentId === '') {
    return [];
  }
  return (contactIds ?? []).filter((id): id is PartyContactId =>
    hasContactId(id),
  );
}
