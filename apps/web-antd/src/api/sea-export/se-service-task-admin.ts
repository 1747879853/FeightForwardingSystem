import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { requestClient } from '#/api/request';

export namespace SeServiceTaskAdminApi {
  export interface SeServiceShowDto {
    id?: string;
    seaExportPropEnum: number;
  }

  export interface PortCodeDto {
    id?: number | string;
    portName?: string | null;
    cnName?: string | null;
    countryName?: string | null;
  }

  export interface SeServiceTaskUserDto {
    id?: string;
    seServiceTaskId?: string;
    userId: number;
    userNickName?: string | null;
    completionTime?: string | null;
  }

  export interface SeServiceTaskWorkbenchCountItemDto {
    serviceType?: number | null;
    count: number;
  }

  export interface SeServiceTaskWorkbenchCountGroupDto {
    /** 起运港 ID，大整数以字符串存储避免精度丢失 */
    polId: string;
    pol?: PortCodeDto | null;
    totalCount: number;
    serviceItems?: SeServiceTaskWorkbenchCountItemDto[] | null;
  }

  export interface SeServiceTaskWorkbenchCountResultDto {
    items?: SeServiceTaskWorkbenchCountGroupDto[] | null;
  }

  export interface SeServiceTaskWorkbenchItemDto {
    id: string;
    seaExportId: string;
    seServiceConfigItemId?: string;
    serviceTaskStatus: number;
    completionUserId?: number | null;
    completionTime?: string | null;
    assigneeTime?: string | null;
    assigneeUserId?: number | null;
    /** 转交备注 */
    assigneeRemark?: string | null;
    sortId?: number;
    remark?: string | null;
    seaExport?: SeaExportAdminApi.SeaExportDto;
    seServiceTaskUsers?: SeServiceTaskUserDto[] | null;
    creationTime?: string;
    creatorUserId?: number;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
  }

  export interface PagedListOfSeServiceTaskWorkbenchItemDto {
    skipCount?: number;
    maxResultCount?: number;
    items?: SeServiceTaskWorkbenchItemDto[] | null;
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  export interface GetWorkbenchFilterParams {
    ServiceTaskStatus?: number;
    ETDStart?: string;
    ETDEnd?: string;
    ClientId?: string;
    CarrierId?: number;
    MblNum?: string;
    PODId?: number;
    Sorting?: string;
  }

  export interface GetWorkbenchCountParams extends GetWorkbenchFilterParams {}

  export interface GetWorkbenchPagedListParams extends GetWorkbenchFilterParams {
    POLId: number | string;
    ServiceType?: number;
    PageIndex?: number;
    PageSize?: number;
  }

  export interface TransferInput {
    ids: string[];
    assigneeUserId: number;
    /** 转交备注 */
    assigneeRemark: string;
  }

  export interface CompleteInput {
    id: string;
  }

  export interface CancelCompleteInput {
    id: string;
  }
}

const API_PREFIX = '/services/app/SeServiceTaskAdmin';

export const getSeServiceTaskWorkbenchCount = (
  params?: SeServiceTaskAdminApi.GetWorkbenchCountParams,
) => {
  return requestClient.get<SeServiceTaskAdminApi.SeServiceTaskWorkbenchCountResultDto>(
    `${API_PREFIX}/GetWorkbenchCountAsync`,
    params ? { params } : undefined,
  );
};

export const getSeServiceTaskWorkbenchPagedList = (
  params: SeServiceTaskAdminApi.GetWorkbenchPagedListParams,
) => {
  return requestClient.get<SeServiceTaskAdminApi.PagedListOfSeServiceTaskWorkbenchItemDto>(
    `${API_PREFIX}/GetWorkbenchPagedListAsync`,
    { params },
  );
};

export const transferSeServiceTask = (
  data: SeServiceTaskAdminApi.TransferInput,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/TransferAsync`, data);
};

export const completeSeServiceTask = (
  data: SeServiceTaskAdminApi.CompleteInput,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/CompleteAsync`, data);
};

export const cancelCompleteSeServiceTask = (
  data: SeServiceTaskAdminApi.CancelCompleteInput,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/CancelCompleteAsync`, data);
};
