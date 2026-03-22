import { requestClient } from '#/api/request';

import type { OrderFeeAdminApi } from '../sea-export/order-fee-admin';

export namespace ExpenseSubmissionAdminApi {
  export interface SubmitOrderFeeDto {
    /** 业务表id  */
    transportOrderId?: number;

    /** 备注 */
    remark?: string;

    /** 费用列表 */
    orderFees?: OrderFeeAdminApi.OrderFeeEditDto[];
  }

  export interface TransportOrderSimpleDto {
    /** 业务类型 */
    bizType?: number;
    /** 委托编号  */
    commissionNum?: string;
    accountDate?: string;
    settlementDate?: string;
    codeSourceId?: number;
    isBusinessLocking?: boolean;
    isFeeLocking?: boolean;
    mblNum?: string;
    bookingNum?: string;
    internalRemark?: string;
    clientId?: number;
    clientName?: string;
    remark?: string;
  }
  /** 	任务明细 */
  export interface OrderFeeTaskDto {
    id: number;
    taskStatus?: number;
    /**模块 */
    frightModule?: number;
    entityId?: number;
    auditUserId?: number;
    auditUserName?: string;
    auditTime?: string;
    remark?: string;
    orderFee?: OrderFeeAdminApi.OrderFeeDto;
  }
  export interface OrderFeeAuditListDto {
    id: number;
    entityId?: number;
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
    orderFeeIds?: number[] | null;
  }

  export interface TaskItemDto {
    /** 主键 id（新增时为 0，编辑时必填） */
    id: number;
    /** 任务 ID */
    taskBaseId: number;

    /** 任务类型 */
    taskType?: number;

    /** 任务状态 */
    taskStatus?: number;

    /** 所属模块 */
    frightModule?: number;

    /** 模块对应 id */
    entityId?: number;

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
  }

  export interface OrderFeeAndTaskDto extends OrderFeeAdminApi.OrderFeeDto {
    task?: TaskItemDto;
  }

  export interface SubmitOrderFeeRejectedAsync {
    /** taskbase 的 id */
    id: number;

    /** 驳回意见 */
    remark?: string | null;

    orderFeeIds: number[];
  }

  export interface SubmitOrderFeeWithdrawDto {
    /** taskbase 的 id */
    id: number;

    orderFeeIds: number[];
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
    id: number;
    entityId?: number;
    remark?: string;
    transportOrder: TransportOrderSimpleDto;
    creatorUserName?: string;
    submitOrderFeeItemCount?: number;
    modifyOrderFeeItemCount?: number;
    deleteOrderFeeItemCount?: number;
    orderFeeTasks?: OrderFeeAndTaskDto[];
  }
}

const API_PREFIX = '/services/app/OrderFeeAdmin';

/** 费用提交任务 提交 费用可以不保存 此接口先保存费用 后提交审核 */
export const submitOrderFee = (
  data: ExpenseSubmissionAdminApi.SubmitOrderFeeDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/SubmitOrderFeeAsync`, data);
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

export const submitOrderFeeDetailAsync = (params: { id: number }) => {
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
  data: ExpenseSubmissionAdminApi.SubmitOrderFeeRejectedAsync,
) => {
  return requestClient.post<number>(
    `${API_PREFIX}/SubmitOrderFeeRejectedAsync`,
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
export const OrderFeeTaskDetailAsync = (params: { id: number }) => {
  return requestClient.get<ExpenseSubmissionAdminApi.OrderFeeTaskListDto>(
    `${API_PREFIX}/OrderFeeTaskDetailAsync`,
    { params },
  );
};
