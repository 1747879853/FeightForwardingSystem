import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace ReportApi {
  // ==================== 公共基础类型 ====================

  /** 委托单位/订舱代理/场站/结算对象 */
  export interface ClientSimpleDto {
    id: string;
    name: string;
    code: string;
    fullName: string;
    enName: string;
    isDishonest: boolean;
    dishonestRemark: string;
    enterpriseType?: number;
    clientType?: number;
    isShared: boolean;
    orgId?: number;
    orgs: OrganizationUnitSimpleDto[];
  }

  /** 船公司 */
  export interface CarrierSimpleDto {
    id: number;
    cnName: string;
    cnShortName: string;
    enName: string;
    code: string;
    ediCode: string;
  }

  /** 币别 */
  export interface CurrencySimpleDto {
    code: string;
    cnName: string;
    enName: string;
    defaultRate: number;
  }

  /** 品名 */
  export interface CodeGoodsSimpleDto {
    id: number;
    code: string;
    name: string;
    enName: string;
    hsCode: string;
  }

  /** 箱型 */
  export interface CtnCodeSimpleDto {
    id: number;
    ctnName: string;
    cabinetType: number;
    cabinetSize: string;
    ctnType: string;
    teu: number;
  }

  /** 箱型箱量 */
  export interface ReportCtnSimpleDto {
    ctnCode: CtnCodeSimpleDto;
    count: number;
  }

  /** 用户（干系人） */
  export interface UserSimpleDto {
    id: number;
    nickName: string;
    userAttribute: number;
  }

  /** 组织 */
  export interface OrganizationUnitSimpleDto {
    id: number;
    name: string;
    localCurrencyId?: number;
    localCurrencyCode: string;
  }

  /** 海空港口 */
  export interface SeaAirPortSimpleDto {
    id: number;
    isSeaPort: boolean;
    cnName: string;
    enName: string;
    code: string;
  }

  // ==================== 利润报表相关类型 ====================

  /** 利润报表查询参数 */
  export interface ProfitReportQueryDto {
    isMergeChangeOrder: boolean;
    bizType?: number;
    clientId?: string;
    mblNum?: string;
    commissionNum?: string;
    bizDateStart?: string;
    bizDateEnd?: string;
    cargoId?: number;
    settlementType?: number;
    orgId?: number;
    bookingAgentId?: string;
    carrierId?: number;
    yardId?: string;
    blType?: number;
    vessel?: string;
    innerVoyno?: string;
    polId?: number;
    polIsSeaPort?: boolean;
    podId?: number;
    podIsSeaPort?: boolean;
    saleUserIds?: number[];
    operationUserIds?: number[];
    customerServiceUserIds?: number[];
    documentationUserIds?: number[];
    lanerUserIds?: number[];
    overseasCustomerServiceUserIds?: number[];
    accountDateStart?: string;
    accountDateEnd?: string;
  }

  /** 利润币别明细 */
  export interface ProfitCurrencyDto {
    currency: CurrencySimpleDto;
    receivable: number;
    unReceived: number;
    payable: number;
    unPaid: number;
    profit: number;
  }

  /** 利润报表数据项 */
  export interface ProfitReportDto {
    // 业务信息
    transportOrderId: string;
    changeOrderId?: string;
    bizType: number;
    isOriginal: boolean;
    client: ClientSimpleDto;
    bookingAgent?: ClientSimpleDto | null;
    carrier?: CarrierSimpleDto | null;
    yard?: ClientSimpleDto | null;
    bizDate?: string;
    accountDate: string;
    mblNum: string;
    commissionNum: string;
    pol: SeaAirPortSimpleDto;
    pod: SeaAirPortSimpleDto;
    vessel?: string | null;
    innerVoyno?: string | null;
    ctns: ReportCtnSimpleDto[];
    cargoId: number;
    blType?: number | null;
    settlementType?: number | null;
    orgs: OrganizationUnitSimpleDto[];
    sales: UserSimpleDto[];
    operations: UserSimpleDto[];
    customerServices: UserSimpleDto[];
    documentations: UserSimpleDto[];
    laners: UserSimpleDto[];
    overseasCustomerServices: UserSimpleDto[];
    codeGoodss: CodeGoodsSimpleDto[];
    pkgs?: number;
    kgs?: number;
    cbm?: number;

    // 金额
    currencies: ProfitCurrencyDto[];
    totalReceivable: number;
    totalUnReceived: number;
    totalPayable: number;
    totalUnPaid: number;
    totalProfit: number;
    totalProfitRate?: number | null;
  }

  // ==================== 欠费报表相关类型 ====================

  /** 欠费报表查询参数（继承利润报表所有字段） */
  export interface ArrearsReportQueryDto extends ProfitReportQueryDto {
    paySide: number;
    settlementId?: string;
    settlementStatus?: number;
    paymentApplyStatus?: number;
    invoiceStatus?: number;
    isStatemented?: boolean;
    feeLocked?: boolean;
  }

  /** 欠费币别明细 */
  export interface ArrearsCurrencyDto {
    currency: CurrencySimpleDto;
    receivable: number;
    received: number;
    unReceived: number;
  }

  /** 欠费报表数据项 */
  export interface ArrearsReportDto extends Omit<
    ProfitReportDto,
    | 'currencies'
    | 'totalUnReceived'
    | 'totalPayable'
    | 'totalUnPaid'
    | 'totalProfit'
    | 'totalProfitRate'
  > {
    // 新增字段
    settlement?: ClientSimpleDto | null;
    feeLocked: boolean;
    settlementDate: string;
    overdueDays: number;
    invoiceNos: string[];
    currencies: ArrearsCurrencyDto[];
    totalReceivable: number;
    totalReceived: number;
    totalUnReceived: number;
  }

  // ==================== 海空港口分页相关类型 ====================

  /** 海空港口查询参数 */
  export interface SeaAirPortQueryDto {
    pageIndex?: number;
    pageSize?: number;
    keyword?: string;
    isSeaPort?: boolean;
    status?: number;
  }

  /** 海空港口分页列表响应 */
  export interface PagedListSeaAirPortSimpleDto {
    items: SeaAirPortSimpleDto[];
    totalCount: number;
    skipCount: number;
    maxResultCount: number;
    currentPage: number;
    totalPages: number;
  }
}

// ==================== 利润报表接口 ====================

/**
 * 获取利润报表列表（不分页）
 * @param data 查询参数
 */
async function getProfitReportList(data: ReportApi.ProfitReportQueryDto) {
  return requestClient.post<ReportApi.ProfitReportDto[]>(
    '/services/app/ReportAdmin/GetProfitReportListAsync',
    data,
  );
}

// ==================== 欠费报表接口 ====================

/**
 * 获取欠费报表列表（不分页）
 * @param data 查询参数
 */
async function getArrearsReportList(data: ReportApi.ArrearsReportQueryDto) {
  return requestClient.post<ReportApi.ArrearsReportDto[]>(
    '/services/app/ReportAdmin/GetArrearsReportListAsync',
    data,
  );
}

// ==================== 海空港口接口 ====================

/**
 * 获取海空港口合并分页列表
 * @param params 查询参数
 */
async function getSeaAirPortPagedList(params: ReportApi.SeaAirPortQueryDto) {
  const queryParams: Recordable<any> = {
    PageIndex: params.pageIndex || 1,
    PageSize: params.pageSize || 10,
    Keyword: params.keyword,
    IsSeaPort: params.isSeaPort,
    Status: params.status,
  };

  return requestClient.get<ReportApi.PagedListSeaAirPortSimpleDto>(
    '/services/app/PortCodeAdmin/GetSeaAirPortPagedListAsync',
    { params: queryParams },
  );
}

export { getProfitReportList, getArrearsReportList, getSeaAirPortPagedList };
