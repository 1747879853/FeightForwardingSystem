import { requestClient } from '#/api/request';

export namespace FeeCodeAdminApi {
  /** 新增费用代码参数 */
  export interface FeeCodeAddDto {
    code?: string;
    cnName?: string;
    enName?: string;
    /** 币别Id（大数经 json-bigint 解析为 string，需原样透传） */
    currencyId?: number | string;
    defaultUnitName?: string;
    defaultDebitName?: string;
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
    goodName?: string;
    checkingType?: string;
    defaultCurrency?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑费用代码参数 */
  export interface FeeCodeEditDto {
    /** 费用代码Id（大数经 json-bigint 解析为 string，需原样透传） */
    id: number | string;
    code?: string;
    cnName?: string;
    enName?: string;
    /** 币别Id（大数经 json-bigint 解析为 string，需原样透传） */
    currencyId?: number | string;
    defaultUnitName?: string;
    defaultDebitName?: string;
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
    goodName?: string;
    checkingType?: string;
    defaultCurrency?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 费用代码详情 */
  export interface FeeCodeDto {
    /** 费用代码Id（大数经 json-bigint 解析为 string） */
    id: number | string;
    /** 费用代码 */
    code?: string;
    /** 中文名称 */
    cnName?: string;
    /** 英文名称 */
    enName?: string;
    /** 币别Id（大数经 json-bigint 解析为 string） */
    currencyId?: number | string;
    /** 默认币别代码 */
    defaultCurrency?: string;
    /** 默认计费标准代码 */
    defaultUnit?: string;
    /** 默认计费标准名称 */
    defaultUnitName?: string;
    /** 默认收费客户类型 */
    defaultDebit?: string;
    /** 默认收费客户类型名称（IndustryCategory 字母） */
    defaultDebitName?: string;
    /** 默认付费客户类型 */
    defaultCredit?: string;
    /** 默认付费客户类型名称（IndustryCategory 字母） */
    defaultCreditName?: string;
    /** 海运相关 */
    isSea?: boolean;
    /** 空运相关 */
    isAir?: boolean;
    /** 陆运相关 */
    isTrucking?: boolean;
    /** 是否陆运固定费用 */
    isTruckingFixed?: boolean;
    /** 仓储相关 */
    isWms?: boolean;
    /** 垫付 */
    isAdvancedPay?: boolean;
    /** 机密 */
    isConfidential?: boolean;
    /** 禁开发票 */
    isInvoiceProhibit?: boolean;
    /** 费用分组 */
    feeGroup?: string;
    /** FRT */
    feeFrt?: string;
    /** 发票名 */
    goodName?: string;
    /** 对账类型 */
    checkingType?: string;
    /** 默认税率 */
    taxRate?: number;
    /** 是否启用 */
    enable?: boolean;
    /** 排序 */
    sortId?: number;
    /** 备注 */
    remark?: string;
    /** 创建人Id */
    creatorUserId?: number | null;
    /** 创建人昵称 */
    creatorUserName?: string;
    /** 创建时间 */
    creationTime?: string;
    /** 最后修改人Id */
    lastModifierUserId?: number | null;
    /** 最后修改时间 */
    lastModificationTime?: string | null;
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

  // ==================== 以下为新接口定义（来自 FeeCode 控制器，非 Admin）====================

  /** 汇率简单DTO */
  export interface ExchangeRateSimpleDto {
    /** 汇率主键 */
    id: number | string;
    /** 应收汇率 */
    drValue?: number | null;
    /** 应付汇率 */
    crValue?: number | null;
  }

  /** 费用代码简单DTO（仅返回已启用的费用代码） */
  export interface FeeCodeSimpleDto {
    /** 主键ID */
    id: number | string;
    /** 费用代码 */
    code?: string;
    /** 中文名称 */
    cnName?: string;
    /** 英文名称 */
    enName?: string;
    /** 默认币别ID */
    currencyId?: number | string;
    /** 默认计费标准代码 */
    defaultUnit?: string;
    /** 默认计费标准名称 */
    defaultUnitName?: string;
    /** 默认收费客户类型 */
    defaultDebit?: string;
    /** 默认收费客户类型名称（IndustryCategory 字母） */
    defaultDebitName?: string;
    /** 默认付费客户类型 */
    defaultCredit?: string;
    /** 默认付费客户类型名称（IndustryCategory 字母） */
    defaultCreditName?: string;
    /** 是否机密 */
    isConfidential?: boolean;
    /** 禁开发票 */
    isInvoiceProhibit?: boolean;
    /** 费用默认税率 */
    taxRate?: number;
    /** 默认币别当前有效汇率；无匹配则为 null */
    exchangeRate?: ExchangeRateSimpleDto | null;
  }

  /** 获取费用代码列表查询参数（所有字段均为可选） */
  export interface FeeCodeListQueryDto {
    /** 海运相关；传 true/false 时精确匹配 */
    isSea?: boolean | null;
    /** 空运相关 */
    isAir?: boolean | null;
    /** 陆运相关 */
    isTrucking?: boolean | null;
    /** 是否陆运固定费用 */
    isTruckingFixed?: boolean | null;
    /** 仓储相关 */
    isWms?: boolean | null;
  }
}

const API_PREFIX = '/services/app/FeeCodeAdmin';
// FeeCode 控制器（非 Admin）的前缀
const FEE_CODE_API_PREFIX = '/services/app/FeeCode';

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
 * @param id 建议传 string 避免大数精度丢失
 */
export const getFeeCodeDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<FeeCodeAdminApi.FeeCodeDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
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
 * @param id 费用代码 ID，大数以 string 透传避免精度丢失
 */
export const deleteFeeCode = (id: number | string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};

// ==================== 以下为新接口方法（来自 FeeCode 控制器，非 Admin）====================

/**
 * 获取已启用费用代码全量列表（无需业务权限，仅需登录）
 *
 * 说明：
 * - 仅返回已启用的费用代码（Enable == true）
 * - 支持按业务线筛选：isSea / isAir / isTrucking / isTruckingFixed / isWms
 * - 排序：SortId 升序，再按 Code 升序
 * - 包含默认币别的当前有效汇率信息
 *
 * @param params 查询参数（所有字段均为可选，不传则不过滤该条件）
 * @returns 费用代码简单DTO列表
 */
export const getFeeCodeListAsync = (
  params?: FeeCodeAdminApi.FeeCodeListQueryDto,
) => {
  return requestClient.get<FeeCodeAdminApi.FeeCodeSimpleDto[]>(
    `${FEE_CODE_API_PREFIX}/GetListAsync`,
    { params },
  );
};
