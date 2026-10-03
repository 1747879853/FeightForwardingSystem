import { requestClient } from '#/api/request';

export namespace MailTemplateApi {
  export interface UsableTemplate {
    id: string;
    name?: null | string;
    serviceType?: null | number;
    sortId?: number;
  }

  export interface SystemAttachment {
    attachmentId?: null | number | string;
    friendlyFileName?: null | string;
    fileLength?: null | number | string;
    url?: null | string;
    attachmentDtlType?: null | {
      cnName?: null | string;
      name?: null | string;
    };
    creationTime?: null | string;
    creatorUserName?: null | string;
  }

  export interface GenerateResult {
    mailTemplateId?: string;
    subject?: null | string;
    body?: null | string;
    toAddresses?: null | string[];
    ccAddresses?: null | string[];
    invalidAddresses?: null | string[];
    systemAttachments?: null | SystemAttachment[];
  }

  export interface LocalAttachment {
    fileName: string;
    content: string;
  }

  export interface ComposeDto {
    frightModule: number;
    entityId: string;
    mailAccountId?: null | string;
    toAddresses?: string[];
    ccAddresses?: string[];
    subject: string;
    body?: null | string;
    systemAttachmentIds?: Array<number | string>;
    printFileNames?: string[];
    attachments?: LocalAttachment[];
  }

  export interface SendDto extends ComposeDto {
    mailTemplateId: string;
  }

  export interface SendResult {
    messageId?: null | string;
    subject?: null | string;
    toAddresses?: null | string[];
    ccAddresses?: null | string[];
    bccAddresses?: null | string[];
  }

  export interface SendRecordQuery {
    pageIndex?: number;
    pageSize?: number;
    sorting?: string;
    frightModule?: number;
    entityId?: string;
    mailTemplateId?: string;
    keyword?: string;
    sendTimeStart?: string;
    sendTimeEnd?: string;
  }

  export interface SendRecord {
    id: string;
    creationTime?: null | string;
    creatorUserId?: null | number | string;
    creatorUserName?: null | string;
    frightModule?: number;
    entityId?: string;
    entityNo?: null | string;
    mailTemplateId?: string;
    mailTemplateName?: null | string;
    fromAddress?: null | string;
    toAddresses?: null | string;
    ccAddresses?: null | string;
    subject?: null | string;
    messageId?: null | string;
  }

  export interface SendRecordPagedList {
    items?: SendRecord[];
    totalCount: number;
  }
}

const API_PREFIX = '/services/app/MailTemplate';

export function getUsableMailTemplates(params: {
  frightModule: number;
  entityId: string;
}) {
  return requestClient.get<MailTemplateApi.UsableTemplate[]>(
    `${API_PREFIX}/GetUsableListAsync`,
    { params },
  );
}

export function generateMail(data: {
  mailTemplateId: string;
  frightModule: number;
  entityId: string;
}) {
  return requestClient.post<MailTemplateApi.GenerateResult>(
    `${API_PREFIX}/GenerateAsync`,
    data,
  );
}

export function saveMailDraft(
  data: MailTemplateApi.ComposeDto,
  options?: { skipErrorMessage?: boolean },
) {
  return requestClient.post<boolean>(`${API_PREFIX}/SaveDraftAsync`, data, {
    timeout: 120_000,
    ...options,
  });
}

export function sendMail(
  data: MailTemplateApi.SendDto,
  options?: { skipErrorMessage?: boolean },
) {
  return requestClient.post<MailTemplateApi.SendResult>(
    `${API_PREFIX}/SendAsync`,
    data,
    { timeout: 120_000, ...options },
  );
}

export function getMyMailSendRecordPagedList(
  params: MailTemplateApi.SendRecordQuery,
) {
  return requestClient.get<MailTemplateApi.SendRecordPagedList>(
    `${API_PREFIX}/GetMySendRecordPagedListAsync`,
    { params },
  );
}
