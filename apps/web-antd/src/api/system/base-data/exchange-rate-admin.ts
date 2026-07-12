import { requestClient } from '#/api/request';

export namespace ExchangeRateAdminApi {
  /** 新增汇率参数 */
  export interface ExchangeRateAddDto {
    /** 币别Id（大数经 json-bigint 解析为 string，需原样透传） */
    currencyId?: number | string;
    drValue?: number;
    crValue?: number;
    customValue?: number;
    calculateValue?: number;
    invoiceValue?: number;
    startDate?: string;
    endDate?: string;
    localCurrency?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑汇率参数 */
  export interface ExchangeRateEditDto {
    /** 汇率Id（大数经 json-bigint 解析为 string，需原样透传） */
    id: number | string;
    /** 币别Id（大数经 json-bigint 解析为 string，需原样透传） */
    currencyId?: number | string;
    drValue?: number;
    crValue?: number;
    customValue?: number;
    calculateValue?: number;
    invoiceValue?: number;
    startDate?: string;
    endDate?: string;
    localCurrency?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 汇率详情 */
  export interface ExchangeRateDto {
    /** 汇率Id（大数经 json-bigint 解析为 string） */
    id: number | string;
    currencyId?: number | string;
    currencyCode?: string;
    drValue?: number;
    crValue?: number;
    customValue?: number;
    calculateValue?: number;
    invoiceValue?: number;
    startDate?: string;
    endDate?: string;
    localCurrency?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfExchangeRateDto {
    items: ExchangeRateDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    Keyword?: string;
    CurrencyId?: number;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/ExchangeRateAdmin';

/**
 * 获取汇率分页列表
 */
export const getExchangeRatePagedList = (
  params: ExchangeRateAdminApi.GetPagedListParams,
) => {
  return requestClient.get<ExchangeRateAdminApi.PagedListOfExchangeRateDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取汇率详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getExchangeRateDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<ExchangeRateAdminApi.ExchangeRateDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增汇率
 */
export const addExchangeRate = (
  data: ExchangeRateAdminApi.ExchangeRateAddDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑汇率
 */
export const editExchangeRate = (
  data: ExchangeRateAdminApi.ExchangeRateEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除汇率
 * @param id 汇率 ID，大数以 string 透传避免精度丢失
 */
export const deleteExchangeRate = (id: number | string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
