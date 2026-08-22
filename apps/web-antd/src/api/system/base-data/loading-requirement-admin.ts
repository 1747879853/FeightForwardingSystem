import { requestClient } from '#/api/request';

export namespace LoadingRequirementAdminApi {
  /** 新增监装要求明细参数；sortId 由后端按数组顺序生成，前端不传 */
  export interface LoadingRequirementItemAddDto {
    name?: string;
    remark?: null | string;
  }

  /** 编辑监装要求明细参数；id 为 null 表示新增该行 */
  export interface LoadingRequirementItemEditDto extends LoadingRequirementItemAddDto {
    id?: null | string;
  }

  /** 监装要求明细 */
  export interface LoadingRequirementItemDto {
    id: string;
    loadingRequirementId?: string;
    name?: string;
    sortId?: number;
    remark?: null | string;
    creationTime?: string;
    creatorUserId?: null | number;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number;
  }

  /** 新增监装要求参数 */
  export interface LoadingRequirementAddDto {
    name?: string;
    /** 主表排序由前端输入，列表默认按其升序 */
    sortId?: number;
    remark?: string;
    loadingRequirementItems?: LoadingRequirementItemAddDto[];
  }

  /** 编辑监装要求参数 */
  export interface LoadingRequirementEditDto {
    id: string;
    name?: string;
    sortId?: number;
    remark?: string;
    /** 全量提交：漏传的明细会被后端删除 */
    loadingRequirementItems?: LoadingRequirementItemEditDto[];
  }

  /** 监装要求详情（列表项与详情共用） */
  export interface LoadingRequirementDto {
    id: string;
    name?: string;
    sortId?: number;
    remark?: null | string;
    creationTime?: string;
    creatorUserId?: null | number;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number;
    creatorUserName?: null | string;
    lastModifierUserName?: null | string;
    /** 按 sortId 升序返回，无数据为 [] */
    loadingRequirementItems?: LoadingRequirementItemDto[] | null;
  }

  /** 分页列表响应 */
  export interface PagedListOfLoadingRequirementDto {
    items: LoadingRequirementDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    Keyword?: string;
    /** 后端默认 SortId ASC，与其它基础资料的 CreationTime DESC 不同 */
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/LoadingRequirementAdmin';

/** 获取监装要求分页列表（默认排序 SortId ASC，已带全部明细） */
export const getLoadingRequirementPagedList = (
  params: LoadingRequirementAdminApi.GetPagedListParams,
) => {
  return requestClient.get<LoadingRequirementAdminApi.PagedListOfLoadingRequirementDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/** 获取监装要求详情 */
export const getLoadingRequirementDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<LoadingRequirementAdminApi.LoadingRequirementDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { id: idStr } },
  );
};

/** 新增监装要求 */
export const addLoadingRequirement = (
  data: LoadingRequirementAdminApi.LoadingRequirementAddDto,
) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

/** 编辑监装要求 */
export const editLoadingRequirement = (
  data: LoadingRequirementAdminApi.LoadingRequirementEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/** 删除监装要求（同步删除其下全部明细） */
export const deleteLoadingRequirement = (id: number | string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id: String(id) },
  });
};
