import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace InvoiceIssueApi {
  /** 发票开出方式枚举 */
  export enum InvoiceIssueType {
    /** 诺诺接口开票 */
    NuonuoInterface = 0,
    /** 手动记录 */
    ManualRecord = 1,
  }

  /** 结算对象简易信息 */
  export interface ClientSimpleDto {
    id: string;
    name: string;
    [key: string]: any;
  }

  /** 币别简易信息 */
  export interface CurrencySimpleDto {
    id: number;
    code: string;
    name: string;
    [key: string]: any;
  }

  /** 客户银行简易信息 */
  export interface ClientInvoiceBankSimpleDto {
    id: string;
    bankName: string;
    accountNumber: string;
    [key: string]: any;
  }

  /** 我司银行简易信息 */
  export interface OrgBankAccountSimpleDto {
    id: string;
    bankName: string;
    accountNumber: string;
    [key: string]: any;
  }

  /** 发票商品编码简易信息 */
  export interface CodeInvoiceSimpleDto {
    id: number;
    code: string;
    name: string;
    taxRate: number;
    specification?: string;
    unit?: string;
    taxClassificationCode?: string;
    taxClassificationName?: string;
    [key: string]: any;
  }

  /** 开票申请简易信息 */
  export interface InvoiceApplicationSimpleDto {
    id: string;
    applicationNo: string;
    invoiceNo?: string;
    settlementId: string;
    status: string;
    invoiceType: string;
    currencyId: number;
    orgBankAccountId: string;
    applyTime: string;
    [key: string]: any;
  }

  /** 发票开出明细输入DTO */
  export interface InvoiceIssueItemInputDto {
    /** 开票申请ID */
    invoiceApplicationId: string;
    /** 备注 */
    remark?: string;
  }

  /** 发票开出商品明细输入DTO */
  export interface InvoiceIssueGoodsDtlInputDto {
    /** 发票商品编码ID */
    codeInvoiceId: number;
    /** 规格型号 */
    specification?: string;
    /** 发票单位 */
    unit?: string;
    /** 数量 */
    quantity: number;
    /** 含税单价 */
    unitPrice: number;
    /** 金额 */
    amount: number;
    /** 不含税金额 */
    noTaxAmount: number;
    /** 税率(%) */
    taxRate: number;
    /** 税额 */
    taxAmount: number;
    /** 备注 */
    remark?: string;
  }

  /** 新增发票开出DTO */
  export interface InvoiceIssueAddDto {
    /** 发票开出方式 */
    invoiceIssueType: InvoiceIssueType;
    /** 发票号 */
    invoiceNo?: string;
    /** 开票时间 */
    invoiceIssueTime: string;
    /** 开票要求 */
    require?: string;
    /** 备注 */
    remark?: string;
    /** 合并的开票申请（至少一条） */
    invoiceIssueItems: InvoiceIssueItemInputDto[];
    /** 发票开出商品明细（至少一条） */
    invoiceIssueGoodsDtls: InvoiceIssueGoodsDtlInputDto[];
  }

  /** 修改发票开出DTO */
  export interface InvoiceIssueEditDto extends InvoiceIssueAddDto {
    /** 发票开出ID */
    id: string;
  }

  /** 删除发票开出DTO */
  export interface InvoiceIssueDeleteDto {
    /** 发票开出ID */
    id: string;
  }

  /** 发票开出明细DTO */
  export interface InvoiceIssueItemDto {
    id: string;
    invoiceIssueId: string;
    invoiceApplicationId: string;
    remark?: string;
    invoiceApplication: InvoiceApplicationSimpleDto;
  }

  /** 发票开出商品明细DTO */
  export interface InvoiceIssueGoodsDtlDto {
    id: string;
    invoiceIssueId: string;
    codeInvoiceId: number;
    specification?: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    noTaxAmount: number;
    taxRate: number;
    taxAmount: number;
    remark?: string;
    codeInvoice: CodeInvoiceSimpleDto;
  }

  /** 发票开出详情DTO */
  export interface InvoiceIssueDetailDto {
    /** 主键ID */
    id: string;
    /** 所属公司ID */
    companyId: number;
    /** 发票开出方式 */
    invoiceIssueType: InvoiceIssueType;
    /** 开出单号 */
    applicationNo: string;
    /** 发票号 */
    invoiceNo?: string;
    /** 开票时间 */
    invoiceIssueTime: string;
    /** 结算对象ID */
    settlementId: string;
    /** 发票类型 */
    invoiceType: string;
    /** 币别ID */
    currencyId: number;
    /** 客户银行ID */
    clientInvoiceBankId: string;
    /** 我司银行ID */
    orgBankAccountId: string;
    /** 申请人ID */
    applyUserId: number;
    /** 申请时间 */
    applyTime: string;
    /** 开票要求 */
    require?: string;
    /** 备注 */
    remark?: string;
    /** 创建人名称 */
    creatorUserName: string;
    /** 申请人名称 */
    applyUserName: string;
    /** 所属公司名称 */
    companyName: string;
    /** 结算对象简易信息 */
    settlement: ClientSimpleDto;
    /** 币别简易信息 */
    currency: CurrencySimpleDto;
    /** 客户银行简易信息 */
    clientInvoiceBank: ClientInvoiceBankSimpleDto;
    /** 我司银行简易信息 */
    orgBankAccount: OrgBankAccountSimpleDto;
    /** 发票汇率 */
    invoiceExchangeRate?: number;
    /** 关联开票申请明细 */
    invoiceIssueItems: InvoiceIssueItemDto[];
    /** 发票开出商品明细 */
    invoiceIssueGoodsDtls: InvoiceIssueGoodsDtlDto[];
  }

  /** 发票开出列表项DTO */
  export interface InvoiceIssueListDto {
    id: string;
    companyId: number;
    invoiceIssueType: InvoiceIssueType;
    applicationNo: string;
    invoiceNo?: string;
    invoiceIssueTime: string;
    settlementId: string;
    invoiceType: string;
    currencyId: number;
    clientInvoiceBankId: string;
    orgBankAccountId: string;
    applyUserId: number;
    applyTime: string;
    require?: string;
    remark?: string;
    creatorUserName: string;
    applyUserName: string;
    companyName: string;
    settlement: ClientSimpleDto;
    currency: CurrencySimpleDto;
    clientInvoiceBank: ClientInvoiceBankSimpleDto;
    orgBankAccount: OrgBankAccountSimpleDto;
    invoiceExchangeRate?: number;
    /** 关联开票申请条数 */
    itemCount: number;
    /** 商品明细金额合计 */
    totalAmount: number;
  }

  /** 分页列表响应 */
  export interface PagedList<T> {
    items: T[];
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }

  /** 发票开出查询参数 */
  export interface InvoiceIssueQueryDto {
    /** 开出单号（模糊） */
    applicationNo?: string;
    /** 发票号（模糊） */
    invoiceNo?: string;
    /** 结算对象ID */
    settlementId?: string;
    /** 币别ID */
    currencyId?: number;
    /** 发票开出方式 */
    invoiceIssueType?: InvoiceIssueType;
    /** 发票类型 */
    invoiceType?: string;
    /** 开票时间起 */
    invoiceIssueTimeStart?: string;
    /** 开票时间止 */
    invoiceIssueTimeEnd?: string;
    /** 创建人ID */
    creatorUserId?: number;
    /** 组织ID（通过UserId查询） */
    orgId?: number;
    /** 当前页码（从1开始） */
    pageIndex: number;
    /** 每页条数 */
    pageSize: number;
    /** 排序字段（默认 CreationTime DESC） */
    sorting?: string;
  }
}

/**
 * 新增发票开出
 * @param data 发票开出数据
 */
async function addInvoiceIssue(data: InvoiceIssueApi.InvoiceIssueAddDto) {
  return requestClient.post<string>(
    '/services/app/InvoiceIssueAdmin/AddAsync',
    data,
  );
}

/**
 * 修改发票开出
 * @param data 发票开出数据
 */
async function editInvoiceIssue(data: InvoiceIssueApi.InvoiceIssueEditDto) {
  return requestClient.put<boolean>(
    '/services/app/InvoiceIssueAdmin/EditAsync',
    data,
  );
}

/**
 * 删除发票开出
 * @param id 发票开出ID
 */
async function deleteInvoiceIssue(id: string) {
  return requestClient.delete<boolean>(
    '/services/app/InvoiceIssueAdmin/DeleteAsync',
    { params: { id } },
  );
}

/**
 * 获取发票开出详情
 * @param id 发票开出ID
 */
async function getInvoiceIssueDetail(id: string) {
  return requestClient.get<InvoiceIssueApi.InvoiceIssueDetailDto>(
    '/services/app/InvoiceIssueAdmin/DetailAsync',
    { params: { id } },
  );
}

/**
 * 获取发票开出发票分页列表
 * @param params 查询参数
 */
async function getInvoiceIssuePagedList(params: Recordable<any>): Promise<{
  items: InvoiceIssueApi.InvoiceIssueListDto[];
  totalCount: number;
}> {
  const queryParams: InvoiceIssueApi.InvoiceIssueQueryDto = {
    applicationNo: params.applicationNo,
    invoiceNo: params.invoiceNo,
    settlementId: params.settlementId,
    currencyId: params.currencyId,
    invoiceIssueType: params.invoiceIssueType,
    invoiceType: params.invoiceType,
    invoiceIssueTimeStart: params.invoiceIssueTimeStart,
    invoiceIssueTimeEnd: params.invoiceIssueTimeEnd,
    creatorUserId: params.creatorUserId,
    orgId: params.orgId,
    pageIndex: params.pageIndex || params.page || 1,
    pageSize: params.pageSize || 10,
    sorting: params.sorting || 'CreationTime DESC',
  };

  const response = await requestClient.get<
    InvoiceIssueApi.PagedList<InvoiceIssueApi.InvoiceIssueListDto>
  >('/services/app/InvoiceIssueAdmin/GetPagedListAsync', {
    params: queryParams,
  });

  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

export {
  addInvoiceIssue,
  deleteInvoiceIssue,
  editInvoiceIssue,
  getInvoiceIssueDetail,
  getInvoiceIssuePagedList,
};
