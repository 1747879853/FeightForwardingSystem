import { requestClient } from '#/api/request';

export namespace CodePackageAdminApi {
  /** 新增明细包装参数；sortId 由后端按数组顺序生成，前端不传 */
  export interface CodePackageItemAddDto {
    name?: string;
    remark?: null | string;
  }

  /** 编辑明细包装参数；id 为 null 表示新增该行 */
  export interface CodePackageItemEditDto extends CodePackageItemAddDto {
    id?: null | string;
  }

  /** 明细包装 */
  export interface CodePackageItemDto {
    id: string;
    codePackageId?: number | string;
    name?: string;
    sortId?: number;
    remark?: null | string;
    creationTime?: string;
    creatorUserId?: null | number;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number;
  }

  /** 新增包装类型参数 */
  export interface CodePackageAddDto {
    name?: string;
    description?: string;
    afrCode?: string;
    ediCode?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    codePackageItems?: CodePackageItemAddDto[];
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
    /** 全量提交：漏传的明细会被后端删除 */
    codePackageItems?: CodePackageItemEditDto[];
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
    creatorUserName?: null | string;
    lastModifierUserName?: null | string;
    /** 按 sortId 升序返回，无数据为 [] */
    codePackageItems?: CodePackageItemDto[] | null;
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
 * @param id 建议传 string 避免大数精度丢失
 */
export const getCodePackageDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<CodePackageAdminApi.CodePackageDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
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
