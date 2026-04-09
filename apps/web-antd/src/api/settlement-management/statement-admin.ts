import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';

export namespace StatementAdminApi {
  /** 费用币别分组输出 */
  export interface StatementCurrencyDto {
    currencyId: number;
    currencySortId: number;
    currencyCode?: string;
    currencyCnName?: string;
    currencyEnName?: string;
    receiveAmount: number;
    payAmount: number;
  }

  /** 费用和海出 */
  export interface OrderFeeAndSeaExportDto {
    statementCurrencyGroup?: StatementCurrencyDto[];
    orderFees?: OrderFeeAdminApi.OrderFeeDto[];
    transportOrder: ExpenseSubmissionAdminApi.TransportOrderSimpleDto;
  }

  /** 客户对账列表和详情输出 */
  export interface StatementDto {
    statementNum?: string;
    clientId: string;
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
    id: string;
  }
  /** 附件项 DTO（输入） */
  export interface AttachmentItemForItemInputDto {
    attachmentId?: number;
    displayOrder?: number;
    itemId?: string;
    url?: string;
    id?: number;
  }

  /** 客户对账新增Dto */
  export interface StatementAddDto {
    statementNum?: string;
    clientId: string;
    sortId?: number;
    startTime?: string | null;
    endTime?: string | null;
    description?: string;
    remark?: string;
    orderFeeIds?: string[];
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
    id?: string;
    attachments?: AttachmentItemForItemInputDto[];
  }

  /** 客户对账编辑Dto */
  export interface StatementEditDto {
    id: string;
    statementNum?: string;
    clientId?: string;
    startTime?: string | null;
    endTime?: string | null;
    sortId?: number;
    description?: string;
    remark?: string;
    attachments?: AttachmentItemForItemInputDto[];
  }

  /** 客户对账编辑费用Dto */
  export interface StatementEditFeesDto {
    id: string;
    orderFeeIds?: string[];
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
  export interface PagedListOfTransportOrderDto {
    skipCount: number;
    maxResultCount: number;
    items?: SeaExportAdminApi.TransportOrderDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }
  /** 查询参数 */
  export interface StatementQueryParams {
    Keyword?: string;
    StatementNum?: string;
    ClientId?: string;
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
    SettlementId: string;
    FeeCodeIds?: number[];
    ExceptFeeCodeIds?: number[];
    PaySide?: number;
    FeeStatus?: number;
    SettlementStatus?: number;
    InvoiceStatus?: number;
    CurrencyId?: number;
    ClientId?: string;
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
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

/**
 * 新增客户对账
 */
export const addStatement = (data: StatementAdminApi.StatementAddDto) => {
  return requestClient.post<string>(
    '/services/app/StatementAdmin/AddAsync',
    data,
  );
};

/**
 * 未对账费用按业务分组列表 不分页 给对账单加费用时用
 */
export const getOrderFeeGroup = (
  params: StatementAdminApi.OrderFeeGroupQueryParams,
) => {
  return requestClient.get<StatementAdminApi.PagedListOfTransportOrderDto>(
    '/services/app/StatementAdmin/GetOrderFeeGroupAsync',
    { params },
  );
};

/**
 * 删除客户对账
 */
export const deleteStatement = (params: { id?: string; ids?: string[] }) => {
  return requestClient.delete<boolean>(
    '/services/app/StatementAdmin/DeleteAsync',
    {
      data: params,
    },
  );
};

/**
 * 批量删除客户对账
 */
export const batchDeleteStatements = (ids: string[]) => {
  return requestClient.delete<boolean>(
    '/services/app/StatementAdmin/DeleteAsync',
    {
      data: { Ids: ids },
    },
  );
};

/**
 * 编辑客户对账-只编辑主表信息，不编辑关联费用 关联费用只能通过加费用接口来编辑
 */
export const editStatement = (data: StatementAdminApi.StatementEditDto) => {
  return requestClient.put<boolean>(
    '/services/app/StatementAdmin/EditAsync',
    data,
  );
};

/**
 * 添加费用关联
 */
export const addStatementFees = (
  data: StatementAdminApi.StatementEditFeesDto,
) => {
  return requestClient.put<void>(
    '/services/app/StatementAdmin/AddFeesAsync',
    data,
  );
};

/**
 * 移除费用关联
 */
export const removeStatementFees = (
  data: StatementAdminApi.StatementEditFeesDto,
) => {
  return requestClient.put<void>(
    '/services/app/StatementAdmin/RemoveFeesAsync',
    data,
  );
};

/**
 * 获取客户对账列表分页数据
 */
export const getStatementPagedList = async (params: Recordable<any>) => {
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

  return requestClient.get<StatementAdminApi.PagedListOfStatementDto>(
    '/services/app/StatementAdmin/GetPagedListAsync',
    { params: queryParams },
  );
};

/**
 * 获取客户对账详情
 */
export const getStatementDetail = (id: string) => {
  return requestClient.get<StatementAdminApi.StatementDto>(
    '/services/app/StatementAdmin/DetailAsync',
    { params: { Id: id } },
  );
};
