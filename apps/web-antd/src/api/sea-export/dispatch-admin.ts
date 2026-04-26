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
    ctnCodeName?: string;
    codePackageName?: string;
    codeGoodsName?: string;
    codeGoodsHSCode?: string;
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
    teamName?: string;
    requiredTime?: string;
    dispatchTime?: string;
    factoryContact?: string;
    factoryTel?: string;
    yardId?: string;
    yardName?: string;
    closingTime?: string;
    factoryId?: string;
    factoryName?: string;
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
