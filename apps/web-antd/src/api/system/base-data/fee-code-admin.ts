import { requestClient } from '#/api/request';

export namespace FeeCodeAdminApi {
  /** 新增费用代码参数 */
  export interface FeeCodeAddDto {
    code?: string;
    cnName?: string;
    enName?: string;
    currencyId?: number;
    defaultUnit?: string;
    defaultUnitName?: string;
    defaultDebit?: string;
    defaultDebitName?: string;
    defaultCredit?: string;
    defaultCreditName?: string;
    isSea?: boolean;
    isAir?: boolean;
    isTrucking?: boolean;
    isTruckingFixed?: boolean;
    isWms?: boolean;
    isAdvancedPay?: boolean;
    isConfidential?: boolean;
    isInvoiceProhibit?: boolean;
    taxRate?: number;
    feeGroup?: string;
    feeFrt?: string;
    goodName?: string;
    checkingType?: string;
    defaultCurrency?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑费用代码参数 */
  export interface FeeCodeEditDto {
    id: number;
    code?: string;
    cnName?: string;
    enName?: string;
    currencyId?: number;
    defaultUnit?: string;
    defaultUnitName?: string;
    defaultDebit?: string;
    defaultDebitName?: string;
    defaultCredit?: string;
    defaultCreditName?: string;
    isSea?: boolean;
    isAir?: boolean;
    isTrucking?: boolean;
    isTruckingFixed?: boolean;
    isWms?: boolean;
    isAdvancedPay?: boolean;
    isConfidential?: boolean;
    isInvoiceProhibit?: boolean;
    taxRate?: number;
    feeGroup?: string;
    feeFrt?: string;
    goodName?: string;
    checkingType?: string;
    defaultCurrency?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 费用代码详情 */
  export interface FeeCodeDto {
    id: number;
    code?: string;
    cnName?: string;
    enName?: string;
    currencyId?: number;
    defaultUnit?: string;
    defaultUnitName?: string;
    defaultDebit?: string;
    defaultDebitName?: string;
    defaultCredit?: string;
    defaultCreditName?: string;
    isSea?: boolean;
    isAir?: boolean;
    isTrucking?: boolean;
    isTruckingFixed?: boolean;
    isWms?: boolean;
    isAdvancedPay?: boolean;
    isConfidential?: boolean;
    isInvoiceProhibit?: boolean;
    taxRate?: number;
    feeGroup?: string;
    feeFrt?: string;
    goodName?: string;
    checkingType?: string;
    defaultCurrency?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfFeeCodeDto {
    items: FeeCodeDto[];
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

const API_PREFIX = '/services/app/FeeCodeAdmin';

/**
 * 获取费用代码分页列表
 */
export const getFeeCodePagedList = (
  params: FeeCodeAdminApi.GetPagedListParams,
) => {
  return requestClient.get<FeeCodeAdminApi.PagedListOfFeeCodeDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取费用代码详情
 */
export const getFeeCodeDetail = (id: number) => {
  return requestClient.get<FeeCodeAdminApi.FeeCodeDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

/**
 * 新增费用代码
 */
export const addFeeCode = (data: FeeCodeAdminApi.FeeCodeAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑费用代码
 */
export const editFeeCode = (data: FeeCodeAdminApi.FeeCodeEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除费用代码
 */
export const deleteFeeCode = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
