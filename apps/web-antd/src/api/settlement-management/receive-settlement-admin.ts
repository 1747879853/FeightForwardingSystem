import { requestClient } from '#/api/request';

const API_ADMIN_PREFIX = '/services/app/ReceiveSettlementAdmin';

export namespace ReceiveSettlementAdminApi {
  export interface PagedList<T> {
    totalCount: number;
    items: T[];
  }

  /** 收付方向枚举 */
  export enum PaySide {
    Receive = 0,
    Pay = 1,
  }

  /** 结算类型枚举：0 按费用(按业务)，1 按开票申请 */
  export enum ReceiveSettlementType {
    ByFee = 0,
    ByInvoiceApplication = 1,
  }

  export interface TransportOrderSimpleDto {
    id: string;
    commissionNum?: string;
    mblNum?: string;
    bookingNum?: string;
    /** 委托单位对象（替代 clientName） */
    client?: ClientSimpleDto | null;
  }

  export interface ReceiveSettlementFeeDto {
    id: string;
    /** 费用代码对象（替代 feeCodeName，名称读 cnName） */
    feeCode?: FeeCodeSimpleDto | null;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    paySide?: PaySide;
    amount: number;
    remainingAmount: number;
    /** 结算对象（替代 settlementName） */
    settlement?: ClientSimpleDto | null;
  }

  export interface ReceiveSettlementFeeGroupDto {
    transportOrder: TransportOrderSimpleDto;
    orderFees: ReceiveSettlementFeeDto[];
  }

  export interface ReceiveSettlementFeeGroupQueryDto {
    receiveSettlementId?: string;
    settlementId?: string;
    currencyId?: number;
    commissionNum?: string;
    mblNum?: string;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }

  export interface ReceiveSettlementItemAddDto {
    orderFeeId: string;
    settledAmount: number;
    remark?: string;
  }

  export interface ReceiveSettlementAddDto {
    /** 归属组织id */
    orgId: number;
    bankStatementId: string;
    settlementTime: string;
    remark?: string;
    receiveSettlementItems: ReceiveSettlementItemAddDto[];
  }

  export interface ReceiveSettlementAddItemsDto {
    id: string;
    receiveSettlementItems: ReceiveSettlementItemAddDto[];
  }

  export interface ReceiveSettlementDeleteItemsDto {
    id: string;
    receiveSettlementItemIds: string[];
  }

  export interface ReceiveSettlementEditDto {
    id: string;
    /** 归属组织id */
    orgId: number;
    settlementTime: string;
    remark?: string;
  }

  export interface ReceiveSettlementDeleteDto {
    id: string;
  }

  export interface ReceiveSettlementLockDto {
    id: string;
  }

  /** 费用代码简要对象 */
  export interface FeeCodeSimpleDto {
    id?: number;
    code?: string;
    cnName?: string;
    enName?: string;
  }

  /** 币别简要对象 */
  export interface CurrencySimpleDto {
    id?: number;
    code?: string;
    cnName?: string;
    enName?: string;
  }

  /** 客户简要对象 */
  export interface ClientSimpleDto {
    id?: string;
    name?: string;
    code?: string;
    fullName?: string;
    enName?: string;
  }

  export interface OrderFeeDto {
    id: string;
    /** 费用代码对象（替代 feeCodeName / feeCodeCode） */
    feeCode?: FeeCodeSimpleDto | null;
    /** 币别对象（替代 currencyName / currencyCode） */
    currency?: CurrencySimpleDto | null;
    /** 结算对象（替代 settlementName / settlementCode） */
    settlement?: ClientSimpleDto | null;
    paySide?: PaySide;
    amount?: number;
    remainingAmount?: number;
    remark?: string;
  }

  /** 按开票申请结算明细（详情） */
  export interface ReceiveSettlementInvoiceItemDetailDto {
    id: string;
    receiveSettlementId: string;
    invoiceApplicationId: string;
    invoiceApplicationItemId: string;
    orderFeeId: string;
    settledAmount: number;
    remark?: string;
    applicationNo?: string;
    invoiceNo?: string;
    appliedAmount: number;
    orderFee?: OrderFeeDto;
    transportOrder?: TransportOrderSimpleDto;
  }

  export interface ReceiveSettlementItemDetailDto {
    id: string;
    receiveSettlementId: string;
    orderFeeId: string;
    settledAmount: number;
    remark?: string;
    orderFee?: OrderFeeDto;
    transportOrder?: TransportOrderSimpleDto;
  }

  export interface ReceiveSettlementDetailDto {
    id: string;
    bankStatementId: string;
    /** 归属组织id */
    orgId?: null | number;
    settlementNo?: string;
    status: number;
    /** 结算类型 0 按费用(按业务) 1 按开票申请 */
    type: number;
    settlementTime: string;
    locked: boolean;
    lockeTime?: string;
    remark?: string;
    creatorUserName?: string;
    creatorUserNickName?: string;
    lastModifierUserNickName?: string;
    bankStatementNo?: string;
    /** 结算总额（净额 = Σ收明细 − Σ付明细，跨两种子表） */
    totalSettledAmount: number;
    receiveSettlementItems: ReceiveSettlementItemDetailDto[];
    receiveSettlementInvoiceItems: ReceiveSettlementInvoiceItemDetailDto[];
  }

  export interface ReceiveSettlementListDto {
    id: string;
    bankStatementId: string;
    settlementNo?: string;
    status: number;
    /** 结算类型 0 按费用(按业务) 1 按开票申请 */
    type: number;
    settlementTime: string;
    locked: boolean;
    lockeTime?: string;
    remark?: string;
    creatorUserName?: string;
    creatorUserNickName?: string;
    lastModifierUserNickName?: string;
    bankStatementNo?: string;
    totalSettledAmount: number;
    itemCount: number;
    creationTime?: string;
  }

  /** 按开票申请分组拉取可结算明细查询 */
  export interface InvoiceAppSettleQueryDto {
    receiveSettlementId?: string;
    applicationNo?: string;
    invoiceNo?: string;
    settlementId?: string;
    currencyId?: number;
    /** 归属组织id（含下属组织） */
    orgId?: number;
    applyTimeStart?: string;
    applyTimeEnd?: string;
    onlySettleable?: boolean;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }

  /** 按开票申请分组下的可结算费用明细 */
  export interface InvoiceAppSettleItemDto {
    invoiceApplicationItemId: string;
    orderFeeId: string;
    /** 费用代码对象（替代 feeCodeName，名称读 cnName） */
    feeCode?: FeeCodeSimpleDto | null;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    paySide: PaySide;
    amount: number;
    appliedAmount: number;
    invoicedAmount: number;
    settledAmount: number;
    invoiceSettleableAmount: number;
    /** 结算对象（替代 settlementName） */
    settlement?: ClientSimpleDto | null;
    transportOrder?: TransportOrderSimpleDto;
  }

  /** 按开票申请分组（一组 = 一个已开票的开票申请） */
  export interface InvoiceAppSettleGroupDto {
    invoiceApplicationId: string;
    applicationNo?: string;
    invoiceNo?: string;
    settlementId: string;
    /** 结算对象（替代 settlementName） */
    settlement?: ClientSimpleDto | null;
    currencyId: number;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    applyTime: string;
    items: InvoiceAppSettleItemDto[];
  }

  /** 按开票申请结算的单条明细入参（逐条开票明细） */
  export interface ReceiveSettlementByInvoiceItemDto {
    invoiceApplicationItemId: string;
    settledAmount: number;
    remark?: string;
  }

  export interface ReceiveSettlementAddByInvoiceDto {
    /** 归属组织id */
    orgId: number;
    bankStatementId: string;
    settlementTime: string;
    remark?: string;
    items: ReceiveSettlementByInvoiceItemDto[];
  }

  export interface ReceiveSettlementAddItemsByInvoiceDto {
    id: string;
    items: ReceiveSettlementByInvoiceItemDto[];
  }

  export interface ReceiveSettlementDeleteInvoiceItemsDto {
    id: string;
    receiveSettlementInvoiceItemIds: string[];
  }

  export interface ReceiveSettlementQueryDto {
    bankStatementId?: string;
    settlementNo?: string;
    settlementTimeStart?: string;
    settlementTimeEnd?: string;
    creatorUserId?: number;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }
}

export const getOrderFeeGroupForReceiveSettlement = (
  params: ReceiveSettlementAdminApi.ReceiveSettlementFeeGroupQueryDto,
) => {
  return requestClient.get<
    ReceiveSettlementAdminApi.PagedList<ReceiveSettlementAdminApi.ReceiveSettlementFeeGroupDto>
  >(`${API_ADMIN_PREFIX}/GetOrderFeeGroupAsync`, { params });
};

export const addReceiveSettlement = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementAddDto,
) => {
  return requestClient.post<string>(`${API_ADMIN_PREFIX}/AddAsync`, data);
};

export const addReceiveSettlementItems = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementAddItemsDto,
) => {
  return requestClient.post<boolean>(`${API_ADMIN_PREFIX}/AddItemsAsync`, data);
};

export const deleteReceiveSettlementItems = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementDeleteItemsDto,
) => {
  return requestClient.post<boolean>(
    `${API_ADMIN_PREFIX}/DeleteItemsAsync`,
    data,
  );
};

export const editReceiveSettlement = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementEditDto,
) => {
  return requestClient.put<boolean>(`${API_ADMIN_PREFIX}/EditAsync`, data);
};

export const deleteReceiveSettlement = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementDeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_ADMIN_PREFIX}/DeleteAsync`, {
    data,
  });
};

export const getReceiveSettlementDetail = (id: string) => {
  return requestClient.get<ReceiveSettlementAdminApi.ReceiveSettlementDetailDto>(
    `${API_ADMIN_PREFIX}/DetailAsync`,
    { params: { id } },
  );
};

export const getReceiveSettlementPagedList = (
  params: ReceiveSettlementAdminApi.ReceiveSettlementQueryDto,
) => {
  return requestClient.get<
    ReceiveSettlementAdminApi.PagedList<ReceiveSettlementAdminApi.ReceiveSettlementListDto>
  >(`${API_ADMIN_PREFIX}/GetPagedListAsync`, { params });
};

export const lockReceiveSettlement = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementLockDto,
) => {
  return requestClient.put<boolean>(`${API_ADMIN_PREFIX}/LockAsync`, data);
};

export const unlockReceiveSettlement = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementLockDto,
) => {
  return requestClient.put<boolean>(`${API_ADMIN_PREFIX}/UnLockAsync`, data);
};

/** 按开票申请分组拉取可结算明细 */
export const getInvoiceApplicationGroupForSettlement = (
  params: ReceiveSettlementAdminApi.InvoiceAppSettleQueryDto,
) => {
  return requestClient.get<
    ReceiveSettlementAdminApi.PagedList<ReceiveSettlementAdminApi.InvoiceAppSettleGroupDto>
  >(`${API_ADMIN_PREFIX}/GetInvoiceApplicationGroupForSettlementAsync`, {
    params,
  });
};

/** 按开票申请新建收费核销（type=1） */
export const addReceiveSettlementByInvoiceApplication = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementAddByInvoiceDto,
) => {
  return requestClient.post<string>(
    `${API_ADMIN_PREFIX}/AddByInvoiceApplicationAsync`,
    data,
  );
};

/** 按开票申请向已有收费核销追加明细 */
export const addReceiveSettlementItemsByInvoiceApplication = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementAddItemsByInvoiceDto,
) => {
  return requestClient.post<boolean>(
    `${API_ADMIN_PREFIX}/AddItemsByInvoiceApplicationAsync`,
    data,
  );
};

/** 删除按开票申请结算明细 */
export const deleteReceiveSettlementInvoiceItems = (
  data: ReceiveSettlementAdminApi.ReceiveSettlementDeleteInvoiceItemsDto,
) => {
  return requestClient.post<boolean>(
    `${API_ADMIN_PREFIX}/DeleteInvoiceItemsAsync`,
    data,
  );
};
