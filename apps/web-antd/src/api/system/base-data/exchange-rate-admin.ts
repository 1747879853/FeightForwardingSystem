import { requestClient } from '#/api/request';

export namespace ExchangeRateAdminApi {
  /** 币别简易对象 */
  export interface CurrencySimpleDto {
    id?: number | string;
    code?: string;
    cnName?: string;
    enName?: string;
  }

  /** 新增汇率参数 */
  export interface ExchangeRateAddDto {
    /** 币别Id（大数经 json-bigint 解析为 string，需原样透传） */
    currencyId?: number | string;
    drValue?: number;
    crValue?: number;
    /** 提成汇率，提成单折算专用，收付共用 */
    commissionValue?: number;
    customValue?: number;
    calculateValue?: number;
    invoiceValue?: number;
    startDate?: string;
    endDate?: string;
    /** 本位币Id（必填，不可与币别相同） */
    localCurrencyId?: number | string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑汇率参数 */
  export interface ExchangeRateEditDto {
    /** 汇率Id（大数经 json-bigint 解析为 string，需原样透传） */
    id: number | string;
    /** 币别Id（大数经 json-bigint 解析为 string，需原样透传） */
    currencyId?: number | string;
    drValue?: number;
    crValue?: number;
    /** 提成汇率，提成单折算专用，收付共用 */
    commissionValue?: number;
    customValue?: number;
    calculateValue?: number;
    invoiceValue?: number;
    startDate?: string;
    endDate?: string;
    /** 本位币Id（必填，不可与币别相同） */
    localCurrencyId?: number | string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 汇率详情 */
  export interface ExchangeRateDto {
    /** 汇率Id（大数经 json-bigint 解析为 string） */
    id: number | string;
    currencyId?: number | string;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    drValue?: number;
    crValue?: number;
    /** 提成汇率，提成单折算专用，收付共用 */
    commissionValue?: number;
    customValue?: number;
    calculateValue?: number;
    invoiceValue?: number;
    startDate?: string;
    endDate?: string;
    /** 本位币Id */
    localCurrencyId?: number | string;
    /** 本位币对象（折算的对家，注意与 currency 区分） */
    localCurrency?: CurrencySimpleDto | null;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfExchangeRateDto {
    items: ExchangeRateDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    /** 关键字，匹配币别代码、本位币代码、备注 */
    Keyword?: string;
    CurrencyId?: number | string;
    /** 本位币Id筛选 */
    LocalCurrencyId?: number | string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  /** 业务主单简易信息（同步费用汇率预览用） */
  export interface TransportOrderSimpleDto {
    /** 业务主单id */
    id?: string;
    /** 业务类型 */
    bizType?: number;
    /** 委托编号 */
    commissionNum?: string | null;
    /** 主提单号 */
    mblNum?: string | null;
    /** 委托单位名称 */
    clientName?: string | null;
    /** 主单会计期间 */
    accountDate?: string | null;
  }

  /** 可/不可同步的票 */
  export interface ExchangeRateSyncTicketDto {
    /** 业务主单id */
    transportOrderId: string;
    /** 更改单id，为空代表主单原票 */
    changeOrderId?: string | null;
    /** 这一票的会计期间 */
    accountDate: string;
    /** 业务主单信息 */
    transportOrder?: TransportOrderSimpleDto | null;
    /** 需要同步的应收费用条数（汇率已一致的不计入） */
    receivableFeeCount: number;
    /** 需要同步的应付费用条数（同上） */
    payableFeeCount: number;
    /** 不可同步的原因，可同步时为 null */
    blockedReason?: string | null;
  }

  /** 同步费用汇率查询出参 */
  export interface ExchangeRateSyncPreviewDto {
    /** 可同步的票，按会计期间、主单id升序 */
    syncableTickets: ExchangeRateSyncTicketDto[];
    /** 不可同步的票，前端应置灰不让勾 */
    blockedTickets: ExchangeRateSyncTicketDto[];
  }

  /** 同步费用汇率查询参数 */
  export interface ExchangeRateSyncQueryParams {
    /** 汇率id */
    Id: number | string;
    /** 主提单号，模糊匹配 */
    MblNum?: string;
    /** 委托单位id，精确匹配 */
    ClientId?: string;
  }

  /** 勾选的票 */
  export interface ExchangeRateSyncTicketInputDto {
    /** 业务主单id */
    transportOrderId: string;
    /** 更改单id，为空代表主单原票 */
    changeOrderId?: string | null;
  }

  /** 同步费用汇率执行入参（筛选参数必须与查询时一致，后端会重新校验） */
  export interface ExchangeRateSyncDto {
    /** 汇率id */
    id: number | string;
    /** 主提单号，须与查询时一致 */
    mblNum?: string;
    /** 委托单位id，须与查询时一致 */
    clientId?: string;
    /** 勾选的票，至少一条 */
    tickets: ExchangeRateSyncTicketInputDto[];
  }

  /** 同步费用汇率执行结果 */
  export interface ExchangeRateSyncResultDto {
    /** 实际同步的票数 */
    ticketCount: number;
    /** 实际改动的应收费用条数 */
    receivableFeeCount: number;
    /** 实际改动的应付费用条数 */
    payableFeeCount: number;
  }
}

const API_PREFIX = '/services/app/ExchangeRateAdmin';

/**
 * 获取汇率分页列表
 */
export const getExchangeRatePagedList = (
  params: ExchangeRateAdminApi.GetPagedListParams,
) => {
  return requestClient.get<ExchangeRateAdminApi.PagedListOfExchangeRateDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取汇率详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getExchangeRateDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<ExchangeRateAdminApi.ExchangeRateDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增汇率
 */
export const addExchangeRate = (
  data: ExchangeRateAdminApi.ExchangeRateAddDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑汇率
 */
export const editExchangeRate = (
  data: ExchangeRateAdminApi.ExchangeRateEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除汇率
 * @param id 汇率 ID，大数以 string 透传避免精度丢失
 */
export const deleteExchangeRate = (id: number | string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};

/**
 * 查询可同步费用汇率的票（分可同步/不可同步两个列表）
 */
export const getSyncOrderFeeRateList = (
  params: ExchangeRateAdminApi.ExchangeRateSyncQueryParams,
) => {
  return requestClient.get<ExchangeRateAdminApi.ExchangeRateSyncPreviewDto>(
    `${API_PREFIX}/GetSyncOrderFeeRateListAsync`,
    { params },
  );
};

/**
 * 执行同步费用汇率（应收写应收汇率、应付写应付汇率）
 * 入参中的筛选条件必须与查询时一致，后端会重新校验后取交集执行
 */
export const syncOrderFeeRate = (
  data: ExchangeRateAdminApi.ExchangeRateSyncDto,
) => {
  return requestClient.post<ExchangeRateAdminApi.ExchangeRateSyncResultDto>(
    `${API_PREFIX}/SyncOrderFeeRateAsync`,
    data,
  );
};
