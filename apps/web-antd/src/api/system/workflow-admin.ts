import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

import { UserAttribute } from './user-admin';

export { UserAttribute };

/** 任务类型 */
export enum TaskType {
  SubmitOrderFee = 0,
  ModifyOrderFee = 1,
  DeleteOrderFee = 2,
  PaymentApplication = 3,
}

/** 通过方式 */
export enum WorkFlowPassMethod {
  Pass = 0,
  Or = 1,
  And = 2,
}

/** 任务类型对应条件字段 */
export enum TaskTypeCondition {
  SubmitOrderFee = 0,
  ModifyOrderFee = 1000,
  DeleteOrderFee = 2000,
  PaymentApplication = 3000,
  PaymentApplicationUserId = 3001,
  PaymentApplicationOrgID = 3002,
}

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

/** 任务类型选项（用于 Select） */
export function getTaskTypeOptions(): { label: string; value: TaskType }[] {
  return [
    { label: '费用提交', value: TaskType.SubmitOrderFee },
    { label: '费用修改', value: TaskType.ModifyOrderFee },
    { label: '费用删除', value: TaskType.DeleteOrderFee },
    { label: '付费申请', value: TaskType.PaymentApplication },
  ];
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

/** 根据任务类型返回可用的条件字段选项 */
export function getTaskTypeConditionOptions(
  taskType: TaskType,
): { label: string; value: TaskTypeCondition }[] {
  switch (taskType) {
    case TaskType.SubmitOrderFee: {
      return [{ label: '费用提交', value: TaskTypeCondition.SubmitOrderFee }];
    }
    case TaskType.ModifyOrderFee: {
      return [{ label: '费用修改', value: TaskTypeCondition.ModifyOrderFee }];
    }
    case TaskType.DeleteOrderFee: {
      return [{ label: '费用删除', value: TaskTypeCondition.DeleteOrderFee }];
    }
    case TaskType.PaymentApplication: {
      return [
        { label: '付费申请', value: TaskTypeCondition.PaymentApplication },
        {
          label: '付费申请人',
          value: TaskTypeCondition.PaymentApplicationUserId,
        },
        {
          label: '付费申请人组织',
          value: TaskTypeCondition.PaymentApplicationOrgID,
        },
      ];
    }
    default: {
      return [];
    }
  }
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
