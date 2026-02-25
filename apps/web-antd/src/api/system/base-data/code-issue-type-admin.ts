import { requestClient } from '#/api/request';

export namespace CodeIssueTypeAdminApi {
  /** 新增签单方式参数 */
  export interface CodeIssueTypeAddDto {
    billType?: string;
    enName?: string;
    noBill?: string;
    copyNoBill?: string;
    ediCode?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑签单方式参数 */
  export interface CodeIssueTypeEditDto {
    id: number;
    billType?: string;
    enName?: string;
    noBill?: string;
    copyNoBill?: string;
    ediCode?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 签单方式详情 */
  export interface CodeIssueTypeDto {
    id: number;
    billType?: string;
    enName?: string;
    noBill?: string;
    copyNoBill?: string;
    ediCode?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfCodeIssueTypeDto {
    items: CodeIssueTypeDto[];
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

const API_PREFIX = '/services/app/CodeIssueTypeAdmin';

/**
 * 获取签单方式分页列表
 */
export const getCodeIssueTypePagedList = (
  params: CodeIssueTypeAdminApi.GetPagedListParams,
) => {
  return requestClient.get<CodeIssueTypeAdminApi.PagedListOfCodeIssueTypeDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取签单方式详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getCodeIssueTypeDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<CodeIssueTypeAdminApi.CodeIssueTypeDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增签单方式
 */
export const addCodeIssueType = (
  data: CodeIssueTypeAdminApi.CodeIssueTypeAddDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑签单方式
 */
export const editCodeIssueType = (
  data: CodeIssueTypeAdminApi.CodeIssueTypeEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除签单方式
 */
export const deleteCodeIssueType = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
