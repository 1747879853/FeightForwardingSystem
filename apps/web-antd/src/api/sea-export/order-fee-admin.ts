import { requestClient } from '#/api/request';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import type { SeaExportAdminApi } from './sea-export-admin';
const API_PREFIX = '/services/app/OrderFeeAdmin';

export namespace OrderFeeAdminApi {
  // ==================== SimpleDto 类型定义（2026-07-29新增）====================

  /** 港口代码简单信息 */
  export interface PortCodeSimpleDto {
    id?: number;
    portName?: string | null;
    cnName?: string | null;
  }

  /** 船公司简单信息 */
  export interface CarrierSimpleDto {
    id?: number;
    code?: string | null;
    cnName?: string | null;
    cnShortName?: string | null;
    enName?: string | null;
    ediCode?: string | null;
  }

  /** 委托单位简单信息 */
  export interface ClientSimpleDto {
    id?: string;
    name?: string | null;
    code?: string | null;
    fullName?: string | null;
    enName?: string | null;
  }

  /** 费用代码简单信息 */
  export interface FeeCodeSimpleDto {
    id?: number;
    code?: string | null;
    cnName?: string | null;
    enName?: string | null;
    /** 默认币别id */
    currencyId?: number;
    /** 默认计费标准 */
    defaultUnit?: string | null;
    defaultUnitName?: string | null;
    /** 是否机密 */
    isConfidential?: boolean;
    /** 禁开发票 */
    isInvoiceProhibit?: boolean;
    /** 默认税率 */
    taxRate?: number;
  }

  /** 币别简单信息 */
  export interface CurrencySimpleDto {
    id?: number;
    code?: string | null;
    cnName?: string | null;
    enName?: string | null;
    /** 默认汇率 */
    defaultRate?: number;
  }

  /** 对账单简要信息 */
  export interface StatementSimpleDto {
    /** 对账 id */
    id: string;
    /** 对账单号 */
    statementNum: string;
  }

  /**
   * 字段说明（2026-08-09更新）：
   * - noTaxUnitPrice/noTaxAmount: 前端传入，后端直接存储并返回（不再后端计算）
   * - taxIncluded: 已删除，不再使用
   * - 关联外键统一以对象返回：feeCode / currency / settlement，
   *   原平铺的 feeCodeName、feeCodeCode、currencyName、currencyCode、
   *   settlementName、settlementCode 已由后端删除
   *
   * 分类 字段  说明
   * 展示字段  feeCode、currency、settlement     关联表的简要对象
   * 输入字段  noTaxUnitPrice、noTaxAmount     前端计算后传入
   * 审计字段  isDeleted、creationTime、lastModificationTime 等   ABP 框架标准审计属性
   *
   * 主键  id  记录唯一标识
   */

  /** 新增业务费用参数 */
  export interface OrderFeeAddDto {
    /** 业务 id */
    transportOrderId: string;

    /**收付类型 */
    paySide: number;

    /** 费用状态 */
    feeStatus: number;

    /** 开票状态 */
    invoiceStatus: number;

    /** 费用代码 id - 费用名称从这里来 */
    feeCodeId: number;

    /** 行业类别  数值*/
    IndustryCategory?: number;
    /** 行业类别 字母 */
    IndustryCategories?: string;

    /** 结算对象 id - 船公司是船公司表 其余是客户表 */
    settlementId: string;

    /** 币别 id */
    currencyId: number;

    /** 汇率 - 从币别拉出默认汇率 可以修改 */
    exchangeRate: number;

    /** 含税单价 */
    unitPrice: number;

    /** 金额 最多 28 位 */
    amount: number;

    /** 单位 */
    unit: string;

    /** 数量 */
    quantity: number;

    /** 税率 */
    taxRate: number;

    /** 不含税单价（前端传入，后端直接存储） */
    noTaxUnitPrice: number;

    /** 不含税金额（前端传入，后端直接存储） */
    noTaxAmount: number;

    /** 付费申请金额 */
    rqstPaymentAmount: number;

    /** 已开票金额 */
    invoicedAmount: number;

    /** 发票申请金额 */
    orderInvoiceAmount: number;

    /** 已结算金额 */
    settledAmount: number;

    /** 是否允许开票 */
    invoiceBlocked: boolean;

    /** 是否机密 配合机密权限控制读写 */
    isConfidential: boolean;

    /** 数据录入方式 */
    dataEntryMethod: number;

    /** 备注 */
    remark?: string;
  }

  /** 修改账单期参数 */
  export interface OrderFeeEditDto extends OrderFeeAddDto {
    id: string;
    /** 任务状态 */
    taskStatus?: string;
    /** 更改单 id */
    changeOrderId?: string;

    submitOrderFeeTasks?: ExpenseSubmissionAdminApi.TaskItemDto[];
    modifyOrderFeeTasks?: ExpenseSubmissionAdminApi.TaskItemDto[];
    deleteOrderFeeTasks?: ExpenseSubmissionAdminApi.TaskItemDto[];
  }

  /** 业务费用列表和详情输出 Dto */
  export interface OrderFeeDto {
    /** 业务 id */
    transportOrderId?: string;

    /** 更改单 id */
    changeOrderId?: string;

    /**收付类型 */
    paySide?: number;

    /** 费用状态 */
    feeStatus?: number;

    /** 任务状态 */
    taskStatus?: string;

    /** 开票状态 */
    invoiceStatus?: number;

    /** 结算状态 */
    settlementStatus?: number;

    /** 组合费用状态（计算字段，非数据库列） */
    combinedFeeStatus?: number;

    submitOrderFeeTasks?: ExpenseSubmissionAdminApi.TaskItemDto[];
    modifyOrderFeeTasks?: ExpenseSubmissionAdminApi.TaskItemDto[];
    deleteOrderFeeTasks?: ExpenseSubmissionAdminApi.TaskItemDto[];

    /** 所属用户权限id 不要用CreatorUserId 创建是创建 所属人是所属人 */
    userId?: number;

    /** 归属组织id（由所属运输订单派生） */
    orgId?: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | SeaExportAdminApi.OrganizationUnitSimpleDto[];

    /** 费用代码 id - 费用名称从这里来 */
    feeCodeId?: number;

    /** 费用代码简要对象（替代 feeCodeName / feeCodeCode） */
    feeCode?: FeeCodeSimpleDto | null;

    /** 行业类别  数值*/
    industryCategory?: number;
    /** 行业类别 字母 */
    industryCategories?: string;

    /** 结算对象 id - 船公司是船公司表 其余是客户表 */
    settlementId?: string;

    /** 结算对象简要对象（替代 settlementName / settlementCode） */
    settlement?: ClientSimpleDto | null;

    /** 币别 id */
    currencyId?: number;

    /** 币别简要对象（替代 currencyName / currencyCode） */
    currency?: CurrencySimpleDto | null;

    /** 汇率 - 从币别拉出默认汇率 可以修改 */
    exchangeRate?: number;

    /** 含税单价 */
    unitPrice?: number;

    /** 金额 最多 28 位 */
    amount?: number;

    /** 单位（中文字符串，最大16字符） */
    unit?: string;

    /** 数量 */
    quantity?: number;

    /** 税率 */
    taxRate?: number;

    /** 付费申请金额 */
    rqstPaymentAmount?: number;

    /** 已开票金额 */
    invoicedAmount: number;

    /** 发票申请金额 */
    orderInvoiceAmount: number;

    /** 已结算金额 */
    settledAmount: number;

    /** 未申请金额 */
    unRqstPaymentAmount: number;

    /** 未结算金额 */
    unSettledAmount: number;

    /** 是否允许开票 */
    invoiceBlocked: boolean;

    /** 是否机密 配合机密权限控制读写 */
    isConfidential: boolean;

    /** 数据录入方式 */
    dataEntryMethod: number;

    /** 备注 */
    remark?: string;

    /** 本位币id */
    localCurrencyId?: number;

    /** 本位币对象（替代 localCurrencyCode，编码读 code） */
    localCurrency?: CurrencySimpleDto | null;

    /** 创建人昵称（仍平铺返回） */
    creatorUserName?: string;

    /** 未开票金额 (计算字段) */
    unInvoicedAmount: number;

    /** 不含税单价（后端直接返回数据库存储值） */
    noTaxUnitPrice: number;

    /** 不含税金额（后端直接返回数据库存储值） */
    noTaxAmount: number;

    /**
     * 费用所属对账单集合（多次对账支持）
     * 未对账时为空数组 []
     */
    statements?: StatementSimpleDto[];

    /**
     * 是否已对账
     * 该费用只要存在于任意一张对账单即为 true
     * 等价于 statements.length > 0，两者不会矛盾，取其一判断即可
     */
    isStatemented?: boolean;

    /** 是否已删除 */
    isDeleted: boolean;

    /** 删除人 ID */
    deleterUserId?: number;

    /** 删除时间 */
    deletionTime?: string;

    /** 最后修改时间 */
    lastModificationTime?: string;

    /** 最后修改人 ID */
    lastModifierUserId?: number;

    /** 创建时间 */
    creationTime: string;

    /** 创建人 ID */
    creatorUserId?: number;

    /** 主键 ID */
    id: string;

    /** 修改次数 前端自用*/
    ModificationCount?: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    /** 关键字 模糊匹配 */
    Keyword?: string;
    /** 业务 id */
    TransportOrderId?: string;

    /**收付类型 */
    PaySide: number;

    /** 费用状态 */
    FeeStatus?: number;
    /** 开票状态 */
    InvoiceStatus?: number;
    /** 费用代码 id - 费用名称从这里来 */
    FeeCodeId?: number;
    /** 行业类别  数值*/
    IndustryCategory?: number;
    /** 行业类别 字母 */
    IndustryCategories?: string;
    /** 结算对象 id - 船公司是船公司表 其余是客户表 */
    SettlementId?: string;
    /** 币别 id */
    CurrencyId?: number;
    /** 是否机密 配合机密权限控制读写 */
    IsConfidential?: boolean;
    /** 按费用 id 列表过滤 */
    Ids?: string[];
    /** 排序 默认是Id */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }

  /** 分页列表响应 */
  export interface PagedListOfOrderFeeDto {
    skipCount?: number;
    maxResultCount?: number;
    items: OrderFeeDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  /** 收付互生费用输入参数 */
  export interface GenerateOppositeOrderFeesInputDto {
    /** 业务id（TransportOrder.Id） */
    transportOrderId: string;

    /** 输入费用的收付类型（0=收 1=付）。收→生成应付；付→生成应收 */
    paySide: number;

    /** 源费用id列表（均需属于该业务、该收付类型、该更改单） */
    orderFeeIds: string[];

    /** 更改单id，可空。不为空时校验源费用归属该更改单，新费用归属该更改单，并判断该更改单是否费用锁定 */
    changeOrderId?: string;
  }

  // ==================== 批量引入费用相关DTO ====================

  /** 业务类型枚举 */
  export enum BizType {
    /** 海运出口 */
    SeaExport = 0,
    /** 海运进口 */
    SeaImport = 1,
    /** 空运出口 */
    AirExport = 2,
  }

  /** 查询业务订单费用输入参数（原 SeaExportFeeQueryInputDto，现支持全业务类型） */
  export interface TransportOrderFeeQueryInputDto {
    /** 业务类型：0=海运出口 / 1=海运进口 / 2=空运出口。一次只查一种业务类型 */
    bizType: BizType;
    /** 委托单位id（TransportOrder.ClientId） */
    clientId?: string;
    /** 订舱代理id（SeaExport.BookingAgentId / AirExport.BookingAgentId）。海运进口时传了不生效 */
    bookingAgentId?: string;
    /** 船公司id（SeaExport.CarrierId / SeaImport.CarrierId）。空运出口时传了不生效 */
    carrierId?: number;
    /** 起运港id。bizType=0/1 传海港id，bizType=2 传空港id */
    polId?: number;
    /** 目的港id。同上 */
    podId?: number;
    /** 编号，模糊匹配 委托编号(CommissionNum) + 主提单号(MblNum) */
    keyword?: string;
    /** 费用收付类型，用于过滤费用（0=收 1=付） */
    paySide?: number;
  }

  /** 空港简单信息 */
  export interface AirPortSimpleDto {
    id?: number;
    iataCode?: string | null;
    enName?: string | null;
    cnName?: string | null;
  }

  /** 航线简单信息 */
  export interface LaneSimpleDto {
    id?: number;
    name?: string | null;
  }

  /** 国家简单信息 */
  export interface CountrySimpleDto {
    id?: number;
    name?: string | null;
    code?: string | null;
  }

  /** 港口代码简单信息（更新以包含更多字段） */
  export interface PortCodeSimpleDto {
    id?: number;
    portName?: string | null;
    cnName?: string | null;
    ediCode?: string | null;
    lane?: LaneSimpleDto | null;
    country?: CountrySimpleDto | null;
  }

  /** 海运出口业务详情子对象 */
  export interface SeaExportBizInfoDto {
    /** 与业务id相同 */
    id: string;
    /** 船名 */
    vessel?: string;
    /** 航次 */
    innerVoyno?: string;
    /** 起运港（海港） */
    pol?: PortCodeSimpleDto;
    /** 目的港（海港） */
    pod?: PortCodeSimpleDto;
    /** 船公司 */
    carrier?: CarrierSimpleDto;
    /** 订舱代理 */
    bookingAgent?: ClientSimpleDto;
  }

  /** 海运进口业务详情子对象 */
  export interface SeaImportBizInfoDto {
    /** 与业务id相同 */
    id: string;
    /** 船名 */
    vessel?: string;
    /** 航次 */
    innerVoyno?: string;
    /** 起运港（海港） */
    pol?: PortCodeSimpleDto;
    /** 目的港（海港） */
    pod?: PortCodeSimpleDto;
    /** 船公司 */
    carrier?: CarrierSimpleDto;
    /** 海运进口没有 bookingAgent */
  }

  /** 空运出口业务详情子对象 */
  export interface AirExportBizInfoDto {
    /** 与业务id相同 */
    id: string;
    /** 航班 */
    flightNo?: string;
    /** 起运地（空港） */
    pol?: AirPortSimpleDto;
    /** 中转地（空港，单个） */
    pot?: AirPortSimpleDto;
    /** 目的地（空港） */
    pod?: AirPortSimpleDto;
    /** 订舱代理 */
    bookingAgent?: ClientSimpleDto;
    /** 空运出口没有 carrier / vessel / innerVoyno */
  }

  /** 业务订单基础信息子对象 */
  export interface TransportOrderBaseInfoDto {
    /** 业务id */
    id: string;
    /** 业务类型：0=海运出口 / 1=海运进口 / 2=空运出口 */
    bizType: BizType;
    /** 委托编号 */
    commissionNum?: string;
    /** 主提单号 */
    mblNum?: string;
    /** 委托单位对象 */
    client?: ClientSimpleDto;
    /** 箱型箱量（按箱型名分组 "箱型*数量" 空格拼接） */
    totalCtn?: string;
    /** 海运出口详情（仅 bizType=0 时有值） */
    seaExport?: SeaExportBizInfoDto | null;
    /** 海运进口详情（仅 bizType=1 时有值） */
    seaImport?: SeaImportBizInfoDto | null;
    /** 空运出口详情（仅 bizType=2 时有值） */
    airExport?: AirExportBizInfoDto | null;
  }

  /** 业务订单费用列表项（原 SeaExportFeeListDto，现支持全业务类型） */
  export interface TransportOrderFeeListDto {
    /** 业务id */
    id: string;
    /** 业务订单基础信息 */
    transportOrder: TransportOrderBaseInfoDto;
    /** 符合条件的费用列表 */
    orderFees: SeaExportFeeItemDto[];
  }

  /** @deprecated 请使用 TransportOrderFeeQueryInputDto */
  export type SeaExportFeeQueryInputDto = TransportOrderFeeQueryInputDto;

  /** @deprecated 请使用 TransportOrderFeeListDto */
  export type SeaExportFeeListDto = TransportOrderFeeListDto;

  /** 批量引入费用输入参数 */
  export interface ImportOrderFeesToTransportOrderInputDto {
    /** 目标业务id，费用将插入到该业务下 */
    transportOrderId: string;
    /** 要引入的来源费用id列表 */
    orderFeeIds: string[];
    /** 更改单id，可空。不为空时新费用归属该更改单，并改判更改单费用锁定 */
    changeOrderId?: string;
    /** 是否引入原费用结算对象。true：保留源费用 SettlementId；false：将 SettlementId 改为目标业务的委托单位 ClientId */
    importOriginalSettlement: boolean;
  }

  // ==================== 业务费用数量统计相关DTO ====================

  /** 业务费用数量统计查询参数 */
  export interface OrderFeeCountQueryDto {
    /** 业务id（TransportOrderId） */
    transportOrderId: string;
  }

  /** 业务费用数量统计结果 */
  export interface OrderFeeCountDto {
    /** 应收费用数量（PaySide=收，即 0） */
    receivableCount: number;
    /** 应付费用数量（PaySide=付，即 1） */
    payableCount: number;
  }
}

/** 新增业务费用 */
export const addOrderFee = (data: OrderFeeAdminApi.OrderFeeAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/** 编辑业务费用 */
export const editOrderFee = (data: OrderFeeAdminApi.OrderFeeEditDto) => {
  return requestClient.put<number>(`${API_PREFIX}/EditAsync`, data);
};

/** 批量编辑业务费用 */
export const batchEditOrderFee = (data: OrderFeeAdminApi.OrderFeeEditDto[]) => {
  let handleData = { orderFees: data };
  return requestClient.put<number>(`${API_PREFIX}/BatchEditAsync`, handleData);
};

/** 删除业务费用 */
// export const deleteOrderFee = (id: number) => {
//   return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
//     data: { id },
//   });
// };
/** 批量删除 */
export const batchDeleteOrderFee = (ids: number[]) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { ids },
  });
};

/** 获取业务费用分页列表 */
export const getOrderFeePagedList = (
  params: OrderFeeAdminApi.GetPagedListParams,
) => {
  return requestClient.get<OrderFeeAdminApi.PagedListOfOrderFeeDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/** 获取业务费用详情 */
export const getOrderFeeDetail = (id: number) => {
  return requestClient.get<OrderFeeAdminApi.OrderFeeDto>(
    `${API_PREFIX}/GetDetailAsync`,
    { params: { id } },
  );
};

/** 导出业务费用列表 */
export const exportOrderFeeList = (
  params: OrderFeeAdminApi.GetPagedListParams,
) => {
  return requestClient.get(`${API_PREFIX}/ExportToExcelAsync`, {
    params,
    responseType: 'blob', // 以二进制流的形式接收响应
  });
};

/** 获取业务费用相关的下拉列表数据 */
export const getOrderFeeDropdownData = () => {
  return requestClient.get(`${API_PREFIX}/GetDropdownDataAsync`);
};

/** 获取业务费用相关的统计数据 */
export const getOrderFeeStatistics = (transportOrderId: string | number) => {
  return requestClient.get(`${API_PREFIX}/GetStatisticsAsync`, {
    params: { transportOrderId }, // 传递运输订单 ID 作为查询参数
    responseType: 'json',
  });
};

/** 收付互生费用（收转付/付转收） */
export const generateOppositeOrderFees = (
  data: OrderFeeAdminApi.GenerateOppositeOrderFeesInputDto,
) => {
  return requestClient.post<string[]>(
    `${API_PREFIX}/GenerateOppositeOrderFeesAsync`,
    data,
  );
};

/** 查询业务订单费用（原 getSeaExportFees，现支持全业务类型） */
export const getTransportOrderFees = (
  params: OrderFeeAdminApi.TransportOrderFeeQueryInputDto,
) => {
  return requestClient.get<OrderFeeAdminApi.TransportOrderFeeListDto[]>(
    `${API_PREFIX}/GetTransportOrderFeesAsync`,
    { params },
  );
};

/** @deprecated 请使用 getTransportOrderFees */
export const getSeaExportFees = getTransportOrderFees;

/** 为某条业务批量引入费用 */
export const importOrderFeesToTransportOrder = (
  data: OrderFeeAdminApi.ImportOrderFeesToTransportOrderInputDto,
) => {
  return requestClient.post<string[]>(
    `${API_PREFIX}/ImportOrderFeesToTransportOrderAsync`,
    data,
  );
};

/** 根据业务id统计应收/应付费用数量 */
export const getOrderFeeCount = (
  params: OrderFeeAdminApi.OrderFeeCountQueryDto,
) => {
  return requestClient.get<OrderFeeAdminApi.OrderFeeCountDto>(
    `${API_PREFIX}/GetOrderFeeCountAsync`,
    { params },
  );
};
