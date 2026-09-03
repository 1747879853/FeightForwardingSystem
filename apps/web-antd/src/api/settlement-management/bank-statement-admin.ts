import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { requestClient } from '#/api/request';

const API_ADMIN_PREFIX = '/services/app/BankStatementAdmin';
const API_PREFIX = '/services/app/BankStatement';

export namespace BankStatementAdminApi {
  // ==================== 枚举定义 ====================

  /** 银行流水核销状态 */
  export enum BankStatementWriteOffStatus {
    /** 待核销：没有对应的收费结算 */
    PendingWriteOff = 0,
    /** 部分核销：收费结算总结算金额 ≠ 银行流水 amount */
    PartialWriteOff = 1,
    /** 核销完成：收费结算总结算金额 = 银行流水 amount */
    WriteOffCompleted = 2,
  }

  /** 银行流水分组统计字段 */
  export enum BankStatementGroupField {
    /** 付款方 */
    Settlement = 1,
    /** 我司银行 */
    OrgBankAccount = 2,
    /** 对方银行 */
    ClientInvoiceBank = 3,
    /** 核销状态 */
    WriteOffStatus = 4,
  }

  // ==================== DTO 定义 ====================

  /** 操作人添加 DTO */
  export interface BankStatementUserAddDto {
    operationId: number;
    remark?: string;
  }

  /** 操作人 DTO */
  export interface BankStatementUserDto {
    id: string;
    bankStatementId: string;
    operationId: number;
    remark?: string;
    operationName?: string;
  }

  /** 业务单据用客户简易对象（往来单位对象化） */
  export interface ClientSimpleDtoForOrder {
    id: string;
    /** 客户简称 */
    name?: string;
    /** 客户全称 */
    fullName?: string;
    /** 默认地址 */
    address?: string;
  }

  /** 币别简易对象（无 id，外层保留 currencyId） */
  export interface CurrencySimpleDto {
    code?: string;
    cnName?: string;
    enName?: string;
  }

  /** 公司银行账户简易对象 */
  export interface OrgBankAccountSimpleDto {
    id?: string;
    bankName?: string;
    bankAccount?: string;
    accountName?: string;
    currencyId?: number;
    swiftCode?: string;
  }

  /** 客户开票银行简易对象 */
  export interface ClientInvoiceBankSimpleDto {
    id?: string;
    bankName?: string;
    bankAccount?: string;
    accountName?: string;
    currencyId?: number;
    swiftCode?: string;
  }

  /** 新增银行流水 DTO */
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
    /** 是否公司节点 */
    isCompany?: boolean;
  }

  export interface BankStatementAddDto {
    /** 归属组织id */
    orgId: number;
    amount: number;
    currencyId: number;
    statementTime: string;
    transactionFee?: number;
    statementRemark?: string;
    remark?: string;
    orgBankAccountId?: string;
    settlementId: string;
    clientInvoiceBankId?: string;
    message?: string;
    bankStatementUsers?: BankStatementUserAddDto[];
  }

  /** 修改银行流水 DTO */
  export interface BankStatementEditDto {
    id: string;
    /** 归属组织id */
    orgId: number;
    amount: number;
    currencyId: number;
    statementTime: string;
    transactionFee?: number;
    statementRemark?: string;
    remark?: string;
    orgBankAccountId?: string;
    settlementId: string;
    clientInvoiceBankId?: string;
    message?: string;
    bankStatementUsers?: BankStatementUserAddDto[];
  }

  /** 删除银行流水 DTO */
  export interface BankStatementDeleteDto {
    id: string;
  }

  /**
   * 银行流水详情内嵌的收费核销单（含明细）。
   * 与 `ReceiveSettlementListDto` 不同：不带 `itemCount`，但带两类明细子表，
   * 且不受「仅本人创建」过滤，是同一流水下全部核销明细的唯一来源。
   */
  export interface BankStatementReceiveSettlementDto {
    id: string;
    bankStatementId: string;
    settlementNo?: string;
    status: number;
    /** 结算类型 0 按费用(按业务) 1 按开票申请 */
    type?: number;
    settlementTime: string;
    locked: boolean;
    lockeTime?: string;
    remark?: string;
    creatorUserName?: string;
    creatorUserNickName?: string;
    bankStatementNo?: string;
    totalSettledAmount: number;
    userId?: number;
    /** 归属组织id */
    orgId?: null | number;
    receiveSettlementItems?: ReceiveSettlementAdminApi.ReceiveSettlementItemDetailDto[];
    receiveSettlementInvoiceItems?: ReceiveSettlementAdminApi.ReceiveSettlementInvoiceItemDetailDto[];
  }

  /** 银行流水详情 DTO */
  export interface BankStatementDetailDto {
    id: string;
    bankStatementNo?: string;
    amount: number;
    currencyId: number;
    statementTime: string;
    transactionFee?: number;
    statementRemark?: string;
    remark?: string;
    orgBankAccountId?: string;
    settlementId: string;
    clientInvoiceBankId?: string;
    message?: string;
    /** 结算对象（客户简易对象，无则为 null） */
    settlement?: ClientSimpleDtoForOrder | null;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    creatorUserName?: string;
    /** 公司银行账户对象（替代 orgBankAccountName） */
    orgBankAccount?: OrgBankAccountSimpleDto | null;
    /** 客户开票银行对象（替代 clientInvoiceBankName） */
    clientInvoiceBank?: ClientInvoiceBankSimpleDto | null;
    bankStatementUsers?: BankStatementUserDto[];
    /** 本流水下的全部收费核销单（含明细，不限创建人） */
    receiveSettlements?: BankStatementReceiveSettlementDto[];
    /** 归属组织id */
    orgId?: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
    /** 已结算金额（收为正、付为负） */
    settledAmount?: number;
    /** 核销状态 */
    writeOffStatus?: BankStatementWriteOffStatus;
  }

  /** 银行流水列表 DTO */
  export interface BankStatementListDto {
    id: string;
    bankStatementNo?: string;
    amount: number;
    currencyId: number;
    statementTime: string;
    transactionFee?: number;
    statementRemark?: string;
    remark?: string;
    orgBankAccountId?: string;
    settlementId: string;
    clientInvoiceBankId?: string;
    message?: string;
    /** 结算对象（客户简易对象，无则为 null） */
    settlement?: ClientSimpleDtoForOrder | null;
    /** 币别对象（替代 currencyCode，编码读 code） */
    currency?: CurrencySimpleDto | null;
    creatorUserName?: string;
    /** 公司银行账户对象（替代 orgBankAccountName） */
    orgBankAccount?: OrgBankAccountSimpleDto | null;
    /** 客户开票银行对象（替代 clientInvoiceBankName） */
    clientInvoiceBank?: ClientInvoiceBankSimpleDto | null;
    bankStatementUsers?: BankStatementUserDto[];
    userId?: number;
    /** 归属组织id */
    orgId?: null | number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: null | OrganizationUnitSimpleDto[];
    /**
     * 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找。
     * 非管理端 `/BankStatement/GetPagedListAsync` 未做数据权限填充，恒为 null。
     */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
    creationTime: string;
    /** 已结算金额（收为正、付为负） */
    settledAmount?: number;
    /** 核销状态 */
    writeOffStatus?: BankStatementWriteOffStatus;
  }

  /** 收费结算列表 DTO */
  export interface ReceiveSettlementListDto {
    id: string;
    bankStatementId: string;
    settlementNo?: string;
    status: number;
    /** 结算类型 0 按费用(按业务) 1 按开票申请 */
    type?: number;
    settlementTime: string;
    locked: boolean;
    lockeTime?: string;
    remark?: string;
    creatorUserName?: string;
    bankStatementNo?: string;
    totalSettledAmount: number;
    itemCount: number;
    creationTime: string;
  }

  /** 分页列表响应 */
  export interface PagedList<T> {
    totalCount: number;
    items: T[];
  }

  /** 银行流水查询参数 */
  export interface BankStatementQueryDto {
    bankStatementNo?: string;
    settlementId?: string;
    orgBankAccountId?: string;
    /** 仅返回我司银行未填写记录；仅 true 生效，与 orgBankAccountId 互斥 */
    orgBankAccountIdEmpty?: boolean;
    clientInvoiceBankId?: string;
    /** 仅返回对方银行未填写记录；仅 true 生效，与 clientInvoiceBankId 互斥 */
    clientInvoiceBankIdEmpty?: boolean;
    currencyId?: number;
    statementTimeStart?: string;
    statementTimeEnd?: string;
    creatorUserId?: number;
    orgId?: number;
    writeOffStatus?: BankStatementWriteOffStatus;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }

  /** 银行流水分组统计入参：与列表共用筛选条件 */
  export type BankStatementGroupedQueryDto = Omit<
    BankStatementQueryDto,
    'pageIndex' | 'pageSize'
  > & {
    groupField: BankStatementGroupField;
  };

  /** 银行流水分组统计项 */
  export interface BankStatementGroupDto {
    /** 核销状态为 0/1/2 字符串；可空银行的未填写分组为 null */
    id: null | string;
    name: null | string;
    count: number;
  }

  /** 银行流水下收费结算查询参数 */
  export interface BankStatementReceiveSettlementQueryDto {
    bankStatementId: string;
    settlementNo?: string;
    pageIndex: number;
    pageSize: number;
    sorting?: string;
  }
}

// ==================== Admin API 函数 ====================

/** 新增银行流水 */
export const addBankStatement = (
  data: BankStatementAdminApi.BankStatementAddDto,
) => {
  return requestClient.post<string>(`${API_ADMIN_PREFIX}/AddAsync`, data);
};

/** 修改银行流水 */
export const editBankStatement = (
  data: BankStatementAdminApi.BankStatementEditDto,
) => {
  return requestClient.put<boolean>(`${API_ADMIN_PREFIX}/EditAsync`, data);
};

/** 删除银行流水 */
export const deleteBankStatement = (
  data: BankStatementAdminApi.BankStatementDeleteDto,
) => {
  return requestClient.delete<boolean>(`${API_ADMIN_PREFIX}/DeleteAsync`, {
    data,
  });
};

/** 获取银行流水详情（Admin） */
export const getBankStatementDetail = (id: string) => {
  return requestClient.get<BankStatementAdminApi.BankStatementDetailDto>(
    `${API_ADMIN_PREFIX}/DetailAsync`,
    { params: { id } },
  );
};

/** 获取银行流水详情（按当前用户权限） */
export const getBankStatementDetailByPermission = (id: string) => {
  return requestClient.get<BankStatementAdminApi.BankStatementDetailDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { id } },
  );
};

/** 获取银行流水分页列表（Admin） */
export const getBankStatementPagedList = (
  params: BankStatementAdminApi.BankStatementQueryDto,
) => {
  return requestClient.get<
    BankStatementAdminApi.PagedList<BankStatementAdminApi.BankStatementListDto>
  >(`${API_ADMIN_PREFIX}/GetPagedListAsync`, { params });
};

/** 获取银行流水分页列表（按当前用户权限过滤：操作人包含当前用户或未配置操作人） */
export const getBankStatementPagedListByPermission = (
  params: BankStatementAdminApi.BankStatementQueryDto,
) => {
  return requestClient.get<
    BankStatementAdminApi.PagedList<BankStatementAdminApi.BankStatementListDto>
  >(`${API_PREFIX}/GetPagedListAsync`, { params });
};

/** 获取银行流水分组统计（Admin） */
export const getBankStatementGroupedList = (
  params: BankStatementAdminApi.BankStatementGroupedQueryDto,
) => {
  return requestClient.get<BankStatementAdminApi.BankStatementGroupDto[]>(
    `${API_ADMIN_PREFIX}/GetGroupedListAsync`,
    { params },
  );
};

/** 获取银行流水分组统计（按当前用户权限） */
export const getBankStatementGroupedListByPermission = (
  params: BankStatementAdminApi.BankStatementGroupedQueryDto,
) => {
  return requestClient.get<BankStatementAdminApi.BankStatementGroupDto[]>(
    `${API_PREFIX}/GetGroupedListAsync`,
    { params },
  );
};

/** 获取银行流水下的收费结算分页列表（Admin） */
export const getBankStatementReceiveSettlementPagedList = (
  params: BankStatementAdminApi.BankStatementReceiveSettlementQueryDto,
) => {
  return requestClient.get<
    BankStatementAdminApi.PagedList<BankStatementAdminApi.ReceiveSettlementListDto>
  >(`${API_ADMIN_PREFIX}/GetReceiveSettlementPagedListAsync`, { params });
};

/** 获取银行流水下的收费结算分页列表（按当前用户权限） */
export const getBankStatementReceiveSettlementPagedListByPermission = (
  params: BankStatementAdminApi.BankStatementReceiveSettlementQueryDto,
) => {
  return requestClient.get<
    BankStatementAdminApi.PagedList<BankStatementAdminApi.ReceiveSettlementListDto>
  >(`${API_PREFIX}/GetReceiveSettlementPagedListAsync`, { params });
};
