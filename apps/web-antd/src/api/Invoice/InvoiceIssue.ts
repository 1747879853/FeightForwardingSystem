import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';
import type { ClientInvoiceInfoAdminApi } from '#/api/sea-export/clinet-invoice-admin';

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
    /** 归属组织id */
    orgId: number;
    /** 发票开出方式 */
    invoiceIssueType: InvoiceIssueType;
    /** 发票号 */
    invoiceNo?: string;
    /** 开票时间 */
    invoiceIssueTime: string;
    /** 开票汇率（外币转人民币的汇率） */
    invoiceExchangeRate?: number;
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

  /** 组织机构简易DTO（组织串 orgs 元素） */
  export interface OrganizationUnitSimpleDto {
    /** 组织id */
    id: number;
    /** 组织名 */
    name?: string;
    /** 本位币id，可空 */
    localCurrencyId?: null | number;
    /** 本位币编码，可空 */
    localCurrencyCode?: null | string;
  }

  /** 发票开出详情DTO */
  export interface InvoiceIssueDetailDto {
    /** 主键ID */
    id: string;
    /** 归属组织id */
    orgId: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
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
    /** 客户开票信息（根据ClientInvoiceBankId解析，无则null） */
    clientInvoiceInfo?: ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto | null;
    /** 我司银行简易信息 */
    orgBankAccount: OrgBankAccountSimpleDto;
    /** 发票汇率 */
    invoiceExchangeRate?: number;
    /** 关联开票申请明细 */
    invoiceIssueItems: InvoiceIssueItemDto[];
    /** 发票开出商品明细 */
    invoiceIssueGoodsDtls: InvoiceIssueGoodsDtlDto[];
    /** ✅ 对应的开票申请列表（字段与 GetSubmittedApplicationListAsync 出参完全相同） */
    invoiceIssueApplications?: InvoiceIssueApplicationDto[] | null;
  }

  /** 发票开出列表项DTO */
  export interface InvoiceIssueListDto {
    id: string;
    /** 归属组织id */
    orgId: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
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
    /** 客户开票信息（根据ClientInvoiceBankId解析，无则null） */
    clientInvoiceInfo?: ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto | null;
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
    keyword?: string;
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
    remark?: string;
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

  /** 仅编辑主表DTO */
  export interface InvoiceIssueEditMainDto {
    /** 发票开出ID */
    id: string;
    /** 归属组织id */
    orgId: number;
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
  }

  /** 新增多条开票申请DTO */
  export interface InvoiceIssueAddApplicationsDto {
    /** 发票开出ID */
    id: string;
    /** 新增的开票申请明细（至少一条） */
    invoiceIssueItems: InvoiceIssueItemInputDto[];
    /** 合并后全部申请对应的完整商品明细 */
    invoiceIssueGoodsDtls: InvoiceIssueGoodsDtlInputDto[];
  }

  /** 移除多条开票申请DTO */
  export interface InvoiceIssueRemoveApplicationsDto {
    /** 发票开出ID */
    id: string;
    /** 要移除的开票申请ID列表（至少一条） */
    invoiceApplicationIds: string[];
    /** 剩余申请对应的完整商品明细 */
    invoiceIssueGoodsDtls: InvoiceIssueGoodsDtlInputDto[];
  }

  /** 运输订单简易信息 */
  export interface TransportOrderSimpleDto {
    id: string;
    commissionNum?: string;
    mblNum?: string;
    bookingNum?: string;
    clientName?: string;
    etd?: string;
    [key: string]: any;
  }

  /** 海运出口简易信息 */
  export interface SeaExportSimpleDto {
    id: string;
    vessel?: string;
    innerVoyno?: string;
    polId?: number;
    /** 起运港（简易对象，无则为 null） */
    pol?: {
      id: number;
      portName?: string;
      cnName?: string;
    } | null;
    podId?: number;
    /** 目的港（简易对象，无则为 null） */
    pod?: {
      id: number;
      portName?: string;
      cnName?: string;
    } | null;
    carrierId?: number;
    /** 船公司（简易对象，无则为 null） */
    carrier?: {
      id: number;
      cnName?: string;
      cnShortName?: string;
      enName?: string;
      /** 英文简称 */
      code?: string;
      ediCode?: string;
    } | null;
    [key: string]: any;
  }

  /** 订单费用信息（扩展版，包含SeaExport） */
  export interface OrderFeeDto {
    id: string;
    feeCodeName?: string;
    currencyId: number;
    currencyCode?: string;
    amount: number;
    invoicedAmount: number;
    remainingInvoiceAmount: number;
    settlementName?: string;
    settlementId: string;
    feeStatus: number;
    paySide: number;
    taxRate?: number;
    creatorUserId?: number;
    accountDate?: string;
    /** 对应的运输订单 */
    transportOrder?: TransportOrderSimpleDto;
    /** 对应的海运出口信息（仅本接口会赋值） */
    seaExport?: SeaExportSimpleDto;
    [key: string]: any;
  }

  /** 开票申请费用明细详情DTO（用于发票开出列表） */
  export interface InvoiceApplicationItemDetailDto {
    id: string;
    invoiceApplicationId: string;
    orderFeeId: string;
    appliedAmount: number;
    remark?: string;
    /** 费用详情（含transportOrder和seaExport） */
    orderFee: OrderFeeDto;
    remainingInvoiceAmount: number;
  }

  /** 开票申请商品明细DTO */
  export interface InvoiceApplicationGoodsDtlDto {
    id: string;
    invoiceApplicationId: string;
    codeInvoiceId: number;
    codeInvoiceName?: string;
    specification?: string;
    unit?: string;
    quantity: number;
    unitPrice: number;
    amount: number;
    noTaxAmount: number;
    taxRate: number;
    taxAmount: number;
    remark?: string;
  }

  /** 发票开出用-已提交开票申请DTO */
  export interface InvoiceIssueApplicationDto {
    /** 开票申请ID */
    id: string;
    /** 申请单号 */
    applicationNo?: string;
    /** 发票号 */
    invoiceNo?: string;
    /** 结算对象ID */
    settlementId: string;
    /** 状态 */
    status: string;
    /** 币别ID */
    currencyId: number;
    /** 发票类型 */
    invoiceType?: string;
    /** 客户银行ID */
    clientInvoiceBankId: string;
    /** 我司银行ID */
    orgBankAccountId: string;
    /** 申请人ID */
    applyUserId?: number;
    /** 申请时间 */
    applyTime?: string;
    /** 开票要求 */
    require?: string;
    /** 备注 */
    remark?: string;
    /** 创建人名称 */
    creatorUserName?: string;
    /** 申请人名称 */
    applyUserName?: string;
    /** 结算对象名称 */
    settlementName?: string;
    /** ✅ 所属公司名称 */
    companyName?: string;
    /** 归属组织id */
    orgId?: null | number;
    /** 币别代码 */
    currencyCode?: string;
    /** 发票汇率 */
    invoiceExchangeRate?: number;
    /** 开票申请费用明细列表（扁平化，不按运输订单分组） */
    invoiceApplicationItems: InvoiceApplicationItemDetailDto[];
    /** 开票申请商品明细列表 */
    invoiceApplicationGoodsDtls: InvoiceApplicationGoodsDtlDto[];
    /** 原币申请金额合计 */
    totalAppliedAmount: number;
    /** 商品明细人民币金额合计 */
    totalGoodsAmount: number;
    /** 折算后的人民币金额（根据当前发票汇率计算） */
    appliedAmountRmb?: number;
    /** 金额是否匹配（根据当前发票汇率判断） */
    amountMatched: boolean;
    /** 客户开票信息（根据ClientInvoiceBankId解析，无则null） */
    clientInvoiceInfo?: ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto | null;
  }

  /** 发票开出用-已提交开票申请查询参数 */
  export interface InvoiceIssueApplicationQueryDto {
    /** 申请单号（模糊） */
    applicationNo?: string;
    /** 结算对象ID */
    settlementId?: string;
    /** 币别ID */
    currencyId?: number;
    /** 发票类型 */
    invoiceType?: string;
    /** 申请时间起 */
    applyTimeStart?: string;
    /** 申请时间止 */
    applyTimeEnd?: string;
    /** 申请人ID */
    applyUserId?: number;
    /** 抬头（模糊，通过ClientInvoiceInfo.Header过滤） */
    header?: string;
    /** 组织ID（通过UserId查询） */
    orgId?: number;
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
 * @param ids 发票开出ID
 */
async function deleteInvoiceIssue(ids: string[]) {
  return requestClient.delete<boolean>(
    '/services/app/InvoiceIssueAdmin/DeleteAsync',
    { data: { ids } },
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
    keyword: params.keyword,
    applicationNo: params.applicationNo,
    invoiceNo: params.invoiceNo,
    settlementId: params.settlementId,
    currencyId: params.currencyId,
    invoiceIssueType: params.invoiceIssueType,
    invoiceType: params.invoiceType,
    invoiceIssueTimeStart: params.invoiceIssueTimeStart,
    invoiceIssueTimeEnd: params.invoiceIssueTimeEnd,
    creatorUserId: params.creatorUserId,
    remark: params.remark,
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

/**
 * 获取发票开出用的已提交开票申请列表（不分页）
 * @param params 查询参数
 */
async function getSubmittedApplicationList(
  params: InvoiceIssueApi.InvoiceIssueApplicationQueryDto = {},
) {
  return requestClient.get<InvoiceIssueApi.InvoiceIssueApplicationDto[]>(
    '/services/app/InvoiceIssueAdmin/GetSubmittedApplicationListAsync',
    { params },
  );
}

/**
 * 仅编辑主表
 * @param data 主表数据
 */
async function editInvoiceIssueMain(
  data: InvoiceIssueApi.InvoiceIssueEditMainDto,
) {
  return requestClient.put<boolean>(
    '/services/app/InvoiceIssueAdmin/EditMainAsync',
    data,
  );
}

/**
 * 新增多条开票申请
 * @param data 新增申请数据
 */
async function addApplicationsToInvoiceIssue(
  data: InvoiceIssueApi.InvoiceIssueAddApplicationsDto,
) {
  return requestClient.post<boolean>(
    '/services/app/InvoiceIssueAdmin/AddApplicationsAsync',
    data,
  );
}

/**
 * 移除多条开票申请
 * @param data 移除申请数据
 */
async function removeApplicationsFromInvoiceIssue(
  data: InvoiceIssueApi.InvoiceIssueRemoveApplicationsDto,
) {
  return requestClient.put<boolean>(
    '/services/app/InvoiceIssueAdmin/RemoveApplicationsAsync',
    data,
  );
}

export {
  addInvoiceIssue,
  deleteInvoiceIssue,
  editInvoiceIssue,
  editInvoiceIssueMain,
  addApplicationsToInvoiceIssue,
  removeApplicationsFromInvoiceIssue,
  getInvoiceIssueDetail,
  getInvoiceIssuePagedList,
  getSubmittedApplicationList,
};
