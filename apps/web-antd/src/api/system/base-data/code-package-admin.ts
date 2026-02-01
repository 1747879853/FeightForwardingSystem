import { requestClient } from '#/api/request';

export namespace CodePackageAdminApi {
  /** 新增包装类型参数 */
  export interface CodePackageAddDto {
    name?: string;
    description?: string;
    afrCode?: string;
    ediCode?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑包装类型参数 */
  export interface CodePackageEditDto {
    id: number;
    name?: string;
    description?: string;
    afrCode?: string;
    ediCode?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 包装类型详情 */
  export interface CodePackageDto {
    id: number;
    name?: string;
    description?: string;
    afrCode?: string;
    ediCode?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfCodePackageDto {
    items: CodePackageDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    Keyword?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/CodePackageAdmin';

/**
 * 获取包装类型分页列表
 */
export const getCodePackagePagedList = (
  params: CodePackageAdminApi.GetPagedListParams,
) => {
  return requestClient.get<CodePackageAdminApi.PagedListOfCodePackageDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取包装类型详情
 */
export const getCodePackageDetail = (id: number) => {
  return requestClient.get<CodePackageAdminApi.CodePackageDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

/**
 * 新增包装类型
 */
export const addCodePackage = (data: CodePackageAdminApi.CodePackageAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑包装类型
 */
export const editCodePackage = (
  data: CodePackageAdminApi.CodePackageEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除包装类型
 */
export const deleteCodePackage = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
