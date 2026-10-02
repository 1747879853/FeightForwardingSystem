import { requestClient } from '#/api/request';

/** IMAP 实时取信，默认 20 秒不够用 */
const MAIL_TIMEOUT = 120_000;

const API_PREFIX = '/services/app/PersonalMailAdmin';

export const PERSONAL_MAIL_PERMISSION = {
  account: 'Admin.PersonalMail',
  get: 'Admin.PersonalMail.Get',
  download: 'Admin.PersonalMail.Download',
  send: 'Admin.PersonalMail.Send',
  reply: 'Admin.PersonalMail.Reply',
  forward: 'Admin.PersonalMail.Forward',
  draft: 'Admin.PersonalMail.Draft',
  setRead: 'Admin.PersonalMail.SetRead',
  move: 'Admin.PersonalMail.Move',
  delete: 'Admin.PersonalMail.Delete',
} as const;

export namespace PersonalMailAdminApi {
  export interface MailAddressInfo {
    name?: null | string;
    address?: null | string;
  }

  export interface PersonalMailAccountDto {
    id: string;
    emailAddress?: null | string;
    displayName?: null | string;
    userName?: null | string;
    hasPassword?: boolean;
    imapHost?: null | string;
    imapPort?: number;
    imapEnableSsl?: boolean;
    smtpHost?: null | string;
    smtpPort?: number;
    smtpEnableSsl?: boolean;
    creationTime?: null | string;
    creatorUserName?: null | string;
    lastModificationTime?: null | string;
    lastModifierUserName?: null | string;
  }

  export interface PersonalMailAccountAddDto {
    emailAddress: string;
    displayName?: null | string;
    userName?: null | string;
    password?: null | string;
    imapHost: string;
    imapPort?: number;
    imapEnableSsl?: boolean;
    smtpHost: string;
    smtpPort?: number;
    smtpEnableSsl?: boolean;
  }

  export interface PersonalMailAccountEditDto extends PersonalMailAccountAddDto {
    id?: null | string;
  }

  export interface MailConnectionTestResult {
    imapSuccess?: boolean;
    imapMessage?: null | string;
    smtpSuccess?: boolean;
    smtpMessage?: null | string;
  }

  export interface MailFolderSummary {
    name?: null | string;
    fullName?: null | string;
    isInbox?: boolean;
    isDrafts?: boolean;
    isSent?: boolean;
    isTrash?: boolean;
    isJunk?: boolean;
    totalCount?: number;
    unreadCount?: number;
  }

  export interface MailSummary {
    uid: number;
    folderName?: null | string;
    messageId?: null | string;
    subject?: null | string;
    from?: MailAddressInfo | null;
    to?: MailAddressInfo[] | null;
    cc?: MailAddressInfo[] | null;
    date?: null | string;
    isRead?: boolean;
    isAnswered?: boolean;
    hasAttachment?: boolean;
    size?: number;
  }

  export interface MailAttachmentSummary {
    index: number;
    fileName?: null | string;
    contentType?: null | string;
    size?: number;
    isInline?: boolean;
    contentId?: null | string;
  }

  export interface MailDetail extends MailSummary {
    replyTo?: MailAddressInfo[] | null;
    bcc?: MailAddressInfo[] | null;
    htmlBody?: null | string;
    textBody?: null | string;
    attachments?: MailAttachmentSummary[] | null;
  }

  export interface PagedList<T> {
    items?: T[] | null;
    totalCount?: number;
    currentPage?: number;
    totalPages?: number;
  }

  export interface PersonalMailQueryDto {
    folderName?: string;
    keyword?: string;
    unreadOnly?: boolean;
    startDate?: string;
    endDate?: string;
    pageIndex?: number;
    pageSize?: number;
  }

  export interface PersonalMailDetailQueryDto {
    folderName?: string;
    uid?: number;
    messageId?: string;
    markAsRead?: boolean;
    embedInlineImages?: boolean;
  }

  export interface PersonalMailAttachmentQueryDto extends PersonalMailDetailQueryDto {
    attachmentIndex: number;
  }

  export interface PersonalMailAttachmentDto {
    fileName: string;
    content: string;
  }

  export interface PersonalMailSendDto {
    toAddresses?: string[];
    ccAddresses?: string[];
    bccAddresses?: string[];
    subject?: string;
    body?: string;
    isBodyHtml?: boolean;
    attachments?: PersonalMailAttachmentDto[];
    draftUid?: number;
    keepDraftAttachmentIndexes?: number[];
    inReplyToMessageId?: string;
    appendToSentFolder?: boolean;
  }

  export interface PersonalMailReplyDto {
    folderName?: string;
    uid?: number;
    messageId?: string;
    body: string;
    isBodyHtml?: boolean;
    replyAll?: boolean;
    quoteOriginalBody?: boolean;
    toAddresses?: string[];
    ccAddresses?: string[];
    bccAddresses?: string[];
    attachments?: PersonalMailAttachmentDto[];
    markOriginalAsAnswered?: boolean;
    appendToSentFolder?: boolean;
  }

  export interface PersonalMailForwardDto {
    folderName?: string;
    uid?: number;
    messageId?: string;
    toAddresses?: string[];
    ccAddresses?: string[];
    bccAddresses?: string[];
    subject?: string;
    body?: string;
    isBodyHtml?: boolean;
    includeOriginalAttachments?: boolean;
    attachments?: PersonalMailAttachmentDto[];
    appendToSentFolder?: boolean;
  }

  export interface MailSendResult {
    messageId?: null | string;
    subject?: null | string;
    toAddresses?: string[] | null;
    ccAddresses?: string[] | null;
    bccAddresses?: string[] | null;
  }

  export interface MailReplyResult extends MailSendResult {
    originalMessageId?: null | string;
    originalUid?: number;
  }

  export interface MailDraftSaveResult {
    folderName?: null | string;
    uid?: null | number;
    messageId?: null | string;
  }

  export interface PersonalMailSetReadDto {
    folderName?: string;
    uids: number[];
    isRead: boolean;
  }

  export interface PersonalMailMoveDto {
    folderName?: string;
    uids: number[];
    targetFolderName: string;
  }

  export interface PersonalMailDeleteDto {
    folderName?: string;
    uids: number[];
    permanent?: boolean;
  }
}

const mailRequest = { timeout: MAIL_TIMEOUT };

export function getMyPersonalMailAccountList(options?: {
  skipErrorMessage?: boolean;
}) {
  return requestClient.get<PersonalMailAdminApi.PersonalMailAccountDto[]>(
    `${API_PREFIX}/GetMyAccountListAsync`,
    { ...mailRequest, ...options },
  );
}

export function addMyPersonalMailAccount(
  data: PersonalMailAdminApi.PersonalMailAccountAddDto,
) {
  return requestClient.post<string>(
    `${API_PREFIX}/AddMyAccountAsync`,
    data,
    mailRequest,
  );
}

export function editMyPersonalMailAccount(
  data: PersonalMailAdminApi.PersonalMailAccountEditDto,
) {
  return requestClient.put(
    `${API_PREFIX}/EditMyAccountAsync`,
    data,
    mailRequest,
  );
}

export function deleteMyPersonalMailAccount(id: string) {
  return requestClient.delete(`${API_PREFIX}/DeleteMyAccountAsync`, {
    ...mailRequest,
    data: { id },
  });
}

export function testMyPersonalMailAccount(
  data: PersonalMailAdminApi.PersonalMailAccountEditDto,
) {
  return requestClient.post<PersonalMailAdminApi.MailConnectionTestResult>(
    `${API_PREFIX}/TestMyAccountAsync`,
    data,
    mailRequest,
  );
}

export function getPersonalMailFolderList() {
  return requestClient.get<PersonalMailAdminApi.MailFolderSummary[]>(
    `${API_PREFIX}/GetFolderListAsync`,
    { ...mailRequest, skipErrorMessage: true },
  );
}

export function getPersonalMailPagedList(
  data: PersonalMailAdminApi.PersonalMailQueryDto,
  options?: { skipErrorMessage?: boolean },
) {
  return requestClient.post<
    PersonalMailAdminApi.PagedList<PersonalMailAdminApi.MailSummary>
  >(`${API_PREFIX}/GetMailPagedListAsync`, data, {
    ...mailRequest,
    ...options,
  });
}

export function getPersonalMailDetail(
  data: PersonalMailAdminApi.PersonalMailDetailQueryDto,
) {
  return requestClient.post<PersonalMailAdminApi.MailDetail>(
    `${API_PREFIX}/GetMailAsync`,
    data,
    mailRequest,
  );
}

export function downloadPersonalMailAttachment(
  data: PersonalMailAdminApi.PersonalMailAttachmentQueryDto,
) {
  return requestClient.download<Blob>(`${API_PREFIX}/DownloadAttachmentAsync`, {
    data,
    method: 'POST',
    skipErrorMessage: true,
    timeout: MAIL_TIMEOUT,
  });
}

export function sendPersonalMail(
  data: PersonalMailAdminApi.PersonalMailSendDto,
) {
  return requestClient.post<PersonalMailAdminApi.MailSendResult>(
    `${API_PREFIX}/SendAsync`,
    data,
    mailRequest,
  );
}

export function replyPersonalMail(
  data: PersonalMailAdminApi.PersonalMailReplyDto,
) {
  return requestClient.post<PersonalMailAdminApi.MailReplyResult>(
    `${API_PREFIX}/ReplyAsync`,
    data,
    mailRequest,
  );
}

export function forwardPersonalMail(
  data: PersonalMailAdminApi.PersonalMailForwardDto,
) {
  return requestClient.post<PersonalMailAdminApi.MailSendResult>(
    `${API_PREFIX}/ForwardAsync`,
    data,
    mailRequest,
  );
}

export function savePersonalMailDraft(
  data: PersonalMailAdminApi.PersonalMailSendDto,
) {
  return requestClient.post<PersonalMailAdminApi.MailDraftSaveResult>(
    `${API_PREFIX}/SaveDraftAsync`,
    data,
    mailRequest,
  );
}

export function setPersonalMailRead(
  data: PersonalMailAdminApi.PersonalMailSetReadDto,
) {
  return requestClient.post(`${API_PREFIX}/SetReadAsync`, data, mailRequest);
}

export function movePersonalMail(
  data: PersonalMailAdminApi.PersonalMailMoveDto,
) {
  return requestClient.post(`${API_PREFIX}/MoveAsync`, data, mailRequest);
}

export function deletePersonalMail(
  data: PersonalMailAdminApi.PersonalMailDeleteDto,
) {
  return requestClient.post(`${API_PREFIX}/DeleteAsync`, data, mailRequest);
}

export async function readRequestErrorMessage(error: unknown) {
  const responseData = (error as { response?: { data?: unknown } })?.response
    ?.data;
  if (responseData instanceof Blob) {
    try {
      const text = await responseData.text();
      const json = JSON.parse(text) as { error?: { message?: string } };
      return json.error?.message || '';
    } catch {
      return '';
    }
  }
  const data = responseData as { error?: { message?: string } } | undefined;
  return data?.error?.message || '';
}
