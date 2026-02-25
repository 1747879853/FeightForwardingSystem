import { requestClient } from '#/api/request';

/** 零税率标识枚举 */
export enum ZeroTaxRateEnum {
  /** 非零税率 */
  NonZero = 0,
  /** 免税 */
  Exemption = 1,
  /** 不征税 */
  NotLevied = 2,
  /** 普通零税率 */
  Ordinary = 3,
  /** 出口退税 */
  ExportTaxRebate = 4,
}

export namespace CodeInvoiceAdminApi {
  /** 新增发票商品编码参数 */
  export interface CodeInvoiceAddDto {
    code?: string;
    name?: string;
    taxCategory?: string;
    taxRate?: number;
    zeroTaxRateEnum?: ZeroTaxRateEnum;
    taxClassificationCode?: string;
    taxClassificationName?: string;
    isIncludingTax?: boolean;
    hasPreferentialPolicy?: boolean;
    preferentialPolicyDescription?: string;
    isDefault?: boolean;
    defaultCurrency?: string;
    specification?: string;
    unit?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑发票商品编码参数 */
  export interface CodeInvoiceEditDto {
    id: number;
    code?: string;
    name?: string;
    taxCategory?: string;
    taxRate?: number;
    zeroTaxRateEnum?: ZeroTaxRateEnum;
    taxClassificationCode?: string;
    taxClassificationName?: string;
    isIncludingTax?: boolean;
    hasPreferentialPolicy?: boolean;
    preferentialPolicyDescription?: string;
    isDefault?: boolean;
    defaultCurrency?: string;
    specification?: string;
    unit?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 发票商品编码详情 */
  export interface CodeInvoiceDto {
    id: number;
    code?: string;
    name?: string;
    taxCategory?: string;
    taxRate?: number;
    zeroTaxRateEnum?: ZeroTaxRateEnum;
    taxClassificationCode?: string;
    taxClassificationName?: string;
    isIncludingTax?: boolean;
    hasPreferentialPolicy?: boolean;
    preferentialPolicyDescription?: string;
    isDefault?: boolean;
    defaultCurrency?: string;
    specification?: string;
    unit?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfCodeInvoiceDto {
    items: CodeInvoiceDto[];
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

const API_PREFIX = '/services/app/CodeInvoiceAdmin';

/**
 * 获取发票商品编码分页列表
 */
export const getCodeInvoicePagedList = (
  params: CodeInvoiceAdminApi.GetPagedListParams,
) => {
  return requestClient.get<CodeInvoiceAdminApi.PagedListOfCodeInvoiceDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取发票商品编码详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getCodeInvoiceDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<CodeInvoiceAdminApi.CodeInvoiceDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增发票商品编码
 */
export const addCodeInvoice = (data: CodeInvoiceAdminApi.CodeInvoiceAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑发票商品编码
 */
export const editCodeInvoice = (
  data: CodeInvoiceAdminApi.CodeInvoiceEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除发票商品编码
 */
export const deleteCodeInvoice = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
