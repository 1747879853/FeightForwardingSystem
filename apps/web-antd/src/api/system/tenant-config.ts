import { requestClient } from '#/api/request';

export namespace TenantConfigApi {
  /** 租户配置项（列表/详情出参） */
  export interface TenantConfigDto {
    /** 自增主键，业务定位用 name，仅供对账 */
    id?: number | string;
    /** 配置名 */
    name?: string;
    /** 配置值（字符串，布尔型配置约定用 'true' / 'false'） */
    value?: null | string;
    creationTime?: string;
    creatorUserId?: null | number | string;
    creatorUserName?: null | string;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number | string;
    lastModifierUserName?: null | string;
  }

  export interface TenantConfigAddDto {
    name: string;
    value?: null | string;
  }

  export interface TenantConfigEditDto {
    name: string;
    value?: null | string;
  }

  export interface TenantConfigDeleteDto {
    /** 单条删除 */
    name?: string;
    /** 批量删除；只要传了非空 names 就忽略 name */
    names?: string[];
  }

  export interface GetPagedListParams {
    pageIndex?: number;
    pageSize?: number;
    keyword?: string;
    sorting?: string;
  }

  export interface PagedListOfTenantConfigDto {
    items?: TenantConfigDto[];
    totalCount?: number;
    skipCount?: number;
    maxResultCount?: number;
    currentPage?: number;
    totalPages?: number;
  }
}

const API_PREFIX = '/services/app/TenantConfig';

/**
 * 按配置名取当前租户配置，没配过返回 null。
 * 宿主用户（没有租户）不受租户配置约束，同样按 null 处理。
 */
export const getTenantConfigDetail = (name: string) => {
  return requestClient.get<null | TenantConfigApi.TenantConfigDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { name }, skipErrorMessage: true },
  );
};

/**
 * 租户配置分页列表。排序由后端固定为配置名升序，系统预定义设置不会出现。
 */
export const getTenantConfigPagedList = (
  params: TenantConfigApi.GetPagedListParams,
) => {
  return requestClient.get<TenantConfigApi.PagedListOfTenantConfigDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 新增租户配置。重名报错，不会覆盖。
 */
export const addTenantConfig = (data: TenantConfigApi.TenantConfigAddDto) => {
  return requestClient.post<number | string>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 按配置名更新 Value。配置名不存在时报错，不会自动新增。
 */
export const editTenantConfig = (data: TenantConfigApi.TenantConfigEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 按配置名物理删除，支持单条或批量（全有或全无）。
 */
export const deleteTenantConfig = (
  data: TenantConfigApi.TenantConfigDeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, { data });
};
