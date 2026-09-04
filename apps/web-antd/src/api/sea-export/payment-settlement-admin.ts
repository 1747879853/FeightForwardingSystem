import { requestClient } from '#/api/request';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

const API_PREFIX = '/services/app/PaymentSettlementAdmin';

export namespace PaymentSettlementAdminApi {
  /**
   * 付费结算模块接口定义
   *
   * 所有接口均需要登录认证
   *
   * 注意：2026-08-10 起，付费结算不再录入汇率，汇率一律从付费申请取。
   * 所有写接口的 paymentSettlementRates 入参已删除，App_PaymentSettlementRates 表已废弃。
   */

  // ==================== DTO 定义 ====================

  /** 币别结算项DTO */
  export interface PaymentSettlementAddItemCurrencyDto {
    /** 原币币别ID */
    originalCurrencyId: number;
    /** 本币别申请结算的净额（原币），必须在 [settleableLowerLimit, settleableUpperLimit] 范围内 */
    settledAmount: number;
  }

  /** 付费申请结算组DTO */
  export interface PaymentSettlementAddItemGroupDto {
    /** 付费申请ID */
    paymentApplicationId: string;
    /** 结算总金额（结算币别）。固定币别的付费申请使用此字段，后端自动分配到各原币币别；原币申请不需要此字段 */
    settledPrice?: number;
    /** 币别结算列表。原币申请必填；固定币别申请如果传了 `settledPrice` 则由后端自动计算，不需要传此字段 */
    currencyItems?: PaymentSettlementAddItemCurrencyDto[];
  }

  /** 附件项输入DTO */
  export interface AttachmentItemForItemInputDto {
    /** 附件ID */
    attachmentId: number;
    /** 排序 */
    displayOrder: number;
  }

  /** 附件项DTO */
  export interface AttachmentItemDto extends AttachmentItemForItemInputDto {
    friendlyFileName: string;
    /** 附件名称 */
    attachmentName?: string;
    /** 附件路径 */
    attachmentPath?: string;
    /** 附件URL（兼容新接口） */
    url?: string;
  }

  /** 新增付费结算参数DTO */
  export interface PaymentSettlementAddDto {
    /** 归属组织id */
    orgId: number;
    /** 结算时间，默认当前时间可自定义 */
    settlementTime: string;
    /** 付款方式 */
    payType?: number;
    /** 结算对象ID（客户） */
    settlementId: string;
    /** 结算币别ID */
    currencyId: number;
    /** 我司银行ID */
    orgBankAccountId?: string;
    /** 结算对象银行（对方银行）ID */
    clientInvoiceBankId?: string;
    /** 手续费 */
    transactionFee?: number;
    /** 备注 */
    remark?: string;
    /** 付费申请结算列表 */
    paymentApplicationGroups: PaymentSettlementAddItemGroupDto[];
    /** 附件列表 */
    attachments?: AttachmentItemForItemInputDto[];
  }

  /** 修改付费结算参数DTO */
  export interface PaymentSettlementEditDto {
    /** 付费结算ID */
    id: string;
    /** 归属组织id */
    orgId?: number;
    /** 结算时间 */
    settlementTime: string;
    /** 付款方式 */
    payType?: number;
    /** 我司银行ID */
    orgBankAccountId?: string;
    /** 结算对象银行ID */
    clientInvoiceBankId?: string;
    /** 手续费 */
    transactionFee?: number;
    /** 备注 */
    remark?: string;
    /** 附件列表（全量替换） */
    attachments?: AttachmentItemForItemInputDto[];
  }

  /** 添加结算明细参数DTO */
  export interface PaymentSettlementAddItemsDto {
    /** 付费结算ID */
    id: string;
    /** 新增的付费申请结算列表 */
    paymentApplicationGroups: PaymentSettlementAddItemGroupDto[];
  }

  /** 删除结算明细参数DTO */
  export interface PaymentSettlementDeleteItemsDto {
    /** 付费结算ID */
    id: string;
    /** 要删除的付费申请ID列表（删除该结算单中属于这些付费申请的所有结算明细） */
    paymentApplicationIds: string[];
  }

  /** 删除付费结算参数DTO */
  export interface PaymentSettlementDeleteDto {
    /** 付费结算ID */
    id: string;
  }

  /** 锁定/解锁付费结算参数DTO */
  export interface PaymentSettlementLockDto {
    /** 付费结算ID */
    id: string;
  }

  /** 费用详情DTO */
  export interface OrderFeeDto {
    /** 费用ID */
    id: string;
    /** 费用代码对象（替代 feeCodeName / feeCodeCode） */
    feeCode?: FeeCodeSimpleDto | null;
    /** 币别对象（替代 currencyName / currencyCode） */
    currency?: CurrencySimpleDto | null;
    /** 结算对象（替代 settlementName / settlementCode） */
    settlement?: ClientSimpleDto | null;
    /** 含税单价 */
    unitPrice?: number;
    /** 金额（原币金额，字段描述统一为「量」） */
    amount?: number;
    /** 单位 */
    unit?: string;
    /** 数量 */
    quantity?: number;
    /** 已结算量（原币，费用累计已被结算的量，来自 OrderFee.SettledAmount） */
    settledAmount?: number;
    /** 未结算量 */
    unSettledAmount?: number;
    /** 收付类型 */
    paySide?: number;
    /** 费用状态 */
    feeStatus?: number;
    /** 备注 */
    remark?: string;
    /** 本次结算量（原币，该费用在这条结算单里的结算量） */
    thisSettledAmount?: number;
    /** 不含税单价（后端直接返回数据库存储值） */
    noTaxUnitPrice?: number;
    /** 不含税金额（后端直接返回数据库存储值） */
    noTaxAmount?: number;
    /** 归属组织id */
    orgId?: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?:
      | import('#/api/settlement-management/payment-application-admin').PaymentApplicationAdminApi.OrganizationUnitSimpleDto[]
      | null;

    // ===== 结算详情特有字段 =====
    /** 已结算金额（结算币别）= settledAmount × 本行 rate，仅结算详情填充，其余接口为 null */
    settledPrice?: number;
    /** 本次结算金额（结算币别）= thisSettledAmount × 本行 rate，仅结算详情填充，其余接口为 null */
    thisSettledPrice?: number;
    /** 关联业务信息 */
    transportOrder?: TransportOrderSimplePrintDto | null;
    /** 费用代码名称 */
    feeCodeName?: string;
    /** 费用币别代码 */
    currencyCode?: string;
    /** 结算对象名称 */
    settlementName?: string;
    /** 结算对象编码 */
    settlementCode?: string;
    /** 已开票量 */
    invoicedAmount?: number;
    /** 发票申请量 */
    orderInvoiceAmount?: number;
    /** 未开票量 = amount - invoicedAmount */
    unInvoicedAmount?: number;
  }

  /** 分页查询参数DTO */
  export interface PaymentSettlementQueryDto {
    /** 结算对象ID */
    settlementId?: string;
    /** 结算单号（模糊） */
    settlementNo?: string;
    /** 结算时间起 */
    settlementTimeStart?: string;
    /** 结算时间止 */
    settlementTimeEnd?: string;
    /** 创建人ID */
    creatorUserId?: number;
    /** 结算币别ID */
    currencyId?: number;
    /** 我司银行ID */
    orgBankAccountId?: string;
    /** 关键字：模糊匹配 TransportOrder.MblNum 或 TransportOrder.CommissionNum */
    keyword?: string;
    /**
     * Keys 精确搜索（SQL IN，非模糊）：命中主提单号、委托编号中任意一个即可（不含订舱编号，与该列表原 keyword 一致）。
     * GET 需 repeat 序列化：keys=a&keys=b。
     */
    keys?: string[];
    /** 委托编号（模糊匹配 TransportOrder.CommissionNum） */
    commissionNum?: string;
    /** 费用对应业务的主提单号（模糊）- 保留以兼容旧版本 */
    mblNum?: string;
    /** 组织ID */
    orgId?: number;
    /** 当前页码（从1开始） */
    pageIndex: number;
    /** 每页条数 */
    pageSize: number;
    /** 排序字段 */
    sorting?: string;
  }

  /** 币别汇总DTO */
  export interface CurrencySumDto {
    /** 原币币别ID */
    originalCurrencyId: number;
    /** 原币币别对象（替代 originalCurrencyCode，编码读 code） */
    originalCurrency?: CurrencySimpleDto | null;
    /** 该币别结算量合计（原币） */
    totalSettledAmount: number;
    /** 该币别结算金额合计（结算币别）= 该币别下各条明细 settledAmount × rate 之和 */
    totalSettledPrice: number;
  }

  /** 付费申请简要DTO */
  export interface PayAppSimpleDto {
    /** 付费申请ID */
    id: string;
    /** 付费申请单号 */
    applicationNo: string;
  }

  /** 费用简要DTO */
  export interface FeeSimpleDto {
    /** 费用ID */
    id: string;
    /** 主提单号 */
    mblNum: string;
  }

  /** 付费结算列表DTO */
  export interface PaymentSettlementListDto {
    /** 付费结算ID */
    id: string;
    /** 结算单号 */
    settlementNo: string;
    /** 结算状态 */
    status: number;
    /** 结算时间 */
    settlementTime: string;
    /** 付款方式 */
    payType?: number;
    /** 是否锁定 */
    locked: boolean;
    /** 锁定时间 */
    lockeTime?: string;
    /** 结算对象ID */
    settlementId: string;
    /** 结算币别ID */
    currencyId: number;
    /** 我司银行ID */
    orgBankAccountId?: string;
    /** 结算对象银行ID */
    clientInvoiceBankId?: string;
    /** 手续费 */
    transactionFee?: number;
    /** 备注 */
    remark?: string;
    /** 结算对象（客户简易对象，无则为 null） */
    settlement?: null | PaymentApplicationAdminApi.ClientSimpleDtoForOrder;
    /** 结算币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    /** 创建人名称 */
    creatorUserName: string;
    /** 申请人昵称（userId 对应用户的 nickName） */
    userName?: string;
    /** 结算金额合计（结算币别）= SUM(settledAmount × rate) */
    totalSettledPrice: number;
    /** 原始币别汇总列表 */
    currencySumList: CurrencySumDto[];
    /** 付费申请简要列表（id + 单号） */
    paymentApplications: PayAppSimpleDto[];
    /** 费用简要列表（id + 主提单号） */
    orderFees: FeeSimpleDto[];
    /**
     * 本结算单涉及的业务票（按业务去重），与付费申请侧同结构。
     * 组内只填 `transportOrder`，其余字段（paymentApplicationItems / currencyGroup / totalPayPrice / totalReceivePrice）恒为 null。
     */
    payAppFeeBySeaExportGroup?: PaymentApplicationAdminApi.PayAppFeeAndSeaExportDto[];
    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
  }

  /** 分页列表响应 */
  export interface PagedList<T> {
    totalCount: number;
    items: T[];
  }

  // ==================== 按原币和付费申请相关 DTO ====================

  /** 简单DTO - 港口代码 */
  export interface PortCodeSimpleDto {
    id: number;
    portName?: string;
    cnName?: string;
  }

  /** 简单DTO - 船公司 */
  export interface CarrierSimpleDto {
    id: number;
    code?: string;
    cnName?: string;
    cnShortName?: string;
    enName?: string;
    ediCode?: string;
  }

  /** 简单DTO - 委托单位 */
  export interface ClientSimpleDto {
    id: string;
    name?: string;
    code?: string;
    fullName?: string;
    enName?: string;
  }

  /** 简单DTO - 费用代码 */
  export interface FeeCodeSimpleDto {
    id: number;
    code?: string;
    cnName?: string;
    enName?: string;
  }

  /** 简单DTO - 币别 */
  export interface CurrencySimpleDto {
    id: number;
    code?: string;
    name?: string;
    cnName?: string;
    enName?: string;
  }

  /** 运输订单简要DTO */
  export interface TransportOrderSimplePrintDto {
    id: string;
    commissionNum?: string;
    mblNum?: string;
    bookingNum?: string;
    /** 委托单位对象（替代 clientName） */
    client?: ClientSimpleDto | null;
    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
  }

  /**
   * 订单费用DTO（用于选择列表）
   *
   * 后端即通用 `OrderFeeDto`（见 `doc/付费结算/付费结算选择付费申请列表接口文档.md`），
   * 外键已对象化，勿再读 feeCodeName / settlementName / currencyCode。
   */
  export interface OrderFeeForSelectionDto {
    id: string;
    transportOrderId: string;
    paySide: number;
    feeCodeId: number;
    feeCode?: FeeCodeSimpleDto | null;
    settlementId: string;
    settlement?: ClientSimpleDto | null;
    currencyId: number;
    currency?: CurrencySimpleDto | null;
    exchangeRate: number;
    amount: number;
    unSettledAmount: number;
    rqstPaymentAmount?: number;
    unRqstPaymentAmount?: number;
    settlementStatus: number;
    localCurrencyId?: number;
    /** 本位币对象（替代 localCurrencyCode，编码读 code） */
    localCurrency?: CurrencySimpleDto | null;
    transportOrder?: TransportOrderSimplePrintDto;
    /** 费用代码名称 */
    feeCodeName?: string;
    /** 费用币别代码 */
    currencyCode?: string;
    /** 结算对象名称 */
    settlementName?: string;
    /** 结算对象编码 */
    settlementCode?: string;
    /** 已开票量 */
    invoicedAmount?: number;
    /** 发票申请量 */
    orderInvoiceAmount?: number;
    /** 未开票量 = amount - invoicedAmount */
    unInvoicedAmount?: number;
    /** 已结算量（原币金额，字段描述统一为「量」） */
    settledAmount?: number;
  }

  /** 按原币的付费申请选择列表DTO */
  export interface PaymentApplicationCurrencyForSettlementDto {
    /** 行标识 */
    id: string;
    /** 行唯一键，格式 `付费申请id_原币币别id` */
    rowKey: string;
    /** 付费申请ID，与 id 相同，便于语义化取值 */
    paymentApplicationId: string;

    // ===== 付费申请维度（同一申请的多行内容相同）=====
    /** 申请单号 */
    applicationNo: string;
    /** 申请状态：`3`=审核通过，`4`=部分结算 */
    status: number;
    /** 提交时间 */
    submitTime?: string;
    /** 最晚付款时间 */
    endTime?: string;
    /** 结算对象ID */
    settlementId: string;
    /** 申请币别ID（null=原币申请） */
    currencyId?: number;
    /** 支付要求 */
    require?: string;
    /** 备注 */
    remark?: string;
    /** 发票流程 0先票后付 1先付后票 2不开票 */
    invoiceProcess?: number;
    /** 租户ID */
    tenantId: number;
    /** 结算对象（含默认地址） */
    settlement?: PaymentApplicationAdminApi.ClientSimpleDtoForOrder;
    /** 申请币别对象，原币申请为 null */
    currency?: CurrencySimpleDto;
    /** 创建人昵称 */
    creatorUserName?: string;
    /** 最后修改人昵称 */
    lastModifierUserName?: string;

    /** 任务相关 */
    /** 审核人ID */
    auditUserId?: number;
    /** 审核人昵称 */
    auditUserNickName?: string;
    /** 审核时间 */
    auditTime?: string;

    // ===== 原币币别维度（本行的分组键与金额）=====
    /** 原币币别ID，取自 OrderFee.CurrencyId */
    originalCurrencyId: number;
    /** 原币币别对象 */
    originalCurrency?: CurrencySimpleDto | null;
    /** 申请量（付），原币 */
    payAmount: number;
    /** 申请金额（付），转成申请币别，原币申请为 null */
    payPrice?: number;
    /** 申请量（收），原币 */
    receiveAmount: number;
    /** 申请金额（收），转成申请币别，原币申请为 null */
    receivePrice?: number;
    /** 该原币币别未结算量（不乘汇率）= 收的有效金额 + 付的有效金额 */
    totalUnSettledAmount: number;
    /**
     * 该原币币别未结算金额（结算币别）
     * = 逐条「有效金额 × 该条汇率」累加
     * 固定币别申请汇率取 PaymentApplicationItem.Rate，原币申请恒为 1（此时数值等于 totalUnSettledAmount）
     * 结满一行时直接把这个值当 settledPrice 提交
     */
    totalUnSettledPrice: number;
    /** 可结算上限（原币）= 正数有效金额之和 */
    settleableUpperLimit: number;
    /** 可结算上限（结算/申请币别）= 正数有效金额逐条乘各自汇率之和，原币申请为 null */
    settleablePriceUpperLimit?: number;
    /** 可结算下限（原币）= 负数有效金额之和 */
    settleableLowerLimit: number;
    /** 可结算下限（结算/申请币别）= 负数有效金额逐条乘各自汇率之和，原币申请为 null */
    settleablePriceLowerLimit?: number;
    /** 该原币币别下的费用列表 */
    orderFees: OrderFeeForSelectionDto[];
  }

  /** 按原币的结算行输入DTO */
  export interface PaymentSettlementItemByCurrencyInputDto {
    /** 付费申请ID */
    paymentApplicationId: string;
    /** 原币币别ID（费用的币别） */
    originalCurrencyId: number;
    /**
     * 本行结算的净额（结算币别），必填
     * 固定币别申请需落在 [settleablePriceLowerLimit, settleablePriceUpperLimit]
     * 原币申请落在 [settleableLowerLimit, settleableUpperLimit]
     * 结满一行时直接传选择列表返回的 totalUnSettledPrice
     */
    settledPrice: number;
    /** 已废弃，后端不再读取，保留仅为兼容旧调用方 */
    settledAmount?: number;
  }

  /** 按原币的结算行定位键DTO */
  export interface PaymentSettlementPayAppCurrencyKeyDto {
    paymentApplicationId: string;
    originalCurrencyId: number;
  }

  /** 新增付费结算参数DTO（按原币） */
  export interface PaymentSettlementAddByCurrencyDto {
    settlementTime: string;
    payType?: number;
    settlementId: string;
    orgId: number;
    currencyId: number;
    orgBankAccountId?: string;
    clientInvoiceBankId?: string;
    transactionFee?: number;
    remark?: string;
    paymentApplicationCurrencyItems: PaymentSettlementItemByCurrencyInputDto[];
    attachments?: AttachmentItemForItemInputDto[];
  }

  /** 添加结算明细参数DTO（按原币） */
  export interface PaymentSettlementAddItemsByCurrencyDto {
    id: string;
    paymentApplicationCurrencyItems: PaymentSettlementItemByCurrencyInputDto[];
  }

  /** 删除结算明细参数DTO（按原币） */
  export interface PaymentSettlementDeleteItemsByCurrencyDto {
    id: string;
    paymentApplicationCurrencyKeys: PaymentSettlementPayAppCurrencyKeyDto[];
  }

  /** 按原币的结算行DTO（用于详情） */
  export interface PaymentSettlementPayAppCurrencyDto {
    /** 付费申请ID。同一申请多币别时多行重复，行 key 请用 rowKey */
    id: string;
    /** 行唯一键，格式 `付费申请id_原币币别id` */
    rowKey: string;
    /** 付费申请ID，与 id 相同 */
    paymentApplicationId: string;
    /** 付费申请单号 */
    applicationNo: string;
    /** 付费申请的所属用户权限ID */
    userId: number;
    /** 申请人昵称（userId 对应用户的 nickName，走用户整表内存缓存） */
    userName?: string;
    /** 付费申请的归属组织ID */
    orgId?: number;
    /** 付费申请的归属组织串 */
    orgs?: PaymentApplicationAdminApi.OrganizationUnitSimpleDto[];
    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
    /** 付费申请的结算对象ID */
    settlementId: string;
    /** 结算对象（含默认地址） */
    settlement?: PaymentApplicationAdminApi.ClientSimpleDtoForOrder;
    /** 付费申请的申请币别ID，null=原币申请 */
    currencyId?: number;
    /** 申请币别对象，原币申请为 null */
    currency?: CurrencySimpleDto;
    /** 原币币别ID */
    originalCurrencyId: number;
    /** 原币币别代码 */
    originalCurrencyCode?: string;
    /** 原币币别对象（替代 originalCurrencyCode，编码读 code） */
    originalCurrency?: CurrencySimpleDto | null;
    /**
     * 本行汇率，来自明细上的汇率快照
     * 固定币别申请取自付费申请明细，原币申请恒为 1
     */
    rate: number;
    /** 本行结算量（原币）= 该组合下所有结算明细 SettledAmount 之和 */
    settledAmount: number;
    /** 本行结算金额（结算币别）= 该组合下各条明细 settledAmount × rate 之和 */
    settledPrice: number;
    /**
     * 本行涉及的费用列表
     * 每条带原币口径的 thisSettledAmount（本次结算量）、settledAmount（已结算量）
     * 以及按本行 rate 折算到结算币别的 thisSettledPrice（本次结算金额）、settledPrice（已结算金额）
     */
    orderFees: OrderFeeDto[];
  }

  /** 付费结算详情DTO（按原币） */
  export interface PaymentSettlementDetailByCurrencyDto {
    id: string;
    creationTime: string;
    creatorUserId?: number;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    userId: number;
    orgId?: number;
    orgs?: PaymentApplicationAdminApi.OrganizationUnitSimpleDto[];
    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;

    settlementNo: string;
    status: number;
    settlementTime: string;
    payType?: number;
    locked: boolean;
    lockeTime?: string;
    settlementId: string;
    currencyId: number;
    orgBankAccountId?: string;
    clientInvoiceBankId?: string;
    transactionFee?: number;
    remark?: string;

    settlement?: PaymentApplicationAdminApi.ClientSimpleDtoForOrder;
    /** 结算币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    creatorUserName?: string;
    lastModifierUserName?: string;
    userName?: string;
    paymentApplicationCurrencies: PaymentSettlementPayAppCurrencyDto[];
    totalSettledPrice: number;
    attachments: AttachmentItemDto[];
    /** 本结算单关联的所有付费申请的附件 */
    paymentApplicationAttachments: AttachmentItemDto[];
  }
}

// ==================== API 函数 ====================

/** 新增付费结算 */
export const addPaymentSettlement = (
  data: PaymentSettlementAdminApi.PaymentSettlementAddDto,
) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

/** 修改主表和汇率 */
export const editPaymentSettlement = (
  data: PaymentSettlementAdminApi.PaymentSettlementEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/** 添加结算明细 */
export const addItemsToSettlement = (
  data: PaymentSettlementAdminApi.PaymentSettlementAddItemsDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/AddItemsAsync`, data);
};

/** 删除结算明细 */
export const deleteItemsFromSettlement = (
  data: PaymentSettlementAdminApi.PaymentSettlementDeleteItemsDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/DeleteItemsAsync`, data);
};

/** 删除付费结算 */
export const deletePaymentSettlement = (
  data: PaymentSettlementAdminApi.PaymentSettlementDeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data,
  });
};

/** 获取付费结算分页列表 */
export const getPaymentSettlementPagedList = (
  params: PaymentSettlementAdminApi.PaymentSettlementQueryDto,
) => {
  return requestClient.get<
    PaymentSettlementAdminApi.PagedList<PaymentSettlementAdminApi.PaymentSettlementListDto>
  >(`${API_PREFIX}/GetPagedListAsync`, {
    params,
    // keys 为 List<string>，ABP [FromQuery] 绑定要求 repeat：keys=a&keys=b
    paramsSerializer: 'repeat',
  });
};

/** 锁定付费结算 */
export const lockPaymentSettlement = (
  data: PaymentSettlementAdminApi.PaymentSettlementLockDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/LockAsync`, data);
};

/** 解锁付费结算 */
export const unlockPaymentSettlement = (
  data: PaymentSettlementAdminApi.PaymentSettlementLockDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/UnLockAsync`, data);
};

// ==================== 按原币和付费申请相关 API ====================
// 注意：这是一整套与原有接口并存的接口，把付费结算全流程的粒度从「一条付费申请」下沉到「一条付费申请 + 一个原币币别」
// 汇率规则（2026-08-10 变更）：所有写接口的 paymentSettlementRates 入参已删除，汇率一律由后端从付费申请取

/**
 * 获取按原币的付费申请选择列表
 *
 * 权限：Admin_PaymentApplication_Get
 *
 * 过滤口径与 GetPagedListForSettlementAsync 完全一致，只是把原来行内的 currencyGroup[] 拍平，
 * 每个币别单独成行，分页也按展开后的行数算。
 *
 * @param params 查询参数，必须包含 settlementCurrencyId（结算单的结算币别）
 * @returns 返回展开后的「付费申请+原币币别」组合行列表
 */
export const getPaymentApplicationPagedListByCurrencyForSettlement = (
  params: PaymentApplicationAdminApi.PaymentApplicationSettlementQueryParams,
) => {
  return requestClient.get<
    PaymentSettlementAdminApi.PagedList<PaymentSettlementAdminApi.PaymentApplicationCurrencyForSettlementDto>
  >(
    `${API_PREFIX.replace('PaymentSettlementAdmin', 'PaymentApplicationAdmin')}/GetPagedListByCurrencyForSettlementAsync`,
    // keys 为 List<string>，ABP [FromQuery] 绑定要求 repeat：keys=a&keys=b
    { params, paramsSerializer: 'repeat' },
  );
};

/**
 * 新增付费结算（按原币）
 *
 * 权限：Admin_PaymentSettlement_Add
 *
 * 与原有的 AddAsync 接口并存，使用一层结构的 paymentApplicationCurrencyItems 替代两层结构的 paymentApplicationGroups[].currencyItems[]
 * 不支持按总额自动分摊，每行都要给本行的 settledPrice
 *
 * @param data 新增参数，paymentApplicationCurrencyItems 必填
 * @returns 返回新建的付费结算ID
 */
export const addPaymentSettlementByCurrency = (
  data: PaymentSettlementAdminApi.PaymentSettlementAddByCurrencyDto,
) => {
  return requestClient.post<string>(`${API_PREFIX}/AddByCurrencyAsync`, data);
};

/**
 * 添加结算明细（按原币）
 *
 * 权限：Admin_PaymentSettlement_Edit
 *
 * 与原有的 AddItemsAsync 接口并存，按「付费申请+原币币别」组合判重
 * 同一付费申请的另一个原币币别可以追加进来，只有完全相同的组合才报错
 *
 * @param data 添加参数，包含付费结算ID和要添加的结算行列表
 * @returns 固定返回 true
 */
export const addItemsToSettlementByCurrency = (
  data: PaymentSettlementAdminApi.PaymentSettlementAddItemsByCurrencyDto,
) => {
  return requestClient.post<boolean>(
    `${API_PREFIX}/AddItemsByCurrencyAsync`,
    data,
  );
};

/**
 * 删除结算明细（按原币）
 *
 * 权限：Admin_PaymentSettlement_Edit
 *
 * 与原有的 DeleteItemsAsync 接口并存，按「付费申请+原币币别」组合删除
 * 可以只删掉某个付费申请的某一个原币币别，该申请的其余币别保留在结算单里
 *
 * @param data 删除参数，包含付费结算ID和要删除的组合列表
 * @returns 固定返回 true
 */
export const deleteItemsFromSettlementByCurrency = (
  data: PaymentSettlementAdminApi.PaymentSettlementDeleteItemsByCurrencyDto,
) => {
  return requestClient.post<boolean>(
    `${API_PREFIX}/DeleteItemsByCurrencyAsync`,
    data,
  );
};

/**
 * 获取付费结算详情（按原币）
 *
 * 权限：Admin_PaymentSettlement_Get
 *
 * 与原有的 DetailAsync 接口并存，返回一维的 paymentApplicationCurrencies 列表
 * 每行一个「付费申请+原币币别」组合，结构与选择列表一致
 *
 * @param id 付费结算ID
 * @returns 返回付费结算详情，包含按原币分组的结算行列表
 */
export const getPaymentSettlementDetailByCurrency = (id: string) => {
  return requestClient.get<PaymentSettlementAdminApi.PaymentSettlementDetailByCurrencyDto>(
    `${API_PREFIX}/DetailByCurrencyAsync`,
    { params: { id } },
  );
};
