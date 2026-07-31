import { requestClient } from '#/api/request';

export namespace OrderFeeTemplateAdminApi {
  /** 业务类型枚举 */
  export enum BizType {
    /** 海运出口 */
    SeaExport = 0,
  }

  /** 收付类型枚举 */
  export enum PaySide {
    /** 收 */
    Receivable = 0,
    /** 付 */
    Payable = 1,
  }

  /** 贸易条款类型 */
  export enum TradeTermsType {
    EXW = 0,
    FOB = 1,
    CIF = 2,
    DDP = 3,
    DDU = 4,
  }

  /** 货物类型 */
  export enum CargoType {
    GeneralCargo = 0,
    DangerousGoods = 1,
    RefrigeratedCargo = 2,
  }

  /** 装运方式 */
  export enum BLType {
    MBL = 0,
    HBL = 1,
  }

  /** 行业类别/结算对象类别 */
  export enum IndustryCategory {
    Customer = 0,
    Carrier = 1,
  }

  /** 数据录入方式 */
  export enum DataEntryMethod {
    Manual = 0,
    Import = 1,
    API = 2,
    Template = 4,
  }

  /** 费用状态 */
  export enum FeeStatus {
    Entering = 0,
    Submitted = 1,
    Approved = 2,
    Rejected = 3,
  }

  /** 结算状态 */
  export enum SettlementStatus {
    UnSettled = 0,
    Settled = 1,
  }

  /** 开票状态 */
  export enum InvoiceStatus {
    NotIssued = 0,
    Issued = 1,
  }

  /** 公司简单信息 */
  export interface CompanySimpleDto {
    id?: number;
    name?: string | null;
  }

  /** 委托单位简单信息 */
  export interface ClientSimpleDto {
    id?: string;
    name?: string | null;
    code?: string | null;
  }

  /** 港口代码简单信息 */
  export interface PortCodeSimpleDto {
    id?: number;
    portName?: string | null;
    cnName?: string | null;
    countryName?: string | null;
  }

  /** 付费方式简单信息 */
  export interface CodeFrtSimpleDto {
    id?: number;
    code?: string | null;
    name?: string | null;
  }

  /** 业务来源简单信息 */
  export interface CodeSourceSimpleDto {
    id?: number;
    code?: string | null;
    name?: string | null;
  }

  /** 船公司简单信息 */
  export interface CarrierSimpleDto {
    id?: number;
    cnName?: string | null;
    code?: string | null;
    cnShortName?: string | null;
    ediCode?: string | null;
    enName?: string | null;
  }

  /** 费用代码简单信息 */
  export interface FeeCodeSimpleDto {
    id?: number;
    feeCode?: string | null;
    feeName?: string | null;
  }

  /** 币别简单信息 */
  export interface CurrencySimpleDto {
    id?: number;
    currencyCode?: string | null;
    currencyName?: string | null;
  }

  /** 新增明细 DTO */
  export interface OrderFeeTemplateItemAddDto {
    /** 服务项，为空则取主表服务项 */
    serviceType?: number | null;
    /** 费用代码id（费用名称来源） */
    feeCodeId: number;
    /** 行业类别/结算对象类别 */
    industryCategory: IndustryCategory;
    /** 结算对象id（客户表） */
    settlementId: string;
    /** 币别id */
    currencyId: number;
    /** 含税单价 */
    unitPrice: number;
    /** 不含税单价 */
    noTaxUnitPrice: number;
    /** 金额（生成费用时按单价×数量计算覆盖） */
    amount?: number;
    /** 单位字符串（票、重量、体积、TEU、20GP、40GP 等） */
    unit: string;
    /** 税率(%) */
    taxRate: number;
    /** 不含税金额（生成费用时计算覆盖） */
    noTaxAmount?: number;
    /** 排序id */
    sortId?: number;
    /** 备注 */
    remark?: string | null;
  }

  /** 编辑明细 DTO */
  export interface OrderFeeTemplateItemEditDto extends OrderFeeTemplateItemAddDto {
    /** 明细id，为 null 或空 Guid 表示新增 */
    id?: string | null;
  }

  /** 明细分页列表 DTO */
  export interface OrderFeeTemplateItemListDto {
    id?: string;
    /** 服务项 */
    serviceType?: number | null;
    /** 费用代码id */
    feeCodeId?: number;
    /** 行业类别 */
    industryCategory?: IndustryCategory;
    /** 结算对象id */
    settlementId?: string;
    /** 币别id */
    currencyId?: number;
    /** 含税单价 */
    unitPrice?: number;
    /** 不含税单价 */
    noTaxUnitPrice?: number;
    /** 金额 */
    amount?: number;
    /** 单位 */
    unit?: string | null;
    /** 税率(%) */
    taxRate?: number;
    /** 不含税金额 */
    noTaxAmount?: number;
    /** 排序id */
    sortId?: number;
    /** 备注 */
    remark?: string | null;
    /** 费用代码外键 SimpleDto */
    feeCode?: FeeCodeSimpleDto | null;
    /** 币别外键 SimpleDto */
    currency?: CurrencySimpleDto | null;
    /** 结算对象外键 SimpleDto */
    settlement?: ClientSimpleDto | null;
  }

  /** 新增模板 DTO */
  export interface OrderFeeTemplateAddDto {
    /** 模板名称（最长64） */
    name: string;
    /** 业务类型（0=海运出口） */
    bizType: BizType;
    /** 收付类型（0=收，1=付） */
    paySide: PaySide;
    /** 是否长期有效 */
    efficient: boolean;
    /** 生效起始时间，为空=起始不限 */
    startTime?: string | null;
    /** 生效终止时间，为空=结束不限 */
    endTime?: string | null;
    /** 适用组织id，为空=适用所有组织（不做本人校验） */
    orgId?: number | null;
    /** 委托单位id，为空=所有 */
    clientId?: string | null;
    /** 贸易条款，为空=所有 */
    tradeTermsType?: TradeTermsType | null;
    /** 货物类型，为空=所有 */
    cargoId?: CargoType | null;
    /** 付费方式id，为空=所有 */
    codeFrtId?: number | null;
    /** 业务来源id，为空=所有 */
    codeSourceId?: number | null;
    /** 船公司id，为空=所有 */
    carrierId?: number | null;
    /** 订舱代理id，为空=所有 */
    bookingAgentId?: string | null;
    /** 起运港id，为空=所有 */
    polId?: number | null;
    /** 目的港id，为空=所有 */
    podId?: number | null;
    /** 装运方式，为空=所有 */
    blType?: BLType | null;
    /** 服务项（子表未配置服务项时使用主表服务项） */
    serviceType?: number | null;
    /** 排序id */
    sortId?: number;
    /** 备注（最长4096） */
    remark?: string | null;
    /** 费用明细列表（至少一条） */
    orderFeeTemplateItems: OrderFeeTemplateItemAddDto[];
  }

  /** 编辑模板 DTO */
  export interface OrderFeeTemplateEditDto extends OrderFeeTemplateAddDto {
    /** 模板id */
    id: string;
    /** 费用明细列表 */
    orderFeeTemplateItems: OrderFeeTemplateItemEditDto[];
  }

  /** 复制模板 DTO */
  export interface OrderFeeTemplateCopyDto {
    /** 要复制的模板id集合 */
    ids: string[];
    /** 每条源数据复制的份数，默认1 */
    count?: number;
  }

  /** 删除模板 DTO */
  export interface OrderFeeTemplateDeleteDto {
    /** 单个删除主键id */
    id?: string | null;
    /** 批量删除id集合 */
    ids?: string[] | null;
  }

  /** 模板详情 DTO */
  export interface OrderFeeTemplateDetailDto {
    id?: string;
    name?: string | null;
    bizType?: BizType;
    paySide?: PaySide;
    efficient?: boolean;
    startTime?: string | null;
    endTime?: string | null;
    orgId?: number | null;
    clientId?: string | null;
    tradeTermsType?: TradeTermsType | null;
    cargoId?: CargoType | null;
    codeFrtId?: number | null;
    codeSourceId?: number | null;
    carrierId?: number | null;
    bookingAgentId?: string | null;
    polId?: number | null;
    podId?: number | null;
    blType?: BLType | null;
    serviceType?: number | null;
    sortId?: number;
    remark?: string | null;
    /** 创建人昵称 */
    creatorUserName?: string | null;
    /** 修改人昵称 */
    lastModifierUserName?: string | null;
    /** 创建时间 */
    creationTime?: string;
    /** 最后修改时间 */
    lastModificationTime?: string | null;
    /** 所属公司 SimpleDto */
    company?: CompanySimpleDto | null;
    /** 委托单位 SimpleDto */
    client?: ClientSimpleDto | null;
    /** 付费方式 SimpleDto */
    codeFrt?: CodeFrtSimpleDto | null;
    /** 业务来源 SimpleDto */
    codeSource?: CodeSourceSimpleDto | null;
    /** 船公司 SimpleDto */
    carrier?: CarrierSimpleDto | null;
    /** 订舱代理 SimpleDto */
    bookingAgent?: ClientSimpleDto | null;
    /** 起运港 SimpleDto */
    pol?: PortCodeSimpleDto | null;
    /** 目的港 SimpleDto */
    pod?: PortCodeSimpleDto | null;
    /** 费用明细列表 */
    orderFeeTemplateItems?: OrderFeeTemplateItemListDto[] | null;
  }

  /** 模板列表 DTO */
  export interface OrderFeeTemplateListDto {
    id?: string;
    name?: string | null;
    bizType?: BizType;
    paySide?: PaySide;
    efficient?: boolean;
    startTime?: string | null;
    endTime?: string | null;
    orgId?: number | null;
    clientId?: string | null;
    tradeTermsType?: TradeTermsType | null;
    cargoId?: CargoType | null;
    codeFrtId?: number | null;
    codeSourceId?: number | null;
    carrierId?: number | null;
    bookingAgentId?: string | null;
    polId?: number | null;
    podId?: number | null;
    blType?: BLType | null;
    serviceType?: number | null;
    sortId?: number;
    remark?: string | null;
    /** 明细数量 */
    itemCount?: number;
    /** 创建人昵称 */
    creatorUserName?: string | null;
    /** 修改人昵称 */
    lastModifierUserName?: string | null;
    /** 创建时间 */
    creationTime?: string;
    /** 最后修改时间 */
    lastModificationTime?: string | null;
    /** 所属公司 SimpleDto */
    company?: CompanySimpleDto | null;
    /** 委托单位 SimpleDto */
    client?: ClientSimpleDto | null;
    /** 付费方式 SimpleDto */
    codeFrt?: CodeFrtSimpleDto | null;
    /** 业务来源 SimpleDto */
    codeSource?: CodeSourceSimpleDto | null;
    /** 船公司 SimpleDto */
    carrier?: CarrierSimpleDto | null;
    /** 订舱代理 SimpleDto */
    bookingAgent?: ClientSimpleDto | null;
    /** 起运港 SimpleDto */
    pol?: PortCodeSimpleDto | null;
    /** 目的港 SimpleDto */
    pod?: PortCodeSimpleDto | null;
    /** 费用明细列表 */
    orderFeeTemplateItems?: OrderFeeTemplateItemListDto[] | null;
  }

  /** 分页列表结果 */
  export interface PagedList<T> {
    skipCount?: number;
    maxResultCount?: number;
    items?: T[] | null;
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  /** 查询参数 DTO */
  export interface OrderFeeTemplateQueryDto {
    /** 模板名称（模糊查询） */
    name?: string | null;
    /** 业务类型 */
    bizType?: BizType | null;
    /** 收付类型 */
    paySide?: PaySide | null;
    /** 是否长期有效 */
    efficient?: boolean | null;
    /** 适用组织id */
    orgId?: number | null;
    /** 委托单位id */
    clientId?: string | null;
    /** 起运港id */
    polId?: number | null;
    /** 目的港id */
    podId?: number | null;
    /** 服务项 */
    serviceType?: number | null;
    /** 页码 */
    pageIndex?: number;
    /** 每页条数 */
    pageSize?: number;
    /** 排序字段 */
    sorting?: string | null;
  }

  /** 起运港分组统计 DTO */
  export interface OrderFeeTemplatePolGroupDto {
    /** 是否合计行；列表第一条(下标0)为合计行 */
    isTotal?: boolean;
    /** 起运港id，为空代表默认/所有港口（合计行也为空） */
    polId?: number | null;
    /** 起运港信息（polId 为空时为 null） */
    pol?: PortCodeSimpleDto | null;
    /** 合计行为总数量；其余为该起运港在当前查询条件下的模板数据条数 */
    count?: number;
  }
}

const API_PREFIX = '/services/app/OrderFeeTemplateAdmin';

/**
 * 新增自动费用模板
 * @param data 新增模板 DTO
 * @returns 新建模板ID (Guid)
 */
export const addOrderFeeTemplate = (
  data: OrderFeeTemplateAdminApi.OrderFeeTemplateAddDto,
) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑自动费用模板
 * @param data 编辑模板 DTO
 * @returns 是否成功
 */
export const editOrderFeeTemplate = (
  data: OrderFeeTemplateAdminApi.OrderFeeTemplateEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 复制自动费用模板
 * @param data 复制模板 DTO
 * @returns 新生成的模板id集合
 */
export const copyOrderFeeTemplate = (
  data: OrderFeeTemplateAdminApi.OrderFeeTemplateCopyDto,
) => {
  return requestClient.post<string[]>(`${API_PREFIX}/CopyAsync`, data);
};

/**
 * 删除自动费用模板
 * @param data 删除模板 DTO
 * @returns 是否成功
 */
export const deleteOrderFeeTemplate = (
  data: OrderFeeTemplateAdminApi.OrderFeeTemplateDeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    params: data,
  });
};

/**
 * 获取自动费用模板详情
 * @param id 模板id
 * @returns 模板详情 DTO
 */
export const getOrderFeeTemplateDetail = (id: string) => {
  return requestClient.get<OrderFeeTemplateAdminApi.OrderFeeTemplateDetailDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { id } },
  );
};

/**
 * 获取自动费用模板分页列表
 * @param params 查询参数
 * @returns 分页列表结果
 */
export const getOrderFeeTemplatePagedList = (
  params: OrderFeeTemplateAdminApi.OrderFeeTemplateQueryDto,
) => {
  return requestClient.get<
    OrderFeeTemplateAdminApi.PagedList<OrderFeeTemplateAdminApi.OrderFeeTemplateListDto>
  >(`${API_PREFIX}/GetPagedListAsync`, { params });
};

/**
 * 按起运港分组统计
 * @param params 查询参数（与列表接口参数完全一致；分页字段对本接口无效）
 * @returns 起运港分组统计列表（第一条为合计行）
 */
export const getPolGroupList = (
  params: OrderFeeTemplateAdminApi.OrderFeeTemplateQueryDto,
) => {
  return requestClient.get<
    OrderFeeTemplateAdminApi.OrderFeeTemplatePolGroupDto[]
  >(`${API_PREFIX}/GetPolGroupListAsync`, { params });
};
