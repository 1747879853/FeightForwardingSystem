import { requestClient } from '#/api/request';

export namespace SeServiceConfigAdminApi {
  export interface SeaExportPropRefDto {
    id?: string;
    seaExportPropEnum: number;
  }

  export interface SeServiceConfigItemAddDto {
    serviceType: number;
    userAttribute?: number;
    autoComplete?: boolean;
    manualAllowed?: boolean;
    reminder?: boolean;
    sortId?: number;
    remark?: string;
    seServiceShows?: SeaExportPropRefDto[];
    seServiceLocks?: SeaExportPropRefDto[];
    seServiceRequires?: SeaExportPropRefDto[];
  }

  export interface SeServiceConfigItemEditDto {
    id?: string;
    serviceType: number;
    userAttribute?: number;
    autoComplete?: boolean;
    manualAllowed?: boolean;
    reminder?: boolean;
    sortId?: number;
    remark?: string;
    seServiceShows?: SeaExportPropRefDto[];
    seServiceLocks?: SeaExportPropRefDto[];
    seServiceRequires?: SeaExportPropRefDto[];
  }

  export interface SeServiceConfigAddDto {
    polId: number | string;
    sortId?: number;
    remark?: string;
    seServiceConfigItems?: SeServiceConfigItemAddDto[];
  }

  export interface SeServiceConfigEditDto {
    id: string;
    polId: number | string;
    sortId?: number;
    remark?: string;
    seServiceConfigItems?: SeServiceConfigItemEditDto[];
  }

  export interface PortSimpleDto {
    id: number | string;
    portName?: string;
    cnName?: string;
  }

  export interface SeServiceConfigItemListDto {
    id: string;
    seServiceConfigId: string;
    serviceType: number;
    serviceTypeText?: string;
    serviceTypeName?: string;
    serviceTypeDisplayName?: string;
    userAttribute?: number;
    autoComplete?: boolean;
    manualAllowed?: boolean;
    reminder?: boolean;
    sortId?: number;
    remark?: string;
    polId: number | string;
    portName?: string;
    pol?: PortSimpleDto;
    creationTime?: string;
    creatorUserId?: number;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
  }

  export interface UserAttributeServiceTypesDto {
    userAttribute: number;
    serviceTypes: number[];
  }

  export interface SeServiceConfigItemDetailDto {
    id?: string;
    seServiceConfigId?: string;
    serviceType: number;
    userAttribute?: number;
    autoComplete?: boolean;
    manualAllowed?: boolean;
    reminder?: boolean;
    sortId?: number;
    remark?: string;
    seServiceShows?: SeaExportPropRefDto[];
    seServiceLocks?: SeaExportPropRefDto[];
    seServiceRequires?: SeaExportPropRefDto[];
  }

  export interface SeServiceConfigDetailDto {
    id: string;
    polId: number | string;
    pol?: PortSimpleDto;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    creatorUserId?: number;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
    seServiceConfigItems?: SeServiceConfigItemDetailDto[];
    userAttributeServiceTypes?: UserAttributeServiceTypesDto[];
  }

  export interface PagedListOfSeServiceConfigItemListDto {
    items: SeServiceConfigItemListDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  export interface GetPagedListParams {
    polId?: number | string;
    serviceType?: number;
    pageIndex?: number;
    pageSize?: number;
    sorting?: string;
  }

  export interface DeleteDto {
    id?: string;
    ids?: string[];
  }
}

const API_PREFIX = '/services/app/SeServiceConfigAdmin';

export const getSeServiceConfigPagedList = (
  params: SeServiceConfigAdminApi.GetPagedListParams,
) => {
  return requestClient.get<SeServiceConfigAdminApi.PagedListOfSeServiceConfigItemListDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

export const getSeServiceConfigDetail = (id: string) => {
  return requestClient.get<SeServiceConfigAdminApi.SeServiceConfigDetailDto>(
    `${API_PREFIX}/DetailAsync`,
    {
      params: { id },
    },
  );
};

export const addSeServiceConfig = (
  data: SeServiceConfigAdminApi.SeServiceConfigAddDto,
) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

export const editSeServiceConfig = (
  data: SeServiceConfigAdminApi.SeServiceConfigEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

export const deleteSeServiceConfig = (
  data: SeServiceConfigAdminApi.DeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, { data });
};
