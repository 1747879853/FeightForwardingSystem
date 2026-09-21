import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

import { UserAttribute } from './user-admin';

export { UserAttribute };

/** 任务类型 */
export enum TaskType {
  SubmitOrderFee = 0,
  ModifyOrderFee = 1,
  /** 禁止新建：与费用修改共用同一条工作流 */
  DeleteOrderFee = 2,
  PaymentApplication = 3,
  /** 业务联系单（与后端 FrightModule.PreOrder 同值） */
  PreOrder = 8,
  CommissionOrder = 10,
  /** 提单签出 */
  BillSignOut = 11,
  /** 新建客户审核 */
  SubmitClient = 90,
  /** 申请修改客户 */
  ModifyClient = 91,
  /** 枚举占位，客户模块未接入删除审核，配置页不要当作可用项 */
  DeleteClient = 92,
}

/** 通过方式 */
export enum WorkFlowPassMethod {
  Pass = 0,
  Or = 1,
  And = 2,
}

/**
 * 任务类型对应条件字段
 *
 * 费用提交与费用变更共用同一套费用条件（可比较的费用字段完全相同）。
 */
export enum TaskTypeCondition {
  /** 费用-业务所属人（取业务单 UserId，非提交人；仅等于/不等于） */
  OrderFeeUserId = 1,
  /** 费用-业务所属组织（取业务单 OrgId 并展开下级；仅属于/不属于） */
  OrderFeeOrgID = 2,
  /** 费用-收付类型（仅等于/不等于） */
  OrderFeePaySide = 4,
  /** 费用-业务类型（仅等于/不等于） */
  OrderFeeBizType = 5,
  /** 费用-利润（应收合计-应付合计，按原币金额*汇率折算；仅大小比较） */
  OrderFeeProfit = 6,
  /** 费用-利润率%（利润/应付合计*100，传百分比数值；仅大小比较） */
  OrderFeeProfitRate = 7,
  /** 费用-存在某个费用名应收小于应付（仅是/不是，无需填值） */
  OrderFeeHasReceiveLessThanPay = 8,
  /** 费用-存在应付费用名但应收没有对应费用名（仅是/不是，无需填值） */
  OrderFeeHasPayWithoutReceive = 9,
  /** 费用-存在应收费用名但应付没有对应费用名（仅是/不是，无需填值） */
  OrderFeeHasReceiveWithoutPay = 10,
  /** 付费申请人（仅等于/不等于） */
  PaymentApplicationUserId = 3001,
  /** 付费申请人组织（仅属于/不属于） */
  PaymentApplicationOrgID = 3002,
  /** 业务联系单申请人（仅等于/不等于） */
  PreOrderUserId = 8001,
  /** 业务联系单申请人组织（仅属于/不属于） */
  PreOrderOrgID = 8002,
  /** 提成人（仅等于/不等于） */
  CommissionOrderUserId = 10_001,
  /** 提成人组织（仅属于/不属于） */
  CommissionOrderOrgID = 10_002,
  /** 最终应发金额（仅大小比较，允许为负） */
  CommissionOrderFinalAmount = 10_003,
  /** 提单签出-委托单位（仅属于/不属于，值为客户 Guid） */
  BillSignOutClientId = 11_001,
  /** 提单签出-提交人组织（仅属于/不属于） */
  BillSignOutOrgID = 11_002,
  /** 提单签出-是否超期（仅是/不是，无需填值） */
  BillSignOutIsOverdue = 11_003,
  /** 客户所属人（取建档时写入的 userId，非提交人；仅等于/不等于） */
  ClientUserId = 90_001,
  /** 客户归属公司（取 OrgId 并覆盖下属；仅属于/不属于） */
  ClientOrgID = 90_002,
  /** 客户性质（ClientType：0 同行 / 1 直客；仅等于/不等于） */
  ClientClientType = 90_003,
  /** 共享类型（ClientSharedType：0/1/2；仅等于/不等于） */
  ClientIsShared = 90_004,
}

/** 客户性质（工作流条件枚举，与 ClientAdmin.ClientType 同值） */
export enum ClientConditionClientType {
  Peer = 0,
  DirectCustomer = 1,
}

/** 共享类型（工作流条件枚举，与 ClientAdmin.ClientSharedType 同值） */
export enum ClientConditionSharedType {
  None = 0,
  Company = 1,
  All = 2,
}

/** 费用条件-收付类型可选值 */
export enum OrderFeeConditionPaySide {
  Receivable = 0,
  Payable = 1,
}

/** 费用条件-业务类型可选值 */
export enum OrderFeeConditionBizType {
  SeaExport = 0,
  SeaImport = 1,
  AirExport = 2,
}

/**
 * 条件值的输入形态
 *
 * - `user`：用户下拉，值为用户 ID
 * - `org`：组织下拉，值为组织 ID
 * - `client`：客户下拉，值为客户 Guid
 * - `enum`：固定枚举下拉
 * - `number`：数值输入
 * - `none`：介词自身即完整语义，无需填值
 */
export type ConditionValueKind =
  | 'client'
  | 'enum'
  | 'none'
  | 'number'
  | 'org'
  | 'user';

/** 条件介词 */
export enum ShouldBe {
  Is = 0,
  IsNot = 1,
  Include = 2,
  Exclude = 3,
  Less = 4,
  LessOrEqual = 5,
  Greater = 6,
  GreaterOrEqual = 7,
  Equal = 8,
  NotEqual = 9,
  In = 10,
  NotIn = 11,
}

export namespace WorkFlowAdminApi {
  export interface EditWorkFlowNodeAuditor {
    userId?: null | number;
    roleId?: null | number;
    userAttribute?: UserAttribute;
    showText?: null | string;
  }

  export interface EditWorkFlowNode {
    id: string;
    nodeName?: null | string;
    passMethod: WorkFlowPassMethod;
    auditors?: null | EditWorkFlowNodeAuditor[];
  }

  export interface EditWorkFlowTransitionCondition {
    isOr: boolean;
    taskTypeCondition: TaskTypeCondition;
    shouldBe: ShouldBe;
    value?: null | string;
    valueText?: null | string;
  }

  export interface EditWorkFlowTransition {
    srcNodeId?: null | string;
    tgtNodeId: string;
    priority: number;
    isDefault: boolean;
    conditions?: null | EditWorkFlowTransitionCondition[];
  }

  export interface EditWorkFlowDto {
    id?: null | string;
    name?: null | string;
    taskType: TaskType;
    enable: boolean;
    nodes?: null | EditWorkFlowNode[];
    transitions?: null | EditWorkFlowTransition[];
  }

  export interface WorkFlowQueryDto {
    keyword?: null | string;
    taskType?: TaskType;
    sorting?: null | string;
    pageIndex: number;
    pageSize: number;
  }

  export interface WorkFlowDto {
    name?: null | string;
    taskType: TaskType;
    enable: boolean;
    isDeleted: boolean;
    deleterUserId?: null | number;
    deletionTime?: null | string;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number;
    creationTime: string;
    creatorUserId?: null | number;
    id: string;
  }

  export interface PagedListOfWorkFlowDto {
    skipCount?: number;
    maxResultCount?: number;
    items?: null | WorkFlowDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  export interface WorkFlowDetailNodeAuditor {
    userId?: null | number;
    roleId?: null | number;
    userAttribute?: UserAttribute;
    showText?: null | string;
    id: string;
  }

  export interface WorkFlowDetailNode {
    nodeName?: null | string;
    passMethod: WorkFlowPassMethod;
    auditors?: null | WorkFlowDetailNodeAuditor[];
    id: string;
  }

  export interface WorkFlowDetailTransitionCondition {
    isOr: boolean;
    taskTypeCondition: TaskTypeCondition;
    shouldBe: ShouldBe;
    value?: null | string;
    valueText?: null | string;
    id: string;
  }

  export interface WorkFlowDetailTransition {
    srcNodeId?: null | string;
    tgtNodeId: string;
    priority: number;
    isDefault: boolean;
    conditions?: null | WorkFlowDetailTransitionCondition[];
    id: string;
  }

  export interface WorkFlowDetailDto {
    name?: null | string;
    taskType: TaskType;
    enable: boolean;
    nodes?: null | WorkFlowDetailNode[];
    transitions?: null | WorkFlowDetailTransition[];
    isDeleted: boolean;
    deleterUserId?: null | number;
    deletionTime?: null | string;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number;
    creationTime: string;
    creatorUserId?: null | number;
    id: string;
  }

  export interface GuidIdDto {
    ids?: null | string[];
  }
}

const API_PREFIX = '/services/app/WorkFlowAdmin';

/** 任务类型选项（用于 Select；不含禁止新建的费用删除、未接入的客户删除） */
export function getTaskTypeOptions(): { label: string; value: TaskType }[] {
  return [
    { label: '费用提交', value: TaskType.SubmitOrderFee },
    { label: '费用变更', value: TaskType.ModifyOrderFee },
    { label: '付费申请', value: TaskType.PaymentApplication },
    { label: '业务联系单', value: TaskType.PreOrder },
    { label: '提成申请', value: TaskType.CommissionOrder },
    { label: '提单签出', value: TaskType.BillSignOut },
    { label: '新建客户审核', value: TaskType.SubmitClient },
    { label: '申请修改客户', value: TaskType.ModifyClient },
  ];
}

/**
 * 节点审核人是否支持「用户属性」。
 * 付费申请配置时后端会拦；客户 / 提单签出提交时才拦——配置页统一隐藏，避免误配。
 */
export function supportsUserAttributeAuditor(
  taskType?: null | TaskType,
): boolean {
  if (taskType == null) return true;
  return (
    taskType !== TaskType.PaymentApplication &&
    taskType !== TaskType.BillSignOut &&
    taskType !== TaskType.SubmitClient &&
    taskType !== TaskType.ModifyClient
  );
}

/** 是否客户类任务（提交 / 申请修改共用同一套进入条件） */
export function isClientWorkflowTaskType(taskType?: null | TaskType): boolean {
  return (
    taskType === TaskType.SubmitClient || taskType === TaskType.ModifyClient
  );
}

/** 通过方式选项 */
export function getPassMethodOptions(): {
  label: string;
  value: WorkFlowPassMethod;
}[] {
  return [
    { label: '直接通过', value: WorkFlowPassMethod.Pass },
    { label: '或签', value: WorkFlowPassMethod.Or },
    { label: '会签', value: WorkFlowPassMethod.And },
  ];
}

/** 条件字段展示名 */
const CONDITION_FIELD_LABELS: Record<TaskTypeCondition, string> = {
  [TaskTypeCondition.OrderFeeUserId]: '业务所属人',
  [TaskTypeCondition.OrderFeeOrgID]: '业务所属组织',
  [TaskTypeCondition.OrderFeePaySide]: '收付类型',
  [TaskTypeCondition.OrderFeeBizType]: '业务类型',
  [TaskTypeCondition.OrderFeeProfit]: '利润',
  [TaskTypeCondition.OrderFeeProfitRate]: '利润率(%)',
  [TaskTypeCondition.OrderFeeHasReceiveLessThanPay]: '存在应收小于应付的费用名',
  [TaskTypeCondition.OrderFeeHasPayWithoutReceive]:
    '存在应付有但应收缺失的费用名',
  [TaskTypeCondition.OrderFeeHasReceiveWithoutPay]:
    '存在应收有但应付缺失的费用名',
  [TaskTypeCondition.PaymentApplicationUserId]: '付费申请人',
  [TaskTypeCondition.PaymentApplicationOrgID]: '付费申请人组织',
  [TaskTypeCondition.PreOrderUserId]: '业务联系单申请人',
  [TaskTypeCondition.PreOrderOrgID]: '业务联系单申请人组织',
  [TaskTypeCondition.CommissionOrderUserId]: '提成人',
  [TaskTypeCondition.CommissionOrderOrgID]: '提成人组织',
  [TaskTypeCondition.CommissionOrderFinalAmount]: '最终应发金额',
  [TaskTypeCondition.BillSignOutClientId]: '委托单位',
  [TaskTypeCondition.BillSignOutOrgID]: '提交人组织',
  [TaskTypeCondition.BillSignOutIsOverdue]: '是否超期',
  [TaskTypeCondition.ClientUserId]: '客户所属人',
  [TaskTypeCondition.ClientOrgID]: '客户归属公司',
  [TaskTypeCondition.ClientClientType]: '客户性质',
  [TaskTypeCondition.ClientIsShared]: '共享类型',
};

/** 费用类任务（费用提交 / 费用变更）共用的条件字段 */
const ORDER_FEE_CONDITIONS: TaskTypeCondition[] = [
  TaskTypeCondition.OrderFeeUserId,
  TaskTypeCondition.OrderFeeOrgID,
  TaskTypeCondition.OrderFeePaySide,
  TaskTypeCondition.OrderFeeBizType,
  TaskTypeCondition.OrderFeeProfit,
  TaskTypeCondition.OrderFeeProfitRate,
  TaskTypeCondition.OrderFeeHasReceiveLessThanPay,
  TaskTypeCondition.OrderFeeHasPayWithoutReceive,
  TaskTypeCondition.OrderFeeHasReceiveWithoutPay,
];

/** 客户提交 / 申请修改共用的进入条件 */
const CLIENT_CONDITIONS: TaskTypeCondition[] = [
  TaskTypeCondition.ClientUserId,
  TaskTypeCondition.ClientOrgID,
  TaskTypeCondition.ClientClientType,
  TaskTypeCondition.ClientIsShared,
];

/** 提成单条件 */
const COMMISSION_ORDER_CONDITIONS: TaskTypeCondition[] = [
  TaskTypeCondition.CommissionOrderUserId,
  TaskTypeCondition.CommissionOrderOrgID,
  TaskTypeCondition.CommissionOrderFinalAmount,
];

/** 提单签出条件 */
const BILL_SIGN_OUT_CONDITIONS: TaskTypeCondition[] = [
  TaskTypeCondition.BillSignOutClientId,
  TaskTypeCondition.BillSignOutOrgID,
  TaskTypeCondition.BillSignOutIsOverdue,
];

/** 条件字段展示名（未知值回退为原始值） */
export function getConditionFieldLabel(
  taskTypeCondition: TaskTypeCondition,
): string {
  return CONDITION_FIELD_LABELS[taskTypeCondition] ?? String(taskTypeCondition);
}

function toConditionOptions(conditions: TaskTypeCondition[]) {
  return conditions.map((value) => ({
    label: getConditionFieldLabel(value),
    value,
  }));
}

/** 根据任务类型返回可用的条件字段选项 */
export function getTaskTypeConditionOptions(
  taskType: TaskType,
): { label: string; value: TaskTypeCondition }[] {
  switch (taskType) {
    case TaskType.ModifyOrderFee:
    case TaskType.SubmitOrderFee: {
      return toConditionOptions(ORDER_FEE_CONDITIONS);
    }
    case TaskType.PaymentApplication: {
      return toConditionOptions([
        TaskTypeCondition.PaymentApplicationUserId,
        TaskTypeCondition.PaymentApplicationOrgID,
      ]);
    }
    case TaskType.PreOrder: {
      return toConditionOptions([
        TaskTypeCondition.PreOrderUserId,
        TaskTypeCondition.PreOrderOrgID,
      ]);
    }
    case TaskType.CommissionOrder: {
      return toConditionOptions(COMMISSION_ORDER_CONDITIONS);
    }
    case TaskType.BillSignOut: {
      return toConditionOptions(BILL_SIGN_OUT_CONDITIONS);
    }
    case TaskType.ModifyClient:
    case TaskType.SubmitClient: {
      return toConditionOptions(CLIENT_CONDITIONS);
    }
    default: {
      return [];
    }
  }
}

/** 条件字段对应的值输入形态 */
export function getConditionValueKind(
  taskTypeCondition: TaskTypeCondition,
): ConditionValueKind {
  switch (taskTypeCondition) {
    case TaskTypeCondition.BillSignOutOrgID:
    case TaskTypeCondition.ClientOrgID:
    case TaskTypeCondition.CommissionOrderOrgID:
    case TaskTypeCondition.OrderFeeOrgID:
    case TaskTypeCondition.PaymentApplicationOrgID:
    case TaskTypeCondition.PreOrderOrgID: {
      return 'org';
    }
    case TaskTypeCondition.BillSignOutClientId: {
      return 'client';
    }
    case TaskTypeCondition.ClientClientType:
    case TaskTypeCondition.ClientIsShared:
    case TaskTypeCondition.OrderFeeBizType:
    case TaskTypeCondition.OrderFeePaySide: {
      return 'enum';
    }
    case TaskTypeCondition.CommissionOrderFinalAmount:
    case TaskTypeCondition.OrderFeeProfit:
    case TaskTypeCondition.OrderFeeProfitRate: {
      return 'number';
    }
    case TaskTypeCondition.ClientUserId:
    case TaskTypeCondition.CommissionOrderUserId:
    case TaskTypeCondition.OrderFeeUserId:
    case TaskTypeCondition.PaymentApplicationUserId:
    case TaskTypeCondition.PreOrderUserId: {
      return 'user';
    }
    default: {
      return 'none';
    }
  }
}

/** 枚举类条件字段的可选值 */
export function getConditionEnumOptions(
  taskTypeCondition: TaskTypeCondition,
): { label: string; value: number }[] {
  switch (taskTypeCondition) {
    case TaskTypeCondition.ClientClientType: {
      return [
        { label: '同行', value: ClientConditionClientType.Peer },
        { label: '直客', value: ClientConditionClientType.DirectCustomer },
      ];
    }
    case TaskTypeCondition.ClientIsShared: {
      return [
        { label: '不共享', value: ClientConditionSharedType.None },
        { label: '共享本公司', value: ClientConditionSharedType.Company },
        { label: '共享所有人', value: ClientConditionSharedType.All },
      ];
    }
    case TaskTypeCondition.OrderFeeBizType: {
      return [
        { label: '海运出口', value: OrderFeeConditionBizType.SeaExport },
        { label: '海运进口', value: OrderFeeConditionBizType.SeaImport },
        { label: '空运出口', value: OrderFeeConditionBizType.AirExport },
      ];
    }
    case TaskTypeCondition.OrderFeePaySide: {
      return [
        { label: '应收', value: OrderFeeConditionPaySide.Receivable },
        { label: '应付', value: OrderFeeConditionPaySide.Payable },
      ];
    }
    default: {
      return [];
    }
  }
}

/** 条件字段可用的介词选项（与后端校验口径一致） */
export function getShouldBeOptionsForCondition(
  taskTypeCondition: TaskTypeCondition,
): { label: string; value: ShouldBe }[] {
  switch (getConditionValueKind(taskTypeCondition)) {
    case 'none': {
      return [
        { label: '是', value: ShouldBe.Is },
        { label: '不是', value: ShouldBe.IsNot },
      ];
    }
    case 'number': {
      return [
        { label: '大于', value: ShouldBe.Greater },
        { label: '大于等于', value: ShouldBe.GreaterOrEqual },
        { label: '小于', value: ShouldBe.Less },
        { label: '小于等于', value: ShouldBe.LessOrEqual },
      ];
    }
    case 'client':
    case 'org': {
      return [
        { label: '属于', value: ShouldBe.In },
        { label: '不属于', value: ShouldBe.NotIn },
      ];
    }
    default: {
      return [
        { label: '等于', value: ShouldBe.Equal },
        { label: '不等于', value: ShouldBe.NotEqual },
      ];
    }
  }
}

/** 介词展示名 */
export function getShouldBeLabel(shouldBe: ShouldBe): string {
  return (
    getShouldBeOptions().find((o) => o.value === shouldBe)?.label ??
    String(shouldBe)
  );
}

/** 条件介词选项（全部，UI 可按 taskTypeCondition 再过滤） */
export function getShouldBeOptions(): { label: string; value: ShouldBe }[] {
  return [
    { label: '是', value: ShouldBe.Is },
    { label: '不是', value: ShouldBe.IsNot },
    { label: '包含', value: ShouldBe.Include },
    { label: '不包含', value: ShouldBe.Exclude },
    { label: '小于', value: ShouldBe.Less },
    { label: '小于等于', value: ShouldBe.LessOrEqual },
    { label: '大于', value: ShouldBe.Greater },
    { label: '大于等于', value: ShouldBe.GreaterOrEqual },
    { label: '等于', value: ShouldBe.Equal },
    { label: '不等于', value: ShouldBe.NotEqual },
    { label: '属于', value: ShouldBe.In },
    { label: '不属于', value: ShouldBe.NotIn },
  ];
}

/**
 * 工作流列表（分页）
 */
export async function getWorkFlowList(params: Recordable<any>) {
  const body: WorkFlowAdminApi.WorkFlowQueryDto = {
    keyword: params.keyword ?? params.Keyword ?? undefined,
    taskType:
      params.taskType !== undefined && params.taskType !== ''
        ? Number(params.taskType)
        : params.TaskType !== undefined && params.TaskType !== ''
          ? Number(params.TaskType)
          : undefined,
    sorting: params.sorting ?? params.Sorting ?? 'Id desc',
    pageIndex: params.pageIndex ?? params.PageIndex ?? params.page ?? 1,
    pageSize: params.pageSize ?? params.PageSize ?? 10,
  };

  const response =
    await requestClient.post<WorkFlowAdminApi.PagedListOfWorkFlowDto>(
      `${API_PREFIX}/GetQueryAsync`,
      body,
    );

  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

/**
 * 工作流详情
 */
export async function getWorkFlowDetail(id: string) {
  return requestClient.get<WorkFlowAdminApi.WorkFlowDetailDto>(
    `${API_PREFIX}/GetAsync`,
    { params: { Id: id } },
  );
}

/**
 * 新增或修改工作流
 */
export async function editWorkFlow(data: WorkFlowAdminApi.EditWorkFlowDto) {
  return requestClient.post<string>(`${API_PREFIX}/EditAsync`, data);
}

/**
 * 删除工作流
 */
export async function deleteWorkFlow(data: WorkFlowAdminApi.GuidIdDto) {
  return requestClient.delete(`${API_PREFIX}/DeleteAsync`, { data });
}
