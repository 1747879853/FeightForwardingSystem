import { requestClient } from '#/api/request';

import type { OrderFeeAdminApi } from '../sea-export/order-fee-admin';

export namespace ExpenseSubmissionAdminApi {
  export interface SubmitOrderFeeDto {
    /** 业务表id  */
    transportOrderId?: string;

    /** 备注 */
    remark?: string;

    /** 费用列表 */
    orderFees?: OrderFeeAdminApi.OrderFeeEditDto[];
  }

  export interface ModifyOrderFeeDto {
    /** 业务表id  */
    transportOrderId?: string;

    /** 备注 */
    remark?: string;

    /** 费用列表 */
    orderFees?: OrderFeeAdminApi.OrderFeeEditDto[];
  }

  export interface DeleteOrderFeeDto {
    /** 业务表id  */
    transportOrderId?: string;

    /** 备注 */
    remark?: string;

    /** 费用列表 */
    orderFeeIds?: string[];
  }
  export interface TransportOrderSimpleDto {
    /** 货好时间 */
    goodsCompleteTime?: string | null;

    /** 开船日期 */
    etd?: string | null;

    /** 预抵日期 */
    eta?: string | null;

    /** 销售 (客户) */
    saleNames?: string[] | null;

    /** 操作 (客户) */
    operatorNames?: string[] | null;

    /** 起运港 id */
    seaExportPOLId?: number | null;

    /** 起运港 CnName */
    seaExportPOLCnName?: string | null;

    /** 目的港 id */
    seaExportPODId?: number | null;

    /** 目的港 CnName */
    seaExportPODCnName?: string | null;

    /** 船名 */
    seaExportVessel?: string | null;

    /** 航次 */
    seaExportInnerVoyno?: string | null;

    /** 业务类型 */
    bizType?: number;

    /** 委托编号 自动生成 */
    commissionNum?: string | null;

    /** 会计期间 只取月的部分 根据开船日期生成 若没有开船日期 则根据创建日期生成 */
    accountDate: string;

    /** 应结日期 根据委托单位账期计算 */
    settlementDate: string;

    /** 业务来源 */
    codeSourceId?: number | null;

    /** 是否业务锁定 整票的 */
    isBusinessLocking?: boolean;

    /** 主提单号 */
    mblNum?: string | null;

    /** 订舱编号 */
    bookingNum?: string | null;

    /** 内部备注 */
    internalRemark?: string | null;

    /** 委托单位 id */
    clientId: string;

    /** 件数 */
    pkgs?: number | null;

    /** 包装 id */
    codePackageId?: number | null;

    /** 包装名 */
    codePackageName?: string | null;

    /** 毛重 */
    grossWeight?: number | null;

    /** 皮重 */
    tareWeight?: number | null;

    /** 备注 */
    remark?: string | null;

    /** 委托单位名 */
    clientName?: string | null;

    /** 是否已删除 */
    isDeleted: boolean;

    /** 删除人 ID */
    deleterUserId?: number | null;

    /** 删除时间 */
    deletionTime?: string | null;

    /** 最后修改时间 */
    lastModificationTime?: string | null;

    /** 最后修改人 ID */
    lastModifierUserId?: number | null;

    /** 创建时间 */
    creationTime: string;

    /** 创建人 ID */
    creatorUserId?: number | null;

    /** 主键 ID */
    id: string;
  }

  /** 	任务明细 */
  export interface OrderFeeTaskDto {
    /** 主键 id（新增时为 0，编辑时必填） */
    id: string;

    /** 任务 id */
    taskBaseId?: string | null;

    /** 任务类型 */
    taskType?: number;

    /** 任务状态 */
    taskStatus?: number;

    /** 所属模块 */
    frightModule?: number;

    /** 模块对应 id */
    entityId: string;

    /** 原始信息 修改前的 存在这里 json 格式 修改后再存 */
    originalInfo?: string | null;

    /** 任务信息 要修改为的 存在这里 json 格式 */
    info?: string | null;

    /** 审核人 ID */
    auditUserId?: number | null;

    /** 审核人姓名 */
    auditUserName?: string | null;

    /** 审核时间 */
    auditTime?: string | null;

    /** 备注 */
    remark?: string | null;

    /** 任务创建人 - 也就是任务提交人 */
    creatorUserName?: string | null;

    orderFee?: OrderFeeAdminApi.OrderFeeDto;
  }
  export interface OrderFeeAuditListDto {
    id: string;
    entityId?: string;
    remark?: string;
    transportOrder: TransportOrderSimpleDto;
    creatorUserName?: string;
    taskItemCount?: number;
    orderFeeTasks?: OrderFeeAndTaskDto[];
  }
  export interface PagedListOfOrderFeeAuditListDto {
    skipCount?: number;
    maxResultCount?: number;
    items: OrderFeeAuditListDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  export interface GetPagedListParams {
    Processed?: boolean;
    Remark?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  export interface SubmitOrderFeeAuditDto {
    /** taskbase 的 id */
    id: number;

    /** 审核意见 是否通过 */
    success: boolean;

    /** 备注 */
    remark?: string | null;

    /** 费用列表 所有费用都只能是待审核状态 */
    orderFeeIds?: string[] | null;
  }

  export interface TaskItemDto {
    /** 主键 id（新增时为 0，编辑时必填） */
    id: string;
    /** 任务 ID */
    taskBaseId: string;

    /** 任务类型 */
    taskType?: number;

    /** 任务状态 */
    taskStatus?: number;

    /** 所属模块 */
    frightModule?: number;

    /** 模块对应 id */
    entityId?: string;

    /** 原始信息 修改前的 存在这里 json 格式 修改后再存 */
    originalInfo?: string | null;

    /** 任务信息 要修改为的 存在这里 json 格式 */
    info?: string | null;

    /** 审核人 ID */
    auditUserId?: number | null;

    /** 审核人姓名 */
    auditUserName?: string | null;

    /** 审核时间 */
    auditTime?: string | null;

    /** 备注 */
    remark?: string | null;

    /** 任务创建人 - 也就是任务提交人 */
    creatorUserName?: string | null;
  }

  export interface OrderFeeAndTaskDto extends OrderFeeAdminApi.OrderFeeDto {
    task?: TaskItemDto;
  }

  export interface SubmitOrderFeeRejectedDto {
    /** taskbase 的 id */
    id: string;

    /** 驳回意见 */
    remark?: string | null;

    orderFeeIds: string[];
  }

  export interface SubmitOrderFeeWithdrawDto {
    /** taskbase 的 id */
    id: string;

    orderFeeIds: string[];
  }
  export interface OrderFeeTaskWithdrawDto {
    orderFeeIds: string[];
  }

  export interface PagedListOfOrderFeeTaskListDto {
    skipCount?: number;
    maxResultCount?: number;
    items: OrderFeeTaskListDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  export interface OrderFeeTaskListDto {
    id: string;

    /** 关联业务id 就是TransportOrder.Id */
    entityId?: string;

    /** 应付费用最小状态(没有就是空)*/
    feeStatusPay?: number;

    /** 应收费用最小状态(没有就是空)*/
    feeStatusReceive?: number;

    remark?: string;

    transportOrder: TransportOrderSimpleDto;

    creatorUserName?: string;

    /** 本业务的费用提交待处理数量*/
    submitOrderFeeItemCount?: number;

    /* 本业务的费用提交待处理数量 */
    modifyOrderFeeItemCount?: number;

    /* 本业务的费用删除待处理数量 */
    deleteOrderFeeItemCount?: number;

    /** 一条费用一个子任务 子任务若有待处理的 则是最后一条待处理任务(待处理一般情况下只能有一条 所以最后一条是多余操作) 若无待处理的 则是最后一条审核完成的任务(因为最后一条审核完成的支持审核后驳回) 详情有这个字段*/
    orderFeeTasks?: OrderFeeAndTaskDto[];

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
  }

  export interface OrderFeeTaskAuditDto {
    /** 审核意见 是否通过 */
    success: boolean;

    /** 备注 */
    remark?: string | null;

    /** 费用列表 所有费用都只能是待审核状态 */
    orderFeeIds?: string[] | null;
  }

  export interface OrderFeeTaskRejectedDto {
    /** 驳回意见 */
    remark?: string | null;

    orderFeeIds: string[];
  }

  export interface OrderFeeTaskBatchAuditDto {
    /** 审核意见 是否通过 */
    success: boolean;

    /** 备注 */
    remark?: string | null;

    /** 业务id列表*/
    transportOrderIds?: string[] | null;
  }
}

const API_PREFIX = '/services/app/OrderFeeAdmin';

/** 费用提交任务 提交 费用可以不保存 此接口先保存费用 后提交审核 */
export const submitOrderFee = (
  data: ExpenseSubmissionAdminApi.SubmitOrderFeeDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/SubmitOrderFeeAsync`, data);
};

/** 费用申请修改任务 提交 */
export const modifyOrderFee = (
  data: ExpenseSubmissionAdminApi.ModifyOrderFeeDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/ModifyOrderFeeAsync`, data);
};

/** 费用申请删除任务 提交 */
export const deleteOrderFee = (
  data: ExpenseSubmissionAdminApi.DeleteOrderFeeDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/DeleteOrderFeeAsync`, data);
};

/** 获取费用提交审核列表 */
export const getSubmitOrderFeeList = (
  params: ExpenseSubmissionAdminApi.GetPagedListParams,
) => {
  return requestClient.get<ExpenseSubmissionAdminApi.PagedListOfOrderFeeAuditListDto>(
    `${API_PREFIX}/SubmitOrderFeeListAsync`,
    { params },
  );
};

export const submitOrderFeeDetailAsync = (params: { id: string }) => {
  return requestClient.get<ExpenseSubmissionAdminApi.OrderFeeAuditListDto>(
    `${API_PREFIX}/SubmitOrderFeeDetailAsync`,
    { params },
  );
};

/** 获费用提交任务 审核 */
export const submitOrderFeeAuditAsync = (
  data: ExpenseSubmissionAdminApi.SubmitOrderFeeAuditDto,
) => {
  return requestClient.post<number>(
    `${API_PREFIX}/SubmitOrderFeeAuditAsync`,
    data,
  );
};

/** 费用提交任务 审核后驳回 */
export const submitOrderFeeRejectedAsync = (
  data: ExpenseSubmissionAdminApi.SubmitOrderFeeRejectedDto,
) => {
  return requestClient.post<number>(
    `${API_PREFIX}/SubmitOrderFeeRejectedDto`,
    data,
  );
};

/**费用提交任务 撤销提交 */
export const submitOrderFeeWithdrawAsync = (
  data: ExpenseSubmissionAdminApi.SubmitOrderFeeWithdrawDto,
) => {
  return requestClient.post<number>(
    `${API_PREFIX}/SubmitOrderFeeWithdrawAsync`,
    data,
  );
};

/** 获取费用提交审核列表 */
export const getOrderFeeTaskList = (
  params: ExpenseSubmissionAdminApi.GetPagedListParams,
) => {
  return requestClient.get<ExpenseSubmissionAdminApi.PagedListOfOrderFeeTaskListDto>(
    `${API_PREFIX}/OrderFeeTaskListAsync`,
    { params },
  );
};

/** 费用所有任务 详情 费用包含了已删除费用 参数传关联业务id 就是TransportOrder的Id  */
export const OrderFeeTaskDetailAsync = (params: { id: string }) => {
  return requestClient.get<ExpenseSubmissionAdminApi.OrderFeeTaskListDto>(
    `${API_PREFIX}/OrderFeeTaskDetailAsync`,
    { params },
  );
};

/** 全部费用任务 审核 */
export const OrderFeeAuditAsync = (
  data: ExpenseSubmissionAdminApi.OrderFeeTaskAuditDto,
) => {
  return requestClient.post<number>(
    `${API_PREFIX}/OrderFeeTaskAuditAsync`,
    data,
  );
};

/** 全部费用任务 审核后驳回 */
export const OrderFeeRejectedAsync = (
  data: ExpenseSubmissionAdminApi.OrderFeeTaskRejectedDto,
) => {
  return requestClient.post<number>(
    `${API_PREFIX}/OrderFeeTaskRejectedAsync`,
    data,
  );
};

/**费用全部任务 撤销提交 */
export const OrderFeeTaskWithdraw = (
  data: ExpenseSubmissionAdminApi.OrderFeeTaskWithdrawDto,
) => {
  return requestClient.post<number>(
    `${API_PREFIX}/OrderFeeTaskWithdrawAsync`,
    data,
  );
};

/**费用所有任务 批量审核 只审核待审核的 不能进行审核后驳回操作 */
export const OrderFeeTaskBatchAudit = (
  data: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditDto,
) => {
  return requestClient.post<number>(
    `${API_PREFIX}/OrderFeeTaskBatchAuditAsync`,
    data,
  );
};
