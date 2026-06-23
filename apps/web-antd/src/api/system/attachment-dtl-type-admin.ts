import { requestClient } from '#/api/request';

export namespace AttachmentDtlTypeAdminApi {
  export interface AttachmentDefaultModuleInputDto {
    moduleType: number;
  }

  export interface AttachmentDefaultModuleDto {
    id: number;
    moduleType: number;
  }

  export interface AttachmentDtlTypeAddDto {
    name?: string | null;
    attachmentDefaultModules?: AttachmentDefaultModuleInputDto[] | null;
  }

  export interface AttachmentDtlTypeEditDto {
    id: number;
    name?: string | null;
    attachmentDefaultModules?: AttachmentDefaultModuleInputDto[] | null;
  }

  export interface AttachmentDtlTypeDto {
    id: number;
    name?: string | null;
    creatorUserName?: string | null;
    creatorUserId?: number | null;
    creationTime?: string | null;
    attachmentDefaultModules?: AttachmentDefaultModuleDto[] | null;
  }

  export interface PagedListOfAttachmentDtlTypeDto {
    items: AttachmentDtlTypeDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  export interface GetPagedListParams {
    Keyword?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/AttachmentDtlTypeAdmin';

export const getAttachmentDtlTypePagedList = (
  params: AttachmentDtlTypeAdminApi.GetPagedListParams,
) => {
  return requestClient.get<AttachmentDtlTypeAdminApi.PagedListOfAttachmentDtlTypeDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

export const getAttachmentDtlTypeDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<AttachmentDtlTypeAdminApi.AttachmentDtlTypeDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

export const addAttachmentDtlType = (
  data: AttachmentDtlTypeAdminApi.AttachmentDtlTypeAddDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

export const editAttachmentDtlType = (
  data: AttachmentDtlTypeAdminApi.AttachmentDtlTypeEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

export const deleteAttachmentDtlType = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
