import { requestClient } from '#/api/request';
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import type { SeaImportAdminApi } from './sea-import-admin';
const API_PREFIX = '/services/app/OrderFeeAdmin';

export namespace OrderFeeAdminApi {
  /**
   * 新增字段说明：
  分类 字段  说明
  展示字段  feeCodeName、currencyName、settlementName         关联表的名称展示
  计算字段  unInvoicedAmount、noTaxUnitPrice、noTaxAmount     服务端计算返回
  审计字段  isDeleted、creationTime、lastModificationTime 等   ABP 框架标准审计属性

  主键  id  记录唯一标识
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
    unitEmum: number;

    /** 数量 */
    quantity: number;

    /** 税率 */
    taxRate: number;

    /** 不含税单价 */
    noTaxUnitPrice: number;

    /** 不含税金额 */
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
    canInvoice: boolean;

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
    transportOrderId: string;

    /** 更改单 id */
    changeOrderId?: string;

    /**收付类型 */
    paySide: number;

    /** 费用状态 */
    feeStatus: number;

    /** 任务状态 */
    taskStatus?: string;

    /** 开票状态 */
    invoiceStatus: number;

    /** 结算状态 */
    settlementStatus: number;

    submitOrderFeeTasks?: ExpenseSubmissionAdminApi.TaskItemDto[];
    modifyOrderFeeTasks?: ExpenseSubmissionAdminApi.TaskItemDto[];
    deleteOrderFeeTasks?: ExpenseSubmissionAdminApi.TaskItemDto[];

    /** 所属用户权限id 不要用CreatorUserId 创建是创建 所属人是所属人 */
    userId?: number;

    /** 所属组织id(通过用户id算的) */
    organizationUnits?: SeaImportAdminApi.OrganizationUnitSimpleDto[];

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
    unitEmum: number;

    /** 数量 */
    quantity: number;

    /** 税率 */
    taxRate: number;

    /** 付费申请金额 */
    rqstPaymentAmount: number;

    /** 已开票金额 */
    invoicedAmount: number;

    /** 未付费金额 */
    unRqstPaymentAmount: number;

    /** 未结算金额 */
    unSettledAmount: number;

    /** 发票申请金额 */
    orderInvoiceAmount: number;

    /** 已结算金额 */
    settledAmount: number;

    /** 是否允许开票 */
    canInvoice: boolean;

    /** 是否机密 配合机密权限控制读写 */
    isConfidential: boolean;

    /** 数据录入方式 */
    dataEntryMethod: number;

    /** 备注 */
    remark?: string;

    /** 本位币code */
    localCurrencyCode: string;

    /** 费用代码名称 */
    feeCodeName?: string;

    /** 币别名称 */
    currencyName?: string;

    /** 结算对象名称 */
    settlementName?: string;

    /** 未开票金额 (计算字段) */
    unInvoicedAmount: number;

    /** 不含税单价 (计算字段) */
    noTaxUnitPrice: number;

    /** 不含税金额 (计算字段) */
    noTaxAmount: number;

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

  /** 新增业务费用 */
  export const addOrderFee = (data: OrderFeeAdminApi.OrderFeeAddDto) => {
    return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
  };
}

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
