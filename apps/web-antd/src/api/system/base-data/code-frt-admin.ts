import { requestClient } from '#/api/request';

export namespace CodeFrtAdminApi {
  /** 新增付费方式参数 */
  export interface CodeFrtAddDto {
    cnName?: string;
    enName?: string;
    ediCode?: string;
    airShowName?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑付费方式参数 */
  export interface CodeFrtEditDto {
    id: number;
    cnName?: string;
    enName?: string;
    ediCode?: string;
    airShowName?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 付费方式详情 */
  export interface CodeFrtDto {
    id: number;
    cnName?: string;
    enName?: string;
    ediCode?: string;
    airShowName?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfCodeFrtDto {
    items: CodeFrtDto[];
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

const API_PREFIX = '/services/app/CodeFrtAdmin';

/**
 * 获取付费方式分页列表
 */
export const getCodeFrtPagedList = (
  params: CodeFrtAdminApi.GetPagedListParams,
) => {
  return requestClient.get<CodeFrtAdminApi.PagedListOfCodeFrtDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取付费方式详情
 */
export const getCodeFrtDetail = (id: number) => {
  return requestClient.get<CodeFrtAdminApi.CodeFrtDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

/**
 * 新增付费方式
 */
export const addCodeFrt = (data: CodeFrtAdminApi.CodeFrtAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑付费方式
 */
export const editCodeFrt = (data: CodeFrtAdminApi.CodeFrtEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除付费方式
 */
export const deleteCodeFrt = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
