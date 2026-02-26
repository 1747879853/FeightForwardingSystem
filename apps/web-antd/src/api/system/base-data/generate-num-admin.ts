import { requestClient } from '#/api/request';

/** 编号生成类型：0=AutoNum 1=Text 2=UserName 3=yyyyMMdd 4=yyMMdd */
export type GenerateEnum = 0 | 1 | 2 | 3 | 4;

export namespace GenerateNumAdminApi {
  /** 规则明细 - 新增 */
  export interface GenerateNumRuleAddDto {
    generateEnum?: GenerateEnum;
    text?: string;
    length?: number;
    sortId?: number;
  }

  /** 规则明细 - 编辑 */
  export interface GenerateNumRuleEditDto {
    id?: number;
    generateNumId?: number;
    generateEnum?: GenerateEnum;
    text?: string;
    length?: number;
    sortId?: number;
  }

  /** 规则明细 - 详情 */
  export interface GenerateNumRuleDto {
    id?: number;
    generateNumId?: number;
    generateEnum?: GenerateEnum;
    text?: string;
    length?: number;
    sortId?: number;
  }

  /** 新增编号生成参数 */
  export interface GenerateNumAddDto {
    name?: string;
    tableName?: string;
    userId?: number;
    generateNumRules?: GenerateNumRuleAddDto[];
  }

  /** 编辑编号生成参数 */
  export interface GenerateNumEditDto {
    id: number;
    name?: string;
    tableName?: string;
    userId?: number;
    generateNumRules?: GenerateNumRuleEditDto[];
  }

  /** 编号生成详情 */
  export interface GenerateNumDto {
    id: number;
    name?: string;
    tableName?: string;
    userId?: number;
    tenantId?: number;
    generateNumRules?: GenerateNumRuleDto[];
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfGenerateNumDto {
    items: GenerateNumDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    Name?: string;
    TableName?: string;
    UserId?: number;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/GenerateNumAdmin';

/**
 * 获取编号生成分页列表
 */
export const getGenerateNumPagedList = (
  params: GenerateNumAdminApi.GetPagedListParams,
) => {
  return requestClient.get<GenerateNumAdminApi.PagedListOfGenerateNumDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取编号生成详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getGenerateNumDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<GenerateNumAdminApi.GenerateNumDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增编号生成
 */
export const addGenerateNum = (data: GenerateNumAdminApi.GenerateNumAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑编号生成
 */
export const editGenerateNum = (
  data: GenerateNumAdminApi.GenerateNumEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除编号生成
 */
export const deleteGenerateNum = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
