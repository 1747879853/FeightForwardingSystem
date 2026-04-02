import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

export namespace StatementAdminApi {
  /** 币别分组输出 */
  export interface StatementCurrencyDto {
    currencyId: number;
    currencySortId: number;
    currencyCode?: string;
    currencyCnName?: string;
    currencyEnName?: string;
    receiveAmount: number;
    payAmount: number;
  }

  /** 简易运输订单输出 */
  export interface TransportOrderSimpleDto {
    goodsCompleteTime?: string;
    etd?: string;
    eta?: string;
    saleNames?: string[];
    operatorNames?: string[];
    seaExportPOLId?: number;
    seaExportPOLCnName?: string;
    seaExportPODId?: number;
    seaExportPODCnName?: string;
    seaExportVessel?: string;
    seaExportInnerVoyno?: string;
    bizType: number;
    commissionNum?: string;
    accountDate: string;
    settlementDate: string;
    codeSourceId?: number;
    isBusinessLocking: boolean;
    mblNum?: string;
    bookingNum?: string;
    internalRemark?: string;
    clientId: number;
    pkgs?: number;
    codePackageId?: number;
    codePackageName?: string;
    grossWeight?: number;
    tareWeight?: number;
    remark?: string;
    clientName?: string;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: number;
  }

  /** 费用和海出 DTO */
  export interface OrderFeeAndSeaExportDto {
    statementCurrencyGroup?: StatementCurrencyDto[];
    orderFees?: OrderFeeAdminApi.OrderFeeDto[];
    transportOrder: TransportOrderSimpleDto;
  }

  /** 客户对账列表和详情输出 */
  export interface StatementDto {
    statementNum?: string;
    clientId: number;
    sortId: number;
    remark?: string;
    userId: number;
    tenantId: number;
    clientName?: string;
    clientCode?: string;
    creatorUserName?: string;
    mblNums?: string[];
    statementCurrencyGroup?: StatementCurrencyDto[];
    orderFeeGroups?: OrderFeeAndSeaExportDto[];
    localCurrencyId?: number;
    localCurrencyCode?: string;
    localCurrencyReceiveAmount: number;
    localCurrencyPayAmount: number;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: number;
  }

  /** 客户对账新增 DTO */
  export interface StatementAddDto {
    statementNum?: string;
    clientId: number;
    sortId: number;
    remark?: string;
    orderFeeIds?: number[];
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
    id?: number;
  }

  /** 客户对账编辑 DTO */
  export interface StatementEditDto {
    id: number;
    statementNum?: string;
    clientId: number;
    sortId: number;
    remark?: string;
  }

  /** 客户对账编辑费用 DTO */
  export interface StatementEditFeesDto {
    id: number;
    orderFeeIds?: number[];
  }

  /** 分页数据封装 */
  export interface PagedListOfStatementDto {
    skipCount: number;
    maxResultCount: number;
    items?: StatementDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 查询参数 */
  export interface StatementQueryParams {
    Keyword?: string;
    StatementNum?: string;
    ClientId?: number;
    CreationStartTime?: string;
    CreationEndTime?: string;
    CreatorUserId?: number;
    MblNum?: string;
    ETDStart?: string;
    ETDEnd?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  /** GetOrderFeeGroupAsync 查询参数 */
  export interface OrderFeeGroupQueryParams {
    AccountDateStart?: string;
    AccountDateEnd?: string;
    SettlementId: number;
    FeeCodeIds?: number[];
    PaySide?: number;
    FeeStatus?: number;
    SettlementStatus?: number;
    InvoiceStatus?: number;
    CurrencyId?: number;
    ClientId?: number;
    Keyword?: string;
    BizType?: number;
    ETDStart?: string;
    ETDEnd?: string;
    POLId?: number;
    PODId?: number;
    OrgId?: number;
    SaleId?: number;
    OperatorId?: number;
    CustomerServiceId?: number;
  }
}

/**
 * 获取客户对账列表分页数据
 */
async function getStatementPagedList(params: Recordable<any>) {
  const queryParams: StatementAdminApi.StatementQueryParams = {
    Keyword: params.Keyword || params.keyword,
    StatementNum: params.StatementNum || params.statementNum,
    ClientId: params.ClientId || params.clientId,
    CreationStartTime: params.CreationStartTime || params.creationStartTime,
    CreationEndTime: params.CreationEndTime || params.creationEndTime,
    CreatorUserId: params.CreatorUserId || params.creatorUserId,
    MblNum: params.MblNum || params.mblNum,
    ETDStart: params.ETDStart || params.etdStart,
    ETDEnd: params.ETDEnd || params.etdEnd,
    Sorting: params.Sorting || 'Id desc',
    PageIndex: params.PageIndex || params.pageIndex || 1,
    PageSize: params.PageSize || params.pageSize || 10,
  };

  const response =
    await requestClient.get<StatementAdminApi.PagedListOfStatementDto>(
      '/services/app/StatementAdmin/GetPagedListAsync',
      { params: queryParams },
    );

  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

/**
 * 获取客户对账详情
 */
async function getStatementDetail(id: number) {
  return requestClient.get<StatementAdminApi.StatementDto>(
    '/services/app/StatementAdmin/DetailAsync',
    { params: { Id: id } },
  );
}

/**
 * 新增客户对账
 */
async function createStatement(data: StatementAdminApi.StatementAddDto) {
  return requestClient.post<number>(
    '/services/app/StatementAdmin/AddAsync',
    data,
  );
}

/**
 * 编辑客户对账-只编辑主表信息
 */
async function updateStatement(data: StatementAdminApi.StatementEditDto) {
  return requestClient.put<boolean>(
    '/services/app/StatementAdmin/EditAsync',
    data,
  );
}

/**
 * 删除客户对账
 */
async function deleteStatement(id: number) {
  return requestClient.delete<boolean>(
    '/services/app/StatementAdmin/DeleteAsync',
    {
      params: { Id: id },
    },
  );
}

/**
 * 批量删除客户对账
 */
async function batchDeleteStatements(ids: number[]) {
  return requestClient.delete<boolean>(
    '/services/app/StatementAdmin/DeleteAsync',
    {
      params: { Ids: ids },
    },
  );
}

/**
 * 添加费用关联
 */
async function addStatementFees(data: StatementAdminApi.StatementEditFeesDto) {
  return requestClient.put<void>(
    '/services/app/StatementAdmin/AddFeesAsync',
    data,
  );
}

/**
 * 移除费用关联
 */
async function removeStatementFees(
  data: StatementAdminApi.StatementEditFeesDto,
) {
  return requestClient.put<void>(
    '/services/app/StatementAdmin/RemoveFeesAsync',
    data,
  );
}

/**
 * 获取未对账费用按业务分组列表
 */
async function getOrderFeeGroup(
  params: StatementAdminApi.OrderFeeGroupQueryParams,
) {
  return requestClient.get<SeaExportAdminApi.TransportOrderDto[]>(
    '/services/app/StatementAdmin/GetOrderFeeGroupAsync',
    { params },
  );
}

export {
  addStatementFees,
  batchDeleteStatements,
  createStatement,
  deleteStatement,
  getOrderFeeGroup,
  getStatementDetail,
  getStatementPagedList,
  removeStatementFees,
  updateStatement,
};
