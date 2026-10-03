import { requestClient } from '#/api/request';

export namespace MailTemplateAdminApi {
  export interface RecipientSourceOption {
    value: number;
    name?: null | string;
  }

  export interface ModuleOption {
    frightModule: number;
    frightModuleName?: null | string;
    placeholders?: null | string[];
    recipientSources?: null | RecipientSourceOption[];
  }

  export interface RecipientInput {
    recipientType: number;
    recipientSource?: null | number;
    email?: null | string;
  }

  export interface RecipientDto {
    id?: string;
    recipientType: number;
    recipientSource?: null | number;
    email?: null | string;
    sortId?: number;
  }

  export interface MailTemplateDto {
    id: string;
    name?: null | string;
    frightModule?: number;
    serviceType?: null | number;
    isEnabled?: boolean;
    subject?: null | string;
    body?: null | string;
    sortId?: number;
    creationTime?: null | string;
    creatorUserId?: null | number | string;
    creatorUserName?: null | string;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number | string;
    lastModifierUserName?: null | string;
    mailTemplateRecipients?: null | RecipientDto[];
  }

  export interface AddDto {
    name: string;
    frightModule: number;
    serviceType?: null | number;
    isEnabled?: boolean;
    subject: string;
    body?: null | string;
    sortId?: number;
    mailTemplateRecipients?: RecipientInput[];
  }

  export interface EditDto {
    id: string;
    name: string;
    serviceType?: null | number;
    isEnabled?: boolean;
    subject: string;
    body?: null | string;
    sortId?: number;
    mailTemplateRecipients?: RecipientInput[];
  }

  export interface PagedList {
    items?: MailTemplateDto[];
    totalCount: number;
  }

  export interface PagedQuery {
    pageIndex?: number;
    pageSize?: number;
    sorting?: string;
    keyword?: string;
    frightModule?: number;
    serviceType?: number;
    isEnabled?: boolean;
  }
}

const API_PREFIX = '/services/app/MailTemplateAdmin';

export function getMailTemplateModuleOptions() {
  return requestClient.get<MailTemplateAdminApi.ModuleOption[]>(
    `${API_PREFIX}/GetModuleOptionListAsync`,
  );
}

export function getMailTemplatePagedList(
  params: MailTemplateAdminApi.PagedQuery,
) {
  return requestClient.get<MailTemplateAdminApi.PagedList>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
}

export function getMailTemplateDetail(id: string) {
  return requestClient.get<MailTemplateAdminApi.MailTemplateDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { id } },
  );
}

export function addMailTemplate(data: MailTemplateAdminApi.AddDto) {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
}

export function editMailTemplate(data: MailTemplateAdminApi.EditDto) {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
}

export function deleteMailTemplates(ids: string[]) {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { ids },
  });
}
