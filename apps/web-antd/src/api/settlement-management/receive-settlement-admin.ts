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

  export interface TransportOrderPortDto {
    portName?: null | string;
    cnName?: null | string;
    /** 空运机场三字码 */
    iataCode?: null | string;
    enName?: null | string;
  }

  export interface TransportOrderCarrierDto {
    code?: null | string;
    cnShortName?: null | string;
    cnName?: null | string;
  }

  /** 海运出口 / 海运进口 / 空运 / 件杂货上的船公司与港口，非当前类型为 null */
  export interface TransportOrderBizSliceDto {
    carrier?: null | TransportOrderCarrierDto;
    pol?: null | TransportOrderPortDto;
    pod?: null | TransportOrderPortDto;
  }

  export interface TransportOrderSimpleDto {
    id: string;
    commissionNum?: string;
    mblNum?: string;
    bookingNum?: string;
    /** 开船日期，没有时为 null */
    etd?: null | string;
    /** 箱型箱量合计，如 20GP*2 40HQ*1；空运、件杂货或未录箱子时为 null */
    totalCtn?: null | string;
    seaExport?: null | TransportOrderBizSliceDto;
    seaImport?: null | TransportOrderBizSliceDto;
    airExport?: null | TransportOrderBizSliceDto;
    breakBulk?: null | TransportOrderBizSliceDto;
    /** 委托单位对象（替代 clientName） */
    client?: ClientSimpleDto | null;

    // === 整票结算状态字段（客户对账接口使用） ===
    /** 应收整票结算状态（按该业务下全部应收费用汇总） */
    recSettlementStatus?: number | null;
    /** 应付整票结算状态（本次不赋值，恒为 null，预留字段） */
    paySettlementStatus?: number | null;

    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
  }

  export interface ReceiveSettlementExchangeRateInputDto {
    /** 原币币别。与银行流水同币别可不传，后端恒为 1 */
    currencyId: number | string;
    /** 1 单位原币折合多少银行流水币别 */
    exchangeRate?: number;
  }

  export interface ReceiveSettlementFeeDto {
    id: string;
    /** 费用代码对象（替代 feeCodeName，名称读 cnName） */
    feeCode?: FeeCodeSimpleDto | null;
    /** 费用币别 ID（原币） */
    currencyId?: number | string;
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
    /** 编号：模糊匹配委托编号 / 主提单号 */
    keyword?: string;
    commissionNum?: string;
    mblNum?: string;
    /** 客户对账单号（模糊）；只返回命中对账单里的费用 */
    statementNum?: string;
    /** 委托单位 */
    clientId?: string;
    etdStart?: string;
    etdEnd?: string;
    saleIds?: Array<number | string>;
    operatorIds?: Array<number | string>;
    /** 收付类型：0 应收，1 应付；不传为全部 */
    paySide?: PaySide;
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
    /** 本次结算：实际到账金额（银行流水币别） */
    actualSettled: number;
    remark?: string;
    receiveSettlementItems: ReceiveSettlementItemAddDto[];
    /** 与银行流水币别不同的每个费用币别都要给汇率 */
    receiveSettlementExchangeRates?: ReceiveSettlementExchangeRateInputDto[];
  }

  export interface ReceiveSettlementAddItemsDto {
    id: string;
    /** 追加之后整张收费结算的本次结算（银行流水币别），覆盖原值 */
    actualSettled: number;
    receiveSettlementItems: ReceiveSettlementItemAddDto[];
    receiveSettlementExchangeRates?: ReceiveSettlementExchangeRateInputDto[];
  }

  export interface ReceiveSettlementDeleteItemsDto {
    id: string;
    /** 删除后还剩明细时必填；明细全部删掉时不传，后端置 0 */
    actualSettled?: number;
    receiveSettlementItemIds: string[];
  }

  export interface ReceiveSettlementEditDto {
    id: string;
    /** 归属组织id */
    orgId: number;
    settlementTime: string;
    /** 本次结算（银行流水币别）。不传不修改；没有明细时只能为 0 */
    actualSettled?: number;
    remark?: string;
    /** 仅按费用结算生效 */
    receiveSettlementExchangeRates?: ReceiveSettlementExchangeRateInputDto[];
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

    /** 组合费用状态（计算字段，非数据库列） */
    combinedFeeStatus?: number;
  }

  /** 一张发票开出下合并后的费用行（详情） */
  export interface ReceiveSettlementInvoiceFeeDto {
    orderFeeId: string;
    /** 本次结算金额（费用原币，收付都为正数） */
    settledAmount: number;
    /** 该费用在这张发票开出下的开票金额之和 */
    appliedAmount: number;
    /** 1 单位费用币别折合多少发票开出币别；缺汇率时为 null */
    exchangeRate?: null | number;
    /** 本行折成发票开出币别的金额，与 settledAmount 同号；缺汇率时为 null */
    originalSettledAmount?: null | number;
    remark?: string;
    orderFee?: OrderFeeDto;
    transportOrder?: TransportOrderSimpleDto;
  }

  /** 按发票结算详情里的一张发票开出 */
  export interface ReceiveSettlementInvoiceIssueDto {
    /** 发票开出 ID。null 表示已冲红解绑、不再挂在发票开出上 */
    id?: null | string;
    applicationNo?: string;
    invoiceNo?: string;
    invoiceIssueTime?: string;
    currencyId?: null | number | string;
    currency?: CurrencySimpleDto | null;
    /** 本单在这张发票下的原始结算金额；有费用行算不出时为 null */
    originalSettledAmount?: null | number;
    items?: ReceiveSettlementInvoiceFeeDto[];
  }

  export interface ReceiveSettlementExchangeRateDto {
    id?: string;
    currencyId: number | string;
    exchangeRate: number;
    currency?: CurrencySimpleDto | null;
    /** 本单该币别明细的原币净额（收−付） */
    netSettledAmount?: number;
  }

  /** 列表上按发票结算的发票开出简要 */
  export interface ReceiveSettlementInvoiceIssueSimpleDto {
    id?: string;
    applicationNo?: string;
    invoiceNo?: string;
  }

  export interface ReceiveSettlementItemDetailDto {
    id: string;
    receiveSettlementId: string;
    orderFeeId: string;
    settledAmount: number;
    /** 原始结算金额（银行流水币别）；缺汇率时为 null */
    originalSettledAmount?: null | number;
    exchangeRate?: null | number;
    remark?: string;
    orderFee?: OrderFeeDto;
    transportOrder?: TransportOrderSimpleDto;
  }

  export interface ReceiveSettlementDetailDto {
    id: string;
    bankStatementId: string;
    /** 归属组织id */
    orgId?: null | number;
    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
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
    /** 本次结算：实际到账金额（银行流水币别） */
    actualSettled?: number;
    /** 原始结算金额（银行流水币别）；缺汇率时为 null */
    originalSettledAmount?: null | number;
    /** 差值 = 本次结算 − 原始结算金额 */
    diffAmount?: null | number;
    receiveSettlementExchangeRates?: ReceiveSettlementExchangeRateDto[];
    receiveSettlementItems: ReceiveSettlementItemDetailDto[];
    /** 按发票结算明细，发票开出 → 费用。type=0 时为 null */
    invoiceIssues?: null | ReceiveSettlementInvoiceIssueDto[];
  }

  export interface ReceiveSettlementListDto {
    id: string;
    bankStatementId: string;
    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
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
    /** 本次结算：实际到账金额（银行流水币别） */
    actualSettled?: number;
    /** 原始结算金额（银行流水币别）；缺汇率时为 null */
    originalSettledAmount?: null | number;
    /** 差值 = 本次结算 − 原始结算金额 */
    diffAmount?: null | number;
    /** 按发票结算时本单的发票开出；按费用结算为空 */
    invoiceIssues?: null | ReceiveSettlementInvoiceIssueSimpleDto[];
    itemCount: number;
    creationTime?: string;
  }

  /** 按发票开出分组拉取可结算明细查询 */
  export interface InvoiceIssueSettleQueryDto {
    receiveSettlementId?: string;
    /** 发票开出的开出单号（模糊） */
    applicationNo?: string;
    invoiceNo?: string;
    settlementId?: string;
    currencyId?: number;
    /** 归属组织id（含下属组织） */
    orgId?: number;
    invoiceIssueTimeStart?: string;
    invoiceIssueTimeEnd?: string;
    onlySettleable?: boolean;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }

  /** 一张发票开出下合并后的可结算费用 */
  export interface InvoiceIssueSettleItemDto {
    orderFeeId: string;
    feeCode?: FeeCodeSimpleDto | null;
    currency?: CurrencySimpleDto | null;
    paySide: PaySide;
    amount: number;
    /** 这张发票开出对该费用的开票金额合计 */
    appliedAmount: number;
    /** 1 单位费用币别折合多少发票开出币别；缺汇率时为 null */
    exchangeRate?: null | number;
    invoicedAmount: number;
    /** 该费用历史累计已结算金额，不是本次要结的金额 */
    settledAmount: number;
    /** 剩余可结算额度，同一费用在多张发票开出下共用 */
    invoiceSettleableAmount: number;
    settlement?: ClientSimpleDto | null;
    transportOrder?: TransportOrderSimpleDto;
  }

  /** 按发票开出分组（一组 = 一张发票开出） */
  export interface InvoiceIssueSettleGroupDto {
    invoiceIssueId: string;
    applicationNo?: string;
    invoiceNo?: string;
    invoiceIssueTime?: string;
    settlementId: string;
    settlement?: ClientSimpleDto | null;
    currencyId: number;
    currency?: CurrencySimpleDto | null;
    items: InvoiceIssueSettleItemDto[];
  }

  /** 按发票结算的一行：发票开出 + 费用 */
  export interface ReceiveSettlementByInvoiceItemDto {
    invoiceIssueId: string;
    orderFeeId: string;
    /** 本次结算金额（费用原币，收付都为正数） */
    settledAmount: number;
    remark?: string;
  }

  export interface ReceiveSettlementAddByInvoiceDto {
    /** 归属组织id */
    orgId: number;
    bankStatementId: string;
    settlementTime: string;
    /** 本次结算（银行流水币别） */
    actualSettled: number;
    remark?: string;
    items: ReceiveSettlementByInvoiceItemDto[];
  }

  export interface ReceiveSettlementAddItemsByInvoiceDto {
    id: string;
    /** 追加之后整张单的本次结算（银行流水币别） */
    actualSettled: number;
    items: ReceiveSettlementByInvoiceItemDto[];
  }

  /** 删除按发票结算明细时的一行：发票开出 + 费用 */
  export interface ReceiveSettlementByInvoiceKeyDto {
    /** 所在发票开出 ID。无发票开出的那一组传 null */
    invoiceIssueId?: null | string;
    orderFeeId: string;
  }

  export interface ReceiveSettlementDeleteInvoiceItemsDto {
    id: string;
    /** 删除后还剩明细时必填；明细全部删掉时不传，后端置 0 */
    actualSettled?: number;
    items: ReceiveSettlementByInvoiceKeyDto[];
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
  >(`${API_ADMIN_PREFIX}/GetOrderFeeGroupAsync`, {
    params,
    paramsSerializer: 'repeat',
  });
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

/** 按发票开出分组拉取可结算明细 */
export const getInvoiceIssueGroupForSettlement = (
  params: ReceiveSettlementAdminApi.InvoiceIssueSettleQueryDto,
) => {
  return requestClient.get<
    ReceiveSettlementAdminApi.PagedList<ReceiveSettlementAdminApi.InvoiceIssueSettleGroupDto>
  >(`${API_ADMIN_PREFIX}/GetInvoiceIssueGroupForSettlementAsync`, {
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
