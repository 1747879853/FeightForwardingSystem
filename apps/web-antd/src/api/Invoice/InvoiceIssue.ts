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
    cnName?: string;
    enName?: string;
    [key: string]: any;
  }

  /** 所属公司（组织）简易信息 */
  export interface CompanySimpleDto {
    id: number | string;
    name?: string;
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
    /** 是否公司节点 */
    isCompany?: boolean;
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
    /** 所属公司对象（替代 companyName） */
    company?: CompanySimpleDto | null;
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

    // ========== 接口开票组 ==========
    /** 诺诺开票状态 */
    issueStatus?: number;
    /** 提交给诺诺的订单号 */
    issueOrderNo?: string;
    /** 诺诺发票流水号 */
    issueSerialNum?: string;
    /** 提交开票请求的时间 */
    issueRequestTime?: string;
    /** 开票失败原因 */
    issueFailCause?: string;
    /** 发票代码。电票为空，只有纸票有值 */
    invoiceCode?: string;

    // ========== 冲红组 ==========
    /** 红冲状态 */
    redStatus?: number;
    /** 是否只能查询（冲红中或已冲红） */
    redLocked?: boolean;
    /** ✅ 编辑锁定：为 true 时，只能查询，禁止编辑、删除等操作 */
    editLocked?: boolean;
    /** 冲红原因 */
    redReason?: number;
    /** 红字确认单申请号 */
    redBillId?: string;
    /** 红字确认单编号 */
    redBillNo?: string;
    /** 红字确认单uuid（内部标识，一般不展示） */
    redBillUuid?: string;
    /** 红票订单号 */
    redOrderNo?: string;
    /** 红票开票流水号 */
    redSerialNum?: string;
    /** 红票发票号码 */
    redInvoiceNo?: string;
    /** 红票发票代码（纸票才有） */
    redInvoiceCode?: string;
    /** 红票开票时间 */
    redInvoiceTime?: string;
    /** 发起冲红申请的时间 */
    redApplyTime?: string;
    /** 发起冲红申请的人 */
    redApplyUserId?: number;
    /** 发起冲红申请的人昵称 */
    redApplyUserName?: string;
    /** 冲红失败/确认单作废原因 */
    redFailCause?: string;

    // ========== 附件 ==========
    /** 发票版式文件附件 */
    attachments?: AttachmentItemDto[];

    /** 关联开票申请明细 */
    invoiceIssueItems: InvoiceIssueItemDto[];
    /** 发票开出商品明细 */
    invoiceIssueGoodsDtls: InvoiceIssueGoodsDtlDto[];
    /** ✅ 对应的开票申请列表（字段与 GetSubmittedApplicationListAsync 出参完全相同） */
    invoiceIssueApplications?: InvoiceIssueApplicationDto[] | null;
  }

  /** 附件项DTO */
  export interface AttachmentItemDto {
    url: string;
    friendlyFileName: string;
    mediaType?: string;
    [key: string]: any;
  }

  /** 调用诺诺开票入参 */
  export interface InvoiceIssueIdInputDto {
    id: string;
  }

  /** 调用诺诺开票出参 / 查询开票结果出参 */
  export interface InvoiceIssueStateDto {
    id: string;
    /** 开票方式。**本接口成功后恒为 `0`（接口开票）** */
    invoiceIssueType?: number;
    issueStatus: number;
    isFinal: boolean;
    issueOrderNo?: string;
    issueSerialNum?: string;
    issueFailCause?: string;
    invoiceNo?: string;
    invoiceCode?: string;
    invoiceIssueTime?: string;
    // ✅ 新增：冲红相关状态字段
    redStatus?: number;
    redLocked?: boolean;
    editLocked?: boolean;
  }

  /** 申请冲红入参 */
  export interface InvoiceIssueApplyRedDto {
    id: string;
    redReason: number;
  }

  /** 申请冲红出参 / 查询冲红结果出参 */
  export interface InvoiceIssueRedStateDto {
    id: string;
    redStatus: number;
    redStatusText: string;
    isFinal: boolean;
    redLocked: boolean;
    redReason?: number;
    redBillId?: string;
    redBillNo?: string;
    redOrderNo?: string;
    redSerialNum?: string;
    redInvoiceNo?: string;
    redInvoiceCode?: string;
    redInvoiceTime?: string;
    redFailCause?: string;
    invoiceNo?: string;
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
    /** 所属公司对象（替代 companyName） */
    company?: CompanySimpleDto | null;
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

    // ========== 接口开票组（新增/补齐） ==========
    /** 诺诺开票状态 */
    issueStatus?: number;
    /** 提交给诺诺的订单号 */
    issueOrderNo?: string;
    /** 诺诺发票流水号 */
    issueSerialNum?: string;
    /** 提交开票请求的时间 */
    issueRequestTime?: string;
    /** 开票失败原因 */
    issueFailCause?: string;
    /** 发票代码。电票为空，只有纸票有值 */
    invoiceCode?: string;

    // ========== 冲红组（新增/补齐） ==========
    /** 红冲状态 */
    redStatus?: number;
    /** 是否只能查询（冲红中或已冲红） */
    redLocked?: boolean;
    /** ✅ 编辑锁定：为 true 时，只能查询，禁止编辑、删除等操作 */
    editLocked?: boolean;
    /** 冲红原因 */
    redReason?: number;
    /** 红字确认单申请号 */
    redBillId?: string;
    /** 红字确认单编号 */
    redBillNo?: string;
    /** 红字确认单uuid（内部标识，一般不展示） */
    redBillUuid?: string;
    /** 红票订单号 */
    redOrderNo?: string;
    /** 红票开票流水号 */
    redSerialNum?: string;
    /** 红票发票号码 */
    redInvoiceNo?: string;
    /** 红票发票代码（纸票才有） */
    redInvoiceCode?: string;
    /** 红票开票时间 */
    redInvoiceTime?: string;
    /** 发起冲红申请的时间 */
    redApplyTime?: string;
    /** 发起冲红申请的人 */
    redApplyUserId?: number;
    /** 发起冲红申请的人昵称 */
    redApplyUserName?: string;
    /** 冲红失败/确认单作废原因 */
    redFailCause?: string;

    // ========== 附件（新增） ==========
    /** 发票版式文件附件 */
    attachments?: AttachmentItemDto[];
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

  /** ✅ 新增：汇率校验结果DTO（用于AddAsync和AddApplicationsAsync的出参） */
  export interface InvoiceIssueExchangeRateCheckDto {
    /**
     * 校验码
     * 0 = 正常，已执行成功
     * 1 = 汇率已变动，且金额对不上的开票申请都只有一条商品明细（可调修正接口）
     * 2 = 存在金额对不上且商品明细不止一条的开票申请（只能驳回）
     */
    code: number;
    /** 金额对不上、且只有一条商品明细的开票申请ID列表 */
    singleGoodsDtlApplicationIds: string[];
    /** 金额对不上、且商品明细不止一条的开票申请ID列表 */
    multiGoodsDtlApplicationIds: string[];
  }

  /** ✅ 新增：AddAsync的返回结果DTO */
  export interface InvoiceIssueAddResultDto extends InvoiceIssueExchangeRateCheckDto {
    /** 新建的发票开出ID；code不为0时为null */
    id: string | null;
  }

  /** ✅ 新增：按汇率修正商品明细输入DTO */
  export interface InvoiceIssueSyncApplicationGoodsDtlDto {
    /** 待修正的开票申请ID列表（至少一条） */
    invoiceApplicationIds: string[];
  }

  /** ✅ 新增：按汇率修正商品明细返回结果DTO */
  export interface InvoiceIssueSyncApplicationGoodsDtlResultDto {
    /** 实际修正了金额的开票申请ID列表 */
    updatedApplicationIds: string[];
    /** 金额本来就对得上、无需修正的开票申请ID列表 */
    unchangedApplicationIds: string[];
  }

  /** 运输订单简易信息 */
  export interface TransportOrderSimpleDto {
    id: string;
    commissionNum?: string;
    mblNum?: string;
    bookingNum?: string;
    /** 委托单位对象（替代 clientName） */
    client?: ClientSimpleDto | null;
    etd?: string;

    // === 整票结算状态字段（客户对账接口使用） ===
    /** 应收整票结算状态（按该业务下全部应收费用汇总） */
    recSettlementStatus?: number | null;
    /** 应付整票结算状态（本次不赋值，恒为 null，预留字段） */
    paySettlementStatus?: number | null;

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

  /** 费用代码简易信息 */
  export interface FeeCodeSimpleDto {
    id?: number;
    code?: string;
    cnName?: string;
    enName?: string;
    [key: string]: any;
  }

  /** 订单费用信息（扩展版，包含SeaExport） */
  export interface OrderFeeDto {
    id: string;
    /** 费用代码对象（替代 feeCodeName / feeCodeCode） */
    feeCode?: FeeCodeSimpleDto | null;
    currencyId: number;
    /** 币别对象（替代 currencyName / currencyCode） */
    currency?: CurrencySimpleDto | null;
    amount: number;
    invoicedAmount: number;
    remainingInvoiceAmount: number;
    /** 结算对象（替代 settlementName / settlementCode） */
    settlement?: ClientSimpleDto | null;
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

    /** 组合费用状态（计算字段，非数据库列） */
    combinedFeeStatus?: number;

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
    /** 开票商品对象（替代 codeInvoiceName） */
    codeInvoice?: CodeInvoiceSimpleDto | null;
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
    /** 结算对象（替代 settlementName） */
    settlement?: ClientSimpleDto | null;
    /** 所属公司对象（替代 companyName） */
    company?: CompanySimpleDto | null;
    /** 归属组织id */
    orgId?: null | number;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
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
    /**
     * 校验码
     * 0 = 金额匹配（totalGoodsAmount == appliedAmountRmb）
     * 1 = 金额不匹配且商品明细恰好1条（可调修正接口）
     * 2 = 金额不匹配且商品明细条数≠1，或无有效发票汇率（只能驳回）
     */
    code: number;
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
 * @returns 返回结果包含code、id和开票申请ID列表
 */
async function addInvoiceIssue(data: InvoiceIssueApi.InvoiceIssueAddDto) {
  return requestClient.post<InvoiceIssueApi.InvoiceIssueAddResultDto>(
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
 * 调用诺诺开票
 * @param id 发票开出ID
 */
async function issueByInterface(id: string) {
  return requestClient.post<InvoiceIssueApi.InvoiceIssueStateDto>(
    '/services/app/InvoiceIssueAdmin/IssueByInterfaceAsync',
    { id },
  );
}

/**
 * 查询诺诺开票结果
 * @param id 发票开出ID
 */
async function queryIssueResult(id: string) {
  return requestClient.post<InvoiceIssueApi.InvoiceIssueStateDto>(
    '/services/app/InvoiceIssueAdmin/QueryIssueResultAsync',
    { id },
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
 * 申请发票冲红
 * @param data 冲红参数
 */
async function applyRedAsync(data: InvoiceIssueApi.InvoiceIssueApplyRedDto) {
  return requestClient.post<InvoiceIssueApi.InvoiceIssueRedStateDto>(
    '/services/app/InvoiceIssueAdmin/ApplyRedAsync',
    data,
  );
}

/**
 * 查询冲红结果
 * @param id 发票开出ID
 */
async function queryRedResult(id: string) {
  return requestClient.post<InvoiceIssueApi.InvoiceIssueRedStateDto>(
    '/services/app/InvoiceIssueAdmin/QueryRedResultAsync',
    { id },
  );
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
 * @returns 返回汇率校验结果，code=0表示加挂成功
 */
async function addApplicationsToInvoiceIssue(
  data: InvoiceIssueApi.InvoiceIssueAddApplicationsDto,
) {
  return requestClient.post<InvoiceIssueApi.InvoiceIssueExchangeRateCheckDto>(
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

/**
 * ✅ 新增：按当前发票汇率修正开票申请商品明细的金额
 * @param data 待修正的开票申请ID列表
 * @returns 返回实际修正和无需修正的申请ID列表
 */
async function syncApplicationGoodsDtlByExchangeRate(
  data: InvoiceIssueApi.InvoiceIssueSyncApplicationGoodsDtlDto,
) {
  return requestClient.put<InvoiceIssueApi.InvoiceIssueSyncApplicationGoodsDtlResultDto>(
    '/services/app/InvoiceIssueAdmin/SyncApplicationGoodsDtlByExchangeRateAsync',
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
  syncApplicationGoodsDtlByExchangeRate, // ✅ 新增导出
  getInvoiceIssueDetail,
  getInvoiceIssuePagedList,
  getSubmittedApplicationList,
  issueByInterface, // ✅ 新增导出
  queryIssueResult, // ✅ 新增导出
  applyRedAsync, // ✅ 新增导出
  queryRedResult, // ✅ 新增导出
};
