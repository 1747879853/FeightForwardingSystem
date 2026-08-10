import type { ClientAdminApi } from '#/api/sea-export/client-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { requestClient } from '#/api/request';

export namespace SeaExportDispatchAdminApi {
  export interface DispatchCtnAddDto {
    ctnCodeId: number;
    ctnNo?: string;
    sealNo?: string;
    pkgs?: number;
    codePackageId?: number;
    grossWeight?: number;
    tareWeight?: number;
    overLength?: number;
    overWidth?: number;
    overHeight?: number;
    volume?: number;
    codeGoodsId?: number;
    bookingNo?: string;
    remark?: string;
  }

  export interface DispatchCtnEditDto extends DispatchCtnAddDto {
    id?: string;
  }

  export interface DispatchCtnDto extends DispatchCtnEditDto {
    seaExportDispatchId?: string;
    /** 箱型对象（替代 ctnCodeName） */
    ctnCode?: SeaExportAdminApi.CtnCodeSimpleDto | null;
    /** 包装对象（替代 codePackageName） */
    codePackage?: SeaExportAdminApi.CodePackageSimpleDto | null;
    /** 品名对象（替代 codeGoodsName / codeGoodsHSCode） */
    codeGoods?: SeaExportAdminApi.CodeGoodsSimpleDto | null;
  }

  export interface DispatchAddDto {
    seaExportId: string;
    teamId?: string;
    requiredTime?: string;
    dispatchTime?: string;
    factoryContact?: string;
    factoryTel?: string;
    yardId?: string;
    closingTime?: string;
    factoryId?: string;
    areaId?: string;
    address?: string;
    precautions?: string;
    sortId?: number;
    remark?: string;
    seaExportDispatchCtns?: DispatchCtnAddDto[];
  }

  export interface DispatchEditDto extends DispatchAddDto {
    id: string;
    seaExportDispatchCtns?: DispatchCtnEditDto[];
  }

  export interface DispatchDto {
    id: string;
    seaExportId: string;
    teamId?: string;
    /** 车队对象（替代 teamName） */
    team?: ClientAdminApi.ClientDto | null;
    requiredTime?: string;
    dispatchTime?: string;
    factoryContact?: string;
    factoryTel?: string;
    yardId?: string;
    /** 场站对象（替代 yardName） */
    yard?: ClientAdminApi.ClientDto | null;
    closingTime?: string;
    factoryId?: string;
    /** 工厂对象（替代 factoryName） */
    factory?: ClientAdminApi.ClientDto | null;
    areaId?: string;
    address?: string;
    precautions?: string;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    creatorUserId?: number;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    seaExportDispatchCtns?: DispatchCtnDto[];
  }

  export interface PagedListOfDispatchDto {
    items: DispatchDto[];
    totalCount: number;
  }

  export interface GetPagedListParams {
    seaExportId: string;
    keyword?: string;
    sorting?: string;
    skipCount?: number;
    maxResultCount?: number;
  }
}

const API_PREFIX = '/services/app/SeaExportDispatchAdmin';

export const getDispatchPagedList = (
  params: SeaExportDispatchAdminApi.GetPagedListParams,
) => {
  return requestClient.get<SeaExportDispatchAdminApi.PagedListOfDispatchDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

export const getDispatchDetail = (id: string) => {
  return requestClient.get<SeaExportDispatchAdminApi.DispatchDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { id } },
  );
};

export const addDispatch = (data: SeaExportDispatchAdminApi.DispatchAddDto) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

export const editDispatch = (
  data: SeaExportDispatchAdminApi.DispatchEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

export const deleteDispatch = (params: { id?: string; ids?: string[] }) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: params,
  });
};
