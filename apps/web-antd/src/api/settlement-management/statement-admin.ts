import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';

export namespace StatementAdminApi {
  /** 结算状态枚举 */
  export enum SettlementStatus {
    /** 未结算 */
    UnSettled = 0,
    /** 部分结算 */
    PartialSettlement = 1,
    /** 结算完毕 */
    Settlemented = 2,
  }
  /** 组织机构简易DTO（组织串 orgs 元素） */
  export interface OrganizationUnitSimpleDto {
    /** 组织id */
    id: number;
    /** 组织名 */
    name?: string;
    /** 本位币id，可空 */
    localCurrencyId?: null | number;
    /** 本位币编码，可空 */
    localCurrencyCode?: null | string;
  }

  /** 币别简要对象 */
  export interface CurrencySimpleDto {
    code?: string;
    cnName?: string;
    enName?: string;
    defaultRate?: number;
  }

  /** 客户简要对象 */
  export interface ClientSimpleDto {
    id: string;
    name?: string;
    code?: string;
    fullName?: string;
    enName?: string;
  }

  /** 费用币别分组输出 */
  export interface StatementCurrencyDto {
    currencyId: number;
    currencySortId: number;
    /** 币别简要对象（替代 currencyCode / currencyCnName / currencyEnName） */
    currency?: CurrencySimpleDto | null;
    receiveAmount: number;
    payAmount: number;
  }

  /** 我司银行简易对象 */
  export interface OrgBankAccountSimpleDto {
    id: string;
    organizationUnitId: number;
    currencyId: number;
    currencyCode?: string;
    accountName?: string;
    bankShortName?: string;
    bankName?: string;
    bankAccount?: string;
    swiftCode?: string;
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
    startTime?: string | null;
    endTime?: string | null;
    description?: string;
    sortId: number;
    remark?: string;
    userId: number;
    tenantId: number;
    /** 客户简要对象（替代 clientName / clientCode） */
    client?: ClientSimpleDto | null;
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
    attachments?: AttachmentItemDto[];
    id: string;
    // 新增字段：收付类型汇总（0=全部为收，1=全部为付，2=收付都有）
    paySide?: number;
    // 新增字段：开票状态汇总（0=未开票，1=部分开票，2=已开票）
    invoiceStatus?: number;
    // 新增字段：结算状态汇总（0=未结算，1=部分结算，2=结算完毕）
    settlementStatus?: number;
    // 新增字段：我司银行id
    orgBankAccountId?: string | null;
    // 新增字段：我司银行对象
    orgBankAccount?: OrgBankAccountSimpleDto | null;

    orgId?: number;

    orgs?: OrganizationUnitSimpleDto[];
  }

  /** 附件项 DTO（详情输出） */
  export interface AttachmentItemDto {
    attachmentId: number;
    itemId?: string;
    moduleTypeId?: string;
    isFirstShow: boolean;
    displayOrder: number;
    url?: string;
    mediaType?: number;
    friendlyFileName?: string;
    id: number;
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
    orgId?: number;
    // 新增字段：我司银行id（非必填）
    orgBankAccountId?: string | null;
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
    // 新增字段：我司银行id（非必填，传null表示清空）
    orgId?: number;
    orgBankAccountId?: string | null;
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
    // 新增字段：收付类型筛选（0=全部为收，1=全部为付，2=收付都有）
    PaySide?: number | null;
    // 新增字段：开票状态筛选（0=未开票，1=部分开票，2=已开票）
    InvoiceStatus?: number | null;
    // 新增字段：结算状态筛选（0=未结算，1=部分结算，2=结算完毕）
    SettlementStatus?: number | null;
    orgId?: number;
    // 新增字段：我司银行id精确筛选
    OrgBankAccountId?: string | null;
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
    // 新增：多选操作和销售ID（后端需要支持）
    OperatorIds?: number[];
    SaleIds?: number[];
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
    {
      params,
      // ASP.NET Core [FromQuery] List 需 repeat：FeeCodeIds=1&FeeCodeIds=2，勿用 brackets
      paramsSerializer: 'repeat',
    },
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
    // 支持大写Sorting和小写sorting两种格式
    Sorting: params.Sorting || params.sorting || 'Id desc',
    PageIndex: params.PageIndex || params.pageIndex || 1,
    PageSize: params.PageSize || params.pageSize || 10,
    // 新增筛选参数
    PaySide: params.PaySide !== undefined ? params.PaySide : null,
    InvoiceStatus:
      params.InvoiceStatus !== undefined ? params.InvoiceStatus : null,
    OrgBankAccountId: params.OrgBankAccountId || null,
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
