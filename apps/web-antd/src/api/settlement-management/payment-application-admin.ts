import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

const API_PREFIX = '/services/app/PaymentApplicationAdmin';

export enum PaymentApplicationStatus {
  Entering = 0,
  Auditing = 1,
  Rejected = 2,
  Passed = 3,
  Partial = 4,
  Settlemented = 5,
}

export namespace PaymentApplicationAdminApi {
  export enum UserAttribute {
    None = 0,
    Operation = 1,
    CustomerService = 2,
    Documentation = 4,
    Business = 8,
    Sale = 16,
    Finance = 32,
    OverseasCustomerService = 64,
    HR = 128,
  }

  /** 业务相关用户 */
  export interface OrderUserDto {
    transportOrderId: string;
    userId: number;
    userNickName?: string;
    userAttribute: UserAttribute;
    sortId: number;
    remark?: string;
    id: number;
  }

  /** 付费申请列表查询参数（通用） */
  export interface PaymentApplicationQueryParams {
    Keyword?: string;
    ApplicationNo?: string;
    Status?: number;
    SettlementId?: string;
    CurrencyId?: number;
    SubmitTimeStart?: string;
    SubmitTimeEnd?: string;
    EndTimeStart?: string;
    EndTimeEnd?: string;
    CreatorUserId?: number;
    OrgId?: number;
    InvoiceProcess?: number;
    InvoiceNo?: string;
    InvoiceDateStart?: string;
    InvoiceDateEnd?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  /** 付费结算 - 选择付费申请列表查询参数 */
  export interface PaymentApplicationSettlementQueryParams {
    /** 付费结算ID，传入后会排除该结算单已关联的付费申请 */
    paymentSettlementId?: string;
    /** 关键字，模糊匹配费用关联的业务 CommissionNum / MblNum / BookingNum */
    keyword?: string;
    /** 申请单号（模糊匹配） */
    applicationNo?: string;
    /** 结算对象ID（客户） */
    settlementId?: string;
    /** 币别ID。不传=搜全部；传 `0`=搜原币申请；传具体值=搜指定币别 */
    currencyId?: number;
    /** 提交时间起 */
    submitTimeStart?: string;
    /** 提交时间止 */
    submitTimeEnd?: string;
    /** 最晚付款时间起 */
    endTimeStart?: string;
    /** 最晚付款时间止 */
    endTimeEnd?: string;
    /** 申请人ID */
    creatorUserId?: number;
    /** 组织ID（数据权限过滤） */
    orgId?: number;
    /** 跳过条数（分页） */
    skipCount: number;
    /** 每页条数（分页） */
    maxResultCount: number;
    /** 排序字段 */
    sorting?: string;
  }

  /** 运输单简要信息（用于费用列表） */
  export interface TransportOrderSimpleForFeeDto {
    /** 业务ID */
    id: string;
    /** 委托编号 */
    commissionNum?: string;
    /** 主提单号 */
    mblNum?: string;
    /** 订舱号 */
    bookingNum?: string;
    /** 结算对象名称 */
    clientName?: string;
  }

  /** 费用 DTO（用于付费结算选择列表） */
  export interface OrderFeeForSettlementDto {
    /** 费用ID */
    id: string;
    /** 创建时间 */
    creationTime?: string;
    /** 创建人ID */
    creatorUserId?: number;
    /** 最后修改时间 */
    lastModificationTime?: string;
    /** 最后修改人ID */
    lastModifierUserId?: number;
    /** 所属用户权限ID */
    userId?: number;
    /** 归属组织id */
    orgId?: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
    /** 业务ID */
    transportOrderId: string;
    /** 更改单ID */
    changeOrderId?: string;
    /** 收付类型：收/付 */
    paySide: number;
    /** 费用状态 */
    feeStatus: number;
    /** 结算状态：0=未结算，1=部分结算，2=已结算 */
    settlementStatus: number;
    /** 开票状态 */
    invoiceStatus?: number;
    /** 费用代码ID */
    feeCodeId: number;
    /** 行业类别/结算对象类别 */
    industryCategory?: number;
    /** 结算对象ID */
    settlementId: string;
    /** 结算对象名称 */
    settlementName?: string;
    /** 币别ID */
    currencyId: number;
    /** 币别代码 */
    currencyCode?: string;
    /** 币别名称 */
    currencyName?: string;
    /** 汇率 */
    exchangeRate: number;
    /** 含税单价 */
    unitPrice: number;
    /** 金额 */
    amount: number;
    /** 单位 */
    unit?: string;
    /** 数量 */
    quantity: number;
    /** 是否含税 */
    taxIncluded?: boolean;
    /** 税率(%) */
    taxRate: number;
    /** 不含税单价（前端传入，后端直接存储） */
    noTaxUnitPrice: number;
    /** 不含税金额（前端传入，后端直接存储） */
    noTaxAmount: number;
    /** 已开票金额 */
    invoicedAmount: number;
    /** 发票申请金额 */
    orderInvoiceAmount?: number;
    /** 未开票金额（计算得出） */
    unInvoicedAmount: number;
    /** 已结算金额 */
    settledAmount: number;
    /** 未结算金额（计算得出） */
    unSettledAmount: number;
    /** 是否允许开票 */
    invoiceBlocked?: boolean;
    /** 是否机密 */
    isConfidential?: boolean;
    /** 数据录入方式 */
    dataEntryMethod?: number;
    /** 备注 */
    remark?: string;
    /** 本位币代码 */
    localCurrencyCode?: string;
    /** 费用录入人昵称 */
    creatorUserName?: string;
    /** 已付费申请金额 */
    rqstPaymentAmount: number;
    /** 未付费申请金额（原币） */
    unRqstPaymentAmount: number;
    /** 本次结算量（该费用在本次结算中的结算量，仅详情接口返回） */
    thisSettledAmount?: number;
    /** 关联业务信息 */
    transportOrder?: TransportOrderSimpleForFeeDto;
  }

  /** 币别分组（用于付费结算选择列表） */
  export interface CurrencyGroupForSettlementDto {
    /** 币别ID */
    id: number;
    /** 币别代码，如 USD、CNY */
    code?: string;
    /** 申请量（收）原币 */
    receiveAmount: number;
    /** 申请金额（收）转成结算币别，原币申请为 null */
    receivePrice?: number;
    /** 申请量（付）原币 */
    payAmount: number;
    /** 申请金额（付）转成结算币别，原币申请为 null */
    payPrice?: number;
    /** 该币别未结算量（原币，不乘汇率）= 收的有效金额 + 付的有效金额 */
    totalUnSettledAmount: number;
    /** 可结算上限（原币）= 正数有效金额之和（收取 UnSettledAmount，付取 -UnSettledAmount，结果>0 的累加） */
    settleableUpperLimit: number;
    /** 可结算上限（结算币别）= settleableUpperLimit × 汇率，原币申请为 null */
    settleablePriceUpperLimit?: number;
    /** 可结算下限（原币）= 负数有效金额之和（收取 UnSettledAmount，付取 -UnSettledAmount，结果<0 的累加） */
    settleableLowerLimit: number;
    /** 可结算下限（结算币别）= settleableLowerLimit × 汇率，原币申请为 null */
    settleablePriceLowerLimit?: number;
    /** 该币别下的费用列表 */
    orderFees: OrderFeeForSettlementDto[];
    /** 该币别的付费申请银行（本接口不填充） */
    paymentApplicationBank?: any;
  }

  /** 客户开票银行简要信息（详情返回） */
  export interface ClientInvoiceBankSimpleDto {
    id: string;
    clientInvoiceInfoId?: string;
    bankName?: string;
    bankAccount?: string;
    accountName?: string;
    currencyId: number;
    currencyCode?: string;
    swiftCode?: string;
    isDefault?: boolean;
    sortId?: number;
  }

  /** 付费申请银行记录（详情返回） */
  export interface PaymentApplicationBankDto {
    id: string;
    paymentApplicationId?: string;
    clientInvoiceBankId: string;
    clientInvoiceBanks?: ClientInvoiceBankSimpleDto[];
  }

  /** 币别分组（通用） */
  export interface CurrencyGroupDto {
    id: number;
    code?: string;
    receiveAmount: number;
    receivePrice?: number;
    payAmount: number;
    payPrice?: number;
    totalUnSettledAmount?: number;
    /** 该币别对应的付费申请银行（仅最外层 currencyGroup 返回） */
    paymentApplicationBank?: PaymentApplicationBankDto | null;
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

  /** 付费申请列表 DTO（通用） */
  export interface PaymentApplicationDto {
    id: string;
    applicationNo?: string;
    status: number;
    submitTime?: string;
    endTime?: string;
    settlementId: string;
    /** 结算对象简易对象（编辑回显用） */
    settlement?: ClientSimpleDtoForOrder | null;
    currencyId?: number;
    require?: string;
    remark?: string;
    tenantId: number;
    clientName?: string;
    currencyCode?: string;
    creatorUserName?: string;
    currencyGroup?: CurrencyGroupDto[];
    totalPayPrice?: number;
    totalReceivePrice?: number;
    userId: number;
    /** 归属组织id */
    orgId?: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
    isDeleted: boolean;
    creationTime: string;
    creatorUserId?: number;
    /** 发票流程：0=先票后付，1=先付后票，2=不开票 */
    invoiceProcess?: number | null;
    invoiceNo?: string | null;
    invoiceDate?: string | null;
  }

  /** 付费申请列表 DTO（用于付费结算选择列表） */
  export interface PaymentApplicationForSettlementDto {
    /** 付费申请ID */
    id: string;
    /** 创建时间 */
    creationTime?: string;
    /** 创建人ID */
    creatorUserId?: number;
    /** 最后修改时间 */
    lastModificationTime?: string;
    /** 最后修改人ID */
    lastModifierUserId?: number;
    /** 所属用户权限ID */
    userId?: number;
    /** 归属组织id */
    orgId?: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
    /** 申请单号 */
    applicationNo?: string;
    /** 申请状态：`3`=审核通过，`4`=部分结算 */
    status: number;
    /** 提交时间 */
    submitTime?: string;
    /** 最晚付款时间 */
    endTime?: string;
    /** 结算对象ID */
    settlementId: string;
    /** 币别ID（null=原币申请） */
    currencyId?: number;
    /** 支付要求 */
    require?: string;
    /** 备注 */
    remark?: string;
    /** 租户ID */
    tenantId?: number;
    /** 结算对象名称 */
    clientName?: string;
    /** 币别代码 */
    currencyCode?: string;
    /** 创建人名称 */
    creatorUserName?: string;
    /** 审核人ID */
    auditUserId?: number;
    /** 审核人昵称 */
    auditUserNickName?: string;
    /** 审核时间 */
    auditTime?: string;
    /** 应付总金额（结算币别）= 各币别 PayPrice 之和，原币申请为 null */
    totalPayPrice?: number;
    /** 应收总金额（结算币别）= 各币别 ReceivePrice 之和，原币申请为 null */
    totalReceivePrice?: number;
    /** 可结算上限合计（结算币别）= 各币别 SettleablePriceUpperLimit 之和，原币申请为 null */
    totalSettleablePriceUpperLimit?: number;
    /** 可结算下限合计（结算币别）= 各币别 SettleablePriceLowerLimit 之和，原币申请为 null */
    totalSettleablePriceLowerLimit?: number;
    /** 按币别分组的金额汇总 */
    currencyGroup?: CurrencyGroupForSettlementDto[];
    /** 用户输入的本次结算金额（固定币别申请时使用，前端临时字段） */
    settledPrice?: number;
  }

  /** 分页数据封装 */
  export interface PagedList<T> {
    totalCount: number;
    items: T[];
  }

  /** 分页数据封装（旧版兼容） */
  export interface PagedListOfPaymentApplicationDto {
    skipCount: number;
    maxResultCount: number;
    items?: PaymentApplicationDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  export interface GetOrderFeeGroupParams {
    /** 当前付费申请id，排除已选费用 */
    Id?: string;
    /** 结算对象(客户id) 必填 */
    SettlementId?: string;
    /** 会计期间起 */
    AccountDateStart?: string;
    /** 会计期间止 */
    AccountDateEnd?: string;
    /** 费用名称 */
    FeeCodeIds?: number[];
    /** 要排除的费用名称 */
    ExceptFeeCodeIds?: number[];
    /** 收付类型 */
    PaySide?: number;
    /** 费用状态 */
    FeeStatus?: number;
    /** 结算状态 */
    SettlementStatus?: number;
    /** 开票状态 */
    InvoiceStatus?: number;
    /** 币别id */
    CurrencyId?: number;
    /** 对账编号 */
    StatementNum?: string;
    /** 编号 模糊匹配 */
    Keyword?: string;
    /** 委托单位id */
    ClientId?: string;
    /** 业务类型 */
    BizType?: number;
    /** 开船日期起 */
    ETDStart?: string;
    /** 开船日期止 */
    ETDEnd?: string;
    /** 起运港id */
    POLId?: number;
    /** 目的港id */
    PODId?: number;
    /** 组织id */
    OrgId?: number;
    /** 销售id */
    SaleId?: number;
    /** 操作id */
    OperatorId?: number;
    /** 客服id */
    CustomerServiceId?: number;
    /** 排序 */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }

  /** 费用 DTO */
  export interface OrderFeeDto {
    id: string;
    transportOrderId: string;
    changeOrderId?: string;
    paySide: number;
    feeStatus: number;
    settlementStatus: number;
    invoiceStatus: number;
    feeCodeId: number;
    settlementId: string;
    currencyId: number;
    exchangeRate: number;
    unitPrice: number;
    amount: number;
    /** 单位（中文字符串，最大16字符） */
    unit: string;
    quantity: number;
    taxRate: number;
    invoicedAmount: number;
    orderInvoiceAmount: number;
    settledAmount: number;
    invoiceBlocked: boolean;
    isConfidential: boolean;
    dataEntryMethod: number;
    remark?: string;
    localCurrencyCode?: string;
    rqstPaymentAmount: number;
    unRqstPaymentAmount: number;
    unSettledAmount: number;
    feeCodeName?: string;
    /** 币别代码 */
    currencyCode?: string;
    currencyName?: string;
    settlementName?: string;
    unInvoicedAmount: number;
    noTaxUnitPrice: number;
    noTaxAmount: number;
    isDeleted: boolean;
    creationTime: string;
    creatorUserId?: number;
  }

  /** 客户简要 DTO（结算对象） */
  export interface ClientSimpleDto {
    id: string;
    name?: string;
    code?: string;
    fullName?: string;
    enName?: string;
  }

  /** 业务单据用客户简易对象（往来单位对象化） */
  export interface ClientSimpleDtoForOrder {
    id: string;
    /** 客户简称 */
    name?: string;
    /** 客户全称 */
    fullName?: string;
    /** 地址 */
    address?: string;
    /** 英文地址 */
    enAddress?: string;
  }

  /** 港口简要 DTO */
  export interface PortSimpleDto {
    portName?: string;
    cnName?: string;
  }

  /** 箱型箱量简要 DTO */
  export interface OrderCtnSimpleDto {
    ctnCodeId?: number;
    ctnCodeName?: string;
  }

  /** 业务 + 结算对象分组 DTO */
  export interface PayAppFeeGroupDto {
    id: string;
    settlementId: string;
    settlement?: ClientSimpleDto;
    bizType: number;
    commissionNum?: string;
    accountDate: string;
    settlementDate: string;
    mblNum?: string;
    bookingNum?: string;
    clientId: string;
    /** 委托单位（业务往来单位简易对象，无则为 null） */
    client?: ClientSimpleDtoForOrder | null;
    polId?: number;
    polName?: string;
    pol?: PortSimpleDto;
    podId?: number;
    podName?: string;
    pod?: PortSimpleDto;
    etd?: string;
    eta?: string;
    orderUsers?: OrderUserDto[];
    orderFees?: OrderFeeDto[];
    orderCtns?: OrderCtnSimpleDto[];
    isDeleted: boolean;
    creationTime: string;
  }

  /** 分页数据封装 */
  export interface PagedListOfPayAppFeeGroupDto {
    skipCount: number;
    maxResultCount: number;
    items?: PayAppFeeGroupDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 附件项 DTO（输入） */
  export interface AttachmentItemForItemInputDto {
    attachmentId?: number;
    displayOrder?: number;
    itemId?: string;
    url?: string;
    friendlyFileName?: string;
    id?: number;
    attachmentDtlTypeId?: number | null;
    clientVisible?: boolean;
  }

  /** 附件项 DTO（详情输出） */
  export interface AttachmentItemDto {
    attachmentId: number;
    itemId?: string;
    moduleTypeId?: string;
    isFirstShow: boolean;
    displayOrder: number;
    url?: string;
    mediaType?: number;
    friendlyFileName?: string;
    id: number;
    attachmentDtlTypeId?: number | null;
    clientVisible?: boolean;
    creatorUserName?: string;
    creationTime?: string;
  }

  /** 付费申请附件分组（详情输出） */
  export interface AttachmentGroupDto {
    attachmentDtlTypeId?: number | null;
    attachmentDtlType?: {
      id: number;
      name?: string | null;
      sortId?: number;
    } | null;
    items?: AttachmentItemDto[];
  }

  /** 付费申请附件分组（新增/编辑输入） */
  export interface AttachmentGroupInputDto {
    attachmentDtlTypeId?: number | null;
    items?: AttachmentItemForItemInputDto[];
  }

  /** 运输单简要信息 */
  export interface TransportOrderSimpleDto {
    id: string;
    commissionNum?: string;
    mblNum?: string;
    bookingNum?: string;
    accountDate: string;
    settlementDate: string;
    etd?: string;
    eta?: string;
    goodsCompleteTime?: string;
    seaExportPOLId?: number;
    seaExportPOLCnName?: string;
    /** 起运港英文名称（详情 transportOrder） */
    seaExportPOLPortName?: string;
    seaExportPOLName?: string;
    seaExportPOL?: PortSimpleDto;
    seaExportPODId?: number;
    seaExportPODCnName?: string;
    /** 目的港英文名称（详情 transportOrder） */
    seaExportPODPortName?: string;
    seaExportPODName?: string;
    seaExportPOD?: PortSimpleDto;
    seaExportVessel?: string;
    seaExportInnerVoyno?: string;
    bizType: number;
    clientId: string;
    clientName?: string;
    saleNames?: string[];
    operatorNames?: string[];
    customerServiceNames?: string[];
    isBusinessLocking: boolean;
    pkgs?: number;
    grossWeight?: number;
    remark?: string;
    isDeleted: boolean;
    creationTime: string;
  }

  /** 付费申请明细 DTO（详情输出） */
  export interface PaymentApplicationItemDto {
    id: number;
    paymentApplicationId: string;
    orderFeeId: string;
    rate?: number;
    appliedAmount: number;
    remark?: string;
    feeCodeName?: string;
    feeCurrencyName?: string;
    feeAmount: number;
    feeSettlementName?: string;
    orderFee?: OrderFeeDto;
    isDeleted: boolean;
    creationTime: string;
    creatorUserId?: number;
  }

  /** 费用和业务分组 DTO（详情输出） */
  export interface PayAppFeeAndSeaExportDto {
    currencyGroup?: CurrencyGroupDto[];
    totalPayPrice?: number;
    totalReceivePrice?: number;
    paymentApplicationItems?: PaymentApplicationItemDto[];
    transportOrder?: TransportOrderSimpleDto;
  }

  /** 付费申请详情 DTO */
  export interface PaymentApplicationDetailDto extends PaymentApplicationDto {
    payAppFeeBySeaExportGroup?: PayAppFeeAndSeaExportDto[];
    attachmentGroup?: AttachmentGroupDto[];
    /** 关联付费结算的只读附件 */
    paymentSettlementAttachments?: AttachmentItemDto[];
  }

  /** 付费申请明细新增 DTO */
  export interface PaymentApplicationItemAddDto {
    orderFeeId: string;
    rate?: number | null;
    appliedAmount: number;
    remark?: string;
  }

  /** 付费申请银行新增 DTO */
  export interface PaymentApplicationBankAddDto {
    clientInvoiceBankId: string;
  }

  /** 付费申请银行编辑 DTO（全量替换） */
  export interface PaymentApplicationBankEditDto {
    id?: string | null;
    clientInvoiceBankId: string;
  }

  /** 付费申请新增 DTO */
  export interface PaymentApplicationAddDto {
    id?: string;
    /** 归属组织id */
    orgId: number;
    status?: PaymentApplicationStatus;
    submitTime?: string | null;
    endTime?: string | null;
    settlementId: string;
    currencyId?: number | null;
    require?: string;
    remark?: string;
    paymentApplicationItems?: PaymentApplicationItemAddDto[];
    paymentApplicationBanks?: PaymentApplicationBankAddDto[];
    invoiceProcess?: number | null;
    invoiceNo?: string | null;
    invoiceDate?: string | null;
    attachmentGroup?: AttachmentGroupInputDto[];
  }

  /** 付费申请编辑 DTO（主表 + 银行/附件全量替换） */
  export interface PaymentApplicationEditDto {
    id: string;
    /** 归属组织id */
    orgId?: number;
    status?: PaymentApplicationStatus;
    submitTime?: string | null;
    endTime?: string | null;
    require?: string;
    remark?: string;
    paymentApplicationBanks?: PaymentApplicationBankEditDto[];
    invoiceProcess?: number | null;
    invoiceNo?: string | null;
    invoiceDate?: string | null;
    attachmentGroup?: AttachmentGroupInputDto[];
  }

  export interface PaymentApplicationAddAttachmentsDto {
    id: string;
    attachments: AttachmentItemForItemInputDto[];
  }

  /** 添加费用关联 DTO */
  export interface PaymentApplicationAddFeesDto {
    id: string;
    paymentApplicationItems?: PaymentApplicationItemAddDto[];
  }

  /** 删除费用关联 DTO */
  export interface PaymentApplicationDelFeesDto {
    id: string;
    orderFeeIds?: string[];
  }
}

/** 获取付费申请列表（通用） */
export async function getPaymentApplicationPagedList(params: Recordable<any>) {
  const queryParams: PaymentApplicationAdminApi.PaymentApplicationQueryParams =
    {
      Keyword: params.Keyword || params.keyword,
      ApplicationNo: params.ApplicationNo || params.applicationNo,
      Status: params.Status ?? params.status,
      SettlementId: params.SettlementId || params.settlementId,
      CurrencyId: params.CurrencyId ?? params.currencyId,
      SubmitTimeStart: params.SubmitTimeStart || params.submitTimeStart,
      SubmitTimeEnd: params.SubmitTimeEnd || params.submitTimeEnd,
      EndTimeStart: params.EndTimeStart || params.endTimeStart,
      EndTimeEnd: params.EndTimeEnd || params.endTimeEnd,
      CreatorUserId: params.CreatorUserId ?? params.creatorUserId,
      OrgId: params.OrgId ?? params.orgId,
      InvoiceProcess: params.InvoiceProcess ?? params.invoiceProcess,
      InvoiceNo: params.InvoiceNo || params.invoiceNo,
      InvoiceDateStart: params.InvoiceDateStart || params.invoiceDateStart,
      InvoiceDateEnd: params.InvoiceDateEnd || params.invoiceDateEnd,
      Sorting: params.Sorting || 'Id desc',
      PageIndex: params.PageIndex || params.pageIndex || 1,
      PageSize: params.PageSize || params.pageSize || 10,
    };

  const response =
    await requestClient.get<PaymentApplicationAdminApi.PagedListOfPaymentApplicationDto>(
      `${API_PREFIX}/GetPagedListAsync`,
      { params: queryParams },
    );

  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

/** 获取付费结算 - 选择付费申请列表（只返回已审核通过且有未结算余额的付费申请） */
export async function getPaymentApplicationPagedListForSettlement(
  params: PaymentApplicationAdminApi.PaymentApplicationSettlementQueryParams,
) {
  return requestClient.get<
    PaymentApplicationAdminApi.PagedList<PaymentApplicationAdminApi.PaymentApplicationForSettlementDto>
  >(`${API_PREFIX}/GetPagedListForSettlementAsync`, { params });
}

/** 获取可进行付费申请的费用按业务分组列表 */
export async function getOrderFeeGroupAsync(
  params: PaymentApplicationAdminApi.GetOrderFeeGroupParams,
) {
  return requestClient.get<PaymentApplicationAdminApi.PagedListOfPayAppFeeGroupDto>(
    `${API_PREFIX}/GetOrderFeeGroupAsync`,
    { params },
  );
}

/** 获取付费申请详情 */
export async function getPaymentApplicationDetail(id: string) {
  return requestClient.get<PaymentApplicationAdminApi.PaymentApplicationDetailDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
}

/** 新增付费申请 */
export async function addPaymentApplication(
  data: PaymentApplicationAdminApi.PaymentApplicationAddDto,
) {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
}

/** 删除付费申请（支持批量） */
export async function deletePaymentApplication(params: {
  id?: string;
  ids?: string[];
}) {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: params,
  });
}

/** 修改付费申请（仅主表） */
export async function editPaymentApplication(
  data: PaymentApplicationAdminApi.PaymentApplicationEditDto,
) {
  return requestClient.put(`${API_PREFIX}/EditAsync`, data);
}

/** 添加费用关联 */
export async function payAppItemAdd(
  data: PaymentApplicationAdminApi.PaymentApplicationAddFeesDto,
) {
  return requestClient.put(`${API_PREFIX}/PayAppItemAddAsync`, data);
}

/** 删除费用关联 */
export async function payAppItemDel(
  data: PaymentApplicationAdminApi.PaymentApplicationDelFeesDto,
) {
  return requestClient.put(`${API_PREFIX}/PayAppItemDelAsync`, data);
}

/** 提交付费申请 */
export async function submitPaymentApplication(id: string) {
  return requestClient.post(`${API_PREFIX}/SubmitAsync`, { id });
}

/** 撤销提交付费申请 */
export async function unsubmitPaymentApplication(id: string) {
  return requestClient.post(`${API_PREFIX}/UnSubmitAsync`, { id });
}

/** 追加入付费申请附件（不覆盖既有附件） */
export async function addPaymentApplicationAttachments(
  data: PaymentApplicationAdminApi.PaymentApplicationAddAttachmentsDto,
) {
  return requestClient.post<boolean>(`${API_PREFIX}/AddAttachments`, data);
}
