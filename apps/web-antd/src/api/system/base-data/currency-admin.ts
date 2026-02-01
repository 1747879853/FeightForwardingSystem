import { requestClient } from '#/api/request';

export namespace CurrencyAdminApi {
  /** 新增币别参数 */
  export interface CurrencyAddDto {
    code?: string;
    cnName?: string;
    enName?: string;
    description?: string;
    financeSoftCode?: string;
    defaultRate?: number;
    alias?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑币别参数 */
  export interface CurrencyEditDto {
    id: number;
    code?: string;
    cnName?: string;
    enName?: string;
    description?: string;
    financeSoftCode?: string;
    defaultRate?: number;
    alias?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 币别详情 */
  export interface CurrencyDto {
    id: number;
    code?: string;
    cnName?: string;
    enName?: string;
    description?: string;
    financeSoftCode?: string;
    defaultRate?: number;
    alias?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfCurrencyDto {
    items: CurrencyDto[];
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

const API_PREFIX = '/services/app/CurrencyAdmin';

/**
 * 获取币别分页列表
 */
export const getCurrencyPagedList = (
  params: CurrencyAdminApi.GetPagedListParams,
) => {
  return requestClient.get<CurrencyAdminApi.PagedListOfCurrencyDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取币别详情
 */
export const getCurrencyDetail = (id: number) => {
  return requestClient.get<CurrencyAdminApi.CurrencyDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

/**
 * 新增币别
 */
export const addCurrency = (data: CurrencyAdminApi.CurrencyAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑币别
 */
export const editCurrency = (data: CurrencyAdminApi.CurrencyEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除币别
 */
export const deleteCurrency = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
