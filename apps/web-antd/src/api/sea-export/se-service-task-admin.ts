import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { requestClient } from '#/api/request';

export namespace SeServiceTaskAdminApi {
  export interface PortSimpleDto {
    id: number | string;
    portName?: string;
    cnName?: string;
  }

  export interface SeServiceShowDto {
    id?: string;
    seaExportPropEnum: number;
  }

  export interface SeServiceTaskUserDto {
    id?: string;
    seServiceTaskId?: string;
    userId: number;
    userNickName?: string;
    completionTime?: string | null;
  }

  export interface SeServiceTaskDto {
    id: string;
    seaExportId: string;
    seServiceConfigItemId?: string;
    serviceTaskStatus: number;
    completionUserId?: number | null;
    completionTime?: string | null;
    assigneeTime?: string | null;
    assigneeUserId?: number | null;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    creatorUserId?: number;
    lastModificationTime?: string | null;
    lastModifierUserId?: number | null;
    seaExport?: SeaExportAdminApi.SeaExportDto;
    seServiceTaskUsers?: SeServiceTaskUserDto[];
  }

  export interface SeServiceConfigItemTaskGroupDto {
    id?: string | null;
    seServiceConfigId: string;
    serviceType?: number | null;
    userAttribute?: number | null;
    autoComplete?: boolean | null;
    manualAllowed?: boolean | null;
    reminder?: boolean | null;
    sortId?: number | null;
    remark?: string | null;
    seServiceShows?: SeServiceShowDto[];
    seServiceTasks?: SeServiceTaskDto[];
  }

  export interface SeServiceTaskConfigGroupDto {
    seServiceConfigId: string;
    polId?: number | null;
    pol?: PortSimpleDto;
    taskCount: number;
    seServiceConfigItems?: SeServiceConfigItemTaskGroupDto[];
  }

  export interface PagedListOfSeServiceTaskConfigGroupDto {
    items: SeServiceTaskConfigGroupDto[];
    totalCount: number;
  }

  export interface GetSeServiceTaskPagedListParams {
    serviceTaskStatus?: number;
    etdStart?: string;
    etdEnd?: string;
    clientId?: string;
    carrierId?: number;
    mblNum?: string;
    podId?: number;
    isAssigned: boolean;
    sorting?: string;
  }

  export interface GetWorkbenchListParams {
    serviceTaskStatus?: number;
    etdStart?: string;
    etdEnd?: string;
    clientId?: string;
    carrierId?: number;
    mblNum?: string;
    podId?: number;
    sorting?: string;
  }

  export interface TransferInput {
    ids: string[];
    assigneeUserId: number;
  }

  export interface CompleteInput {
    id: string;
  }

  export interface CancelCompleteInput {
    id: string;
  }
}

const API_PREFIX = '/services/app/SeServiceTaskAdmin';

export const getSeServiceTaskPagedList = (
  params?: SeServiceTaskAdminApi.GetSeServiceTaskPagedListParams,
) => {
  return requestClient.get<SeServiceTaskAdminApi.PagedListOfSeServiceTaskConfigGroupDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    params ? { params } : undefined,
  );
};

export const getSeServiceTaskWorkbenchList = (
  params: SeServiceTaskAdminApi.GetWorkbenchListParams,
) => {
  return requestClient.get<SeServiceTaskAdminApi.PagedListOfSeServiceTaskConfigGroupDto>(
    `${API_PREFIX}/GetWorkbenchListAsync`,
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
