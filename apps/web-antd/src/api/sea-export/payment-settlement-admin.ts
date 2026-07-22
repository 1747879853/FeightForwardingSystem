import { requestClient } from '#/api/request';
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

const API_PREFIX = '/services/app/PaymentSettlementAdmin';

export namespace PaymentSettlementAdminApi {
  /**
   * 付费结算模块接口定义
   *
   * 所有接口均需要登录认证
   */

  // ==================== DTO 定义 ====================

  /** 汇率添加DTO */
  export interface PaymentSettlementRateAddDto {
    /** 原币币别ID */
    originalCurrencyId: number;
    /** 汇率（原币对结算币别） */
    rate: number;
  }

  /** 汇率DTO */
  export interface PaymentSettlementRateDto extends PaymentSettlementRateAddDto {
    /** 汇率ID */
    id: string;
    /** 付费结算ID */
    paymentSettlementId: string;
    /** 原币币别代码 */
    originalCurrencyCode: string;
  }

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
    /** 汇率列表 */
    paymentSettlementRates: PaymentSettlementRateAddDto[];
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
    /** 汇率列表（全量替换） */
    paymentSettlementRates: PaymentSettlementRateAddDto[];
    /** 附件列表（全量替换） */
    attachments?: AttachmentItemForItemInputDto[];
  }

  /** 添加结算明细参数DTO */
  export interface PaymentSettlementAddItemsDto {
    /** 付费结算ID */
    id: string;
    /** 新增的付费申请结算列表 */
    paymentApplicationGroups: PaymentSettlementAddItemGroupDto[];
    /** 汇率列表（全量替换，需包含新增后所有币别） */
    paymentSettlementRates: PaymentSettlementRateAddDto[];
  }

  /** 删除结算明细参数DTO */
  export interface PaymentSettlementDeleteItemsDto {
    /** 付费结算ID */
    id: string;
    /** 要删除的付费申请ID列表（删除该结算单中属于这些付费申请的所有结算明细） */
    paymentApplicationIds: string[];
    /** 汇率列表（全量替换，需包含删除后剩余的所有币别） */
    paymentSettlementRates: PaymentSettlementRateAddDto[];
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
    /** 费用代码名称 */
    feeCodeName?: string;
    /** 币别代码 */
    currencyCode?: string;
    /** 结算对象名称 */
    settlementName?: string;
    /** 含税单价 */
    unitPrice?: number;
    /** 金额 */
    amount?: number;
    /** 单位 */
    unit?: string;
    /** 数量 */
    quantity?: number;
    /** 已结算金额 */
    settledAmount?: number;
    /** 未结算金额 */
    unSettledAmount?: number;
    /** 收付类型 */
    paySide?: number;
    /** 费用状态 */
    feeStatus?: number;
    /** 备注 */
    remark?: string;
    /** 本次结算量（该费用在本次结算中的结算量） */
    thisSettledAmount?: number;
    /** 未开票金额 */
    unInvoicedAmount?: number;
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
  }

  /** 币别分组DTO（用于详情中的分组展示，包含结算信息） */
  export interface CurrencyGroupForDetailDto {
    /** 币别ID */
    id: number;
    /** 币别代码 */
    code?: string;
    /** 本次该币别的结算量（原币）= 该币别下所有费用的结算量之和 */
    settledAmount?: number;
    /** 本次该币别的结算金额（结算币别）= settledAmount × 汇率 */
    settledPrice?: number;
    /** 该币别下的费用列表（含本次结算量） */
    orderFees: OrderFeeDto[];
  }

  /** 付费申请分组DTO（用于详情中的分组展示，包含结算信息） */
  export interface PaymentApplicationForDetailDto {
    /** 付费申请ID */
    id: string;
    /** 付费申请单号 */
    applicationNo: string;
    /** 本条付费申请的总结算金额（结算币别）= 各币别 SettledPrice 之和 */
    totalSettledPrice?: number;
    /** 按币别分组的结算明细 */
    currencyGroup: CurrencyGroupForDetailDto[];
  }

  /** 结算明细详情DTO */
  export interface PaymentSettlementItemDetailDto {
    /** 结算明细ID */
    id: string;
    /** 付费结算ID */
    paymentSettlementId: string;
    /** 付费申请明细ID */
    paymentApplicationItemId: string;
    /** 付费申请ID */
    paymentApplicationId: string;
    /** 费用ID */
    orderFeeId: string;
    /** 原币币别ID */
    originalCurrencyId: number;
    /** 本次结算原币金额 */
    settledAmount: number;
    /** 汇率快照 */
    rate: number;
    /** 备注 */
    remark?: string;
    /** 结算币别金额 = settledAmount × rate */
    settledPrice: number;
    /** 原币币别代码 */
    originalCurrencyCode: string;
    /** 付费申请单号 */
    applicationNo: string;
    /** 该付费申请明细剩余申请量（原币） */
    remainingAppliedAmount: number;
    /** 费用剩余结算量（原币） */
    remainingFeeAmount: number;
    /** 费用详情 */
    orderFee: OrderFeeDto;
  }

  /** 付费结算详情DTO */
  export interface PaymentSettlementDetailDto {
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
    /** 结算对象名称 */
    settlementName: string;
    /** 结算币别代码 */
    currencyCode: string;
    /** 创建人名称 */
    creatorUserName: string;
    /** 汇率明细 */
    paymentSettlementRates: PaymentSettlementRateDto[];
    /** 结算明细（扁平列表） */
    paymentSettlementItems: PaymentSettlementItemDetailDto[];
    /** 按付费申请分组的结算明细 */
    paymentApplications: PaymentApplicationForDetailDto[];
    /** 附件列表 */
    attachments: AttachmentItemDto[];
    /** 归属组织id */
    orgId?: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?:
      | import('#/api/settlement-management/payment-application-admin').PaymentApplicationAdminApi.OrganizationUnitSimpleDto[]
      | null;
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
    /** 费用对应业务的主提单号（模糊） */
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
    /** 原币币别代码 */
    originalCurrencyCode: string;
    /** 该币别结算量合计（原币） */
    totalSettledAmount: number;
    /** 汇率 */
    rate: number;
    /** 该币别结算金额合计（结算币别） */
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
    /** 结算对象名称 */
    settlementName: string;
    /** 结算币别代码 */
    currencyCode: string;
    /** 创建人名称 */
    creatorUserName: string;
    /** 结算金额合计（结算币别）= SUM(settledAmount × rate) */
    totalSettledPrice: number;
    /** 原始币别汇总列表 */
    currencySumList: CurrencySumDto[];
    /** 付费申请简要列表（id + 单号） */
    paymentApplications: PayAppSimpleDto[];
    /** 费用简要列表（id + 主提单号） */
    orderFees: FeeSimpleDto[];
  }

  /** 分页列表响应 */
  export interface PagedList<T> {
    totalCount: number;
    items: T[];
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

/** 获取付费结算详情 */
export const getPaymentSettlementDetail = (id: string) => {
  return requestClient.get<PaymentSettlementAdminApi.PaymentSettlementDetailDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { id } },
  );
};

/** 获取付费结算分页列表 */
export const getPaymentSettlementPagedList = (
  params: PaymentSettlementAdminApi.PaymentSettlementQueryDto,
) => {
  return requestClient.get<
    PaymentSettlementAdminApi.PagedList<PaymentSettlementAdminApi.PaymentSettlementListDto>
  >(`${API_PREFIX}/GetPagedListAsync`, { params });
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
