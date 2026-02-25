import { requestClient } from '#/api/request';

export namespace CodeServiceAdminApi {
  /** 新增运输条款参数 */
  export interface CodeServiceAddDto {
    cnName?: string;
    enName?: string;
    ediCode?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑运输条款参数 */
  export interface CodeServiceEditDto {
    id: number;
    cnName?: string;
    enName?: string;
    ediCode?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 运输条款详情 */
  export interface CodeServiceDto {
    id: number;
    cnName?: string;
    enName?: string;
    ediCode?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfCodeServiceDto {
    items: CodeServiceDto[];
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

const API_PREFIX = '/services/app/CodeServiceAdmin';

/**
 * 获取运输条款分页列表
 */
export const getCodeServicePagedList = (
  params: CodeServiceAdminApi.GetPagedListParams,
) => {
  return requestClient.get<CodeServiceAdminApi.PagedListOfCodeServiceDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取运输条款详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getCodeServiceDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<CodeServiceAdminApi.CodeServiceDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增运输条款
 */
export const addCodeService = (data: CodeServiceAdminApi.CodeServiceAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑运输条款
 */
export const editCodeService = (
  data: CodeServiceAdminApi.CodeServiceEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除运输条款
 */
export const deleteCodeService = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
