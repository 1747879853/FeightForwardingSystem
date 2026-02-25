import { requestClient } from '#/api/request';

export namespace CodeSourceAdminApi {
  /** 新增业务来源参数 */
  export interface CodeSourceAddDto {
    code?: string;
    cnName?: string;
    enName?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑业务来源参数 */
  export interface CodeSourceEditDto {
    id: number;
    code?: string;
    cnName?: string;
    enName?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 业务来源详情 */
  export interface CodeSourceDto {
    id: number;
    code?: string;
    cnName?: string;
    enName?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfCodeSourceDto {
    items: CodeSourceDto[];
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

const API_PREFIX = '/services/app/CodeSourceAdmin';

/**
 * 获取业务来源分页列表
 */
export const getCodeSourcePagedList = (
  params: CodeSourceAdminApi.GetPagedListParams,
) => {
  return requestClient.get<CodeSourceAdminApi.PagedListOfCodeSourceDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取业务来源详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getCodeSourceDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<CodeSourceAdminApi.CodeSourceDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增业务来源
 */
export const addCodeSource = (data: CodeSourceAdminApi.CodeSourceAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑业务来源
 */
export const editCodeSource = (data: CodeSourceAdminApi.CodeSourceEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除业务来源
 */
export const deleteCodeSource = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
