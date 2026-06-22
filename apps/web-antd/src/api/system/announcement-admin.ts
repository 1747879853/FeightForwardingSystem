import { requestClient } from '#/api/request';

export namespace AnnouncementAdminApi {
  export interface AttachmentItemForItemInputDto {
    attachmentId?: number;
    attachmentDtlTypeId?: number | null;
    clientVisible?: boolean;
    displayOrder?: number;
    itemId?: string | null;
    url?: string | null;
    id?: number | null;
  }

  export interface AttachmentItemDto {
    attachmentId?: number;
    itemId?: string | null;
    moduleTypeId?: string | null;
    attachmentDtlTypeId?: number | null;
    clientVisible?: boolean;
    isFirstShow?: boolean;
    displayOrder?: number;
    url?: string | null;
    friendlyFileName?: string | null;
    fileLength?: number | null;
    creationTime?: string | null;
    creatorUserId?: number | null;
    creatorUserNickName?: string | null;
    id?: number;
  }

  export interface OrganizationUnitDto {
    id?: number;
    displayName?: string | null;
    code?: string | null;
  }

  export interface AnnouncementAddDto {
    name?: string | null;
    text?: string | null;
    enable?: boolean;
    startTime?: string | null;
    endTime?: string | null;
    sortId?: number;
    remark?: string | null;
    organizationUnitIds?: number[] | null;
    attachments?: AttachmentItemForItemInputDto[] | null;
  }

  export interface AnnouncementEditDto {
    id: number;
    name?: string | null;
    text?: string | null;
    enable?: boolean;
    startTime?: string | null;
    endTime?: string | null;
    sortId?: number;
    remark?: string | null;
    organizationUnitIds?: number[] | null;
    attachments?: AttachmentItemForItemInputDto[] | null;
  }

  export interface AnnouncementDto {
    id: number;
    name?: string | null;
    text?: string | null;
    enable?: boolean;
    startTime?: string | null;
    endTime?: string | null;
    sortId?: number;
    remark?: string | null;
    organizationUnits?: OrganizationUnitDto[] | null;
    attachments?: AttachmentItemDto[] | null;
    creationTime?: string;
    creatorUserId?: number | null;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
  }

  export interface PagedListOfAnnouncementDto {
    items?: AnnouncementDto[] | null;
    totalCount?: number;
    currentPage?: number;
    totalPages?: number;
    skipCount?: number;
    maxResultCount?: number;
  }

  export interface GetPagedListParams {
    Keyword?: string;
    Name?: string;
    Text?: string;
    Enable?: boolean;
    Remark?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/AnnouncementAdmin';

export const getAnnouncementPagedList = (
  params: AnnouncementAdminApi.GetPagedListParams,
) => {
  return requestClient.get<AnnouncementAdminApi.PagedListOfAnnouncementDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

export const getAnnouncementDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<AnnouncementAdminApi.AnnouncementDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

export const addAnnouncement = (
  data: AnnouncementAdminApi.AnnouncementAddDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

export const editAnnouncement = (
  data: AnnouncementAdminApi.AnnouncementEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

export const deleteAnnouncement = (id: number | string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
