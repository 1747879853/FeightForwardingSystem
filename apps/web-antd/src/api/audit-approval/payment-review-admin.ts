import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { requestClient } from '#/api/request';

export namespace PaymentReviewAdminApi {
  export interface PayAppTaskQueryParams {
    Keyword?: string;
    /**
     * Keys 精确搜索（SQL IN，非模糊）：命中主提单号、订舱编号、委托编号中任意一个即可。
     * GET 需 repeat 序列化：Keys=a&Keys=b。
     */
    Keys?: string[];
    ApplicationNo?: string;
    SettlementId?: string;
    CurrencyId?: number;
    SubmitTimeStart?: string;
    SubmitTimeEnd?: string;
    EndTimeStart?: string;
    EndTimeEnd?: string;
    CreatorUserId?: number;
    OrgId?: number;
    TaskType?: number;
    TaskStatus?: number;
    MyStatus?: number;
    FrightModule?: number;
    AuditUserId?: number;
    AuditTimeStart?: string;
    AuditTimeEnd?: string;
    Remark?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  export interface OrganizationUnitSimpleDto {
    id: number;
    name?: string;
    /** 本节点自身配置的本位币，只有公司节点才会有值 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
    /** 是否公司节点 */
    isCompany?: boolean;
  }

  /** 结算对象简易对象（业务往来单位） */
  export interface ClientSimpleDtoForOrder {
    id: string;
    /** 客户简称 */
    name?: string;
    /** 客户全称 */
    fullName?: string;
  }

  /** 币别简易对象（无 id，外层保留 currencyId） */
  export interface CurrencySimpleDto {
    code?: string;
    cnName?: string;
    enName?: string;
  }

  export interface CurrencyGroupDto {
    id: number;
    code?: string;
    receiveAmount: number;
    receivePrice?: number;
    payAmount: number;
    payPrice?: number;
  }

  /**
   * 结算对象应收未结算（按币别合计）。
   * 口径：同一结算对象 + 收 + 费用已审核通过 + 仍有未结；已结清币别不出现。
   * 与本行 `currencyGroup`（本申请申请金额）无关。
   */
  export interface SettlementReceivableGroupDto {
    currencyId?: number;
    currencyCode?: string;
    /** 币别对象（若后端对象化则有值，展示优先 `currencyCode`） */
    currency?: CurrencySimpleDto | null;
    /** 该币别应收未结算合计（原币，2 位小数，不乘汇率） */
    unSettledAmount?: number;
  }

  export interface WorkFlowInstanceItemDetailDto {
    userId: number;
    userNickName?: string;
    taskStatus: number;
    comment?: string;
    auditTime?: string;
    id: string;
  }

  export interface WorkFlowInstanceItemGroupDto {
    level: number;
    passMethod: number;
    itemList?: WorkFlowInstanceItemDetailDto[];
  }

  export interface WorkFlowInstanceDetailDto {
    status: number;
    levelGroup?: WorkFlowInstanceItemGroupDto[];
    id: string;
  }

  /**
   * 待我审核的付费申请。
   * 平铺结构，不继承数据权限基类，因此**没有** localCurrencyId / localCurrencyCode；
   * `orgs` 末级也未必是公司节点，不要拿它推本位币。需要本位币请走 `DetailAsync`。
   */
  export interface PayAppTaskItemDto {
    paymentApplicationId: string;
    applicationNo?: string;
    /** 结算对象（替代 settlementName） */
    settlement?: ClientSimpleDtoForOrder | null;
    submitTime?: string;
    endTime?: string;
    currencyId?: number;
    /** 申请结算币别（替代 currencyCode）；原币申请为 null */
    currency?: CurrencySimpleDto | null;
    orgId?: number;
    /** 组织串（从最高级组织到该组织） */
    orgs?: OrganizationUnitSimpleDto[];
    currencyGroup?: CurrencyGroupDto[];
    /** 结算对象应收未结算（按币别）；无欠款为 `[]` */
    settlementReceivableGroup?: SettlementReceivableGroupDto[];
    /**
     * 该行付费申请涉及的业务票；组内只有 `transportOrder` 有值。
     * 组内 `currencyGroup` / `totalPayPrice` / `totalReceivePrice` / `paymentApplicationItems` 恒为 null，
     * 金额用本行根级字段；费用明细请调 `DetailAsync`。
     */
    payAppFeeBySeaExportGroup?: PaymentApplicationAdminApi.PayAppFeeAndSeaExportDto[];
    totalPayPrice?: number;
    totalReceivePrice?: number;
    id: string;
    taskBaseId?: string;
    taskType: number;
    taskStatus: number;
    myStatus: number;
    taskItemWorkFlowInstance?: WorkFlowInstanceDetailDto;
    frightModule: number;
    entityId: string;
    originalInfo?: string;
    info?: string;
    auditUserId?: number;
    auditUserName?: string;
    auditTime?: string;
    remark?: string;
    creatorUserName?: string;
  }

  export interface PagedListOfPayAppTaskItemDto {
    skipCount: number;
    maxResultCount: number;
    items?: PayAppTaskItemDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 待审通过 / 驳回（AuditAsync）。驳回已合并整单已通过的任务。 */
  export interface TaskItemAuditDto {
    /** true=通过（仅待审）；false=驳回（待审或整单已通过） */
    success: boolean;
    remark?: string;
    /** 审核任务 id 列表 */
    ids?: string[];
  }

  /**
   * 审核通过后反悔驳回（RejectAsync）。
   * 前端统一【驳回】时：整单已通过也可走 AuditAsync(false)；
   * 仅「整单仍在审、本人节点已过」必须走本接口。
   */
  export interface TaskItemRejectAuditDto {
    remark?: string;
    /** 审核任务 id 列表；任务须为 Passed，或 Auditing 且本人节点已通过 */
    ids?: string[];
  }
}

/** 任务类型 */
export enum TaskType {
  SubmitOrderFee = 0,
  ModifyOrderFee = 1,
  DeleteOrderFee = 2,
  PaymentApplication = 3,
  /** 业务联系单（与后端 FrightModule.PreOrder 同值） */
  PreOrder = 8,
  /** 提成单（与后端 TaskType.CommissionOrder 同值） */
  CommissionOrder = 10,
}

/** 工作流实例状态 */
export enum WorkFlowInstanceStatus {
  Active = 0,
  Pass = 1,
  Reject = 2,
}

/** 工作流通过方式 */
export enum WorkFlowPassMethod {
  Pass = 0,
  Or = 1,
  And = 2,
}

/** 任务状态 */
export enum TaskStatus {
  Auditing = 0,
  Rejected = 1,
  Passed = 2,
  PartialPassed = 3,
}

const API_PREFIX = '/services/app/PaymentApplicationAdmin';
const WORKFLOW_INSTANCE_PREFIX = '/services/app/WorkFlowInstanceAdmin';

/** 获取一个任务的审核流程详情 */
export async function getWorkFlowInstanceDetail(
  params: {
    TaskType?: TaskType;
    EntityId?: string;
  },
  options?: { silent?: boolean },
) {
  return requestClient.get<PaymentReviewAdminApi.WorkFlowInstanceDetailDto>(
    `${WORKFLOW_INSTANCE_PREFIX}/GetAsync`,
    {
      params,
      // 弹窗内自行展示错误，避免再弹全局 toast 造成“没打开”的错觉
      ...(options?.silent ? { skipErrorMessage: true } : {}),
    },
  );
}

/** 付费审核任务 分页列表 */
export async function getPayAppTaskList(
  params: PaymentReviewAdminApi.PayAppTaskQueryParams,
) {
  const response =
    await requestClient.get<PaymentReviewAdminApi.PagedListOfPayAppTaskItemDto>(
      `${API_PREFIX}/PayAppTaskListAsync`,
      // Keys 为 List<string>，ABP [FromQuery] 绑定要求 repeat：Keys=a&Keys=b
      { params, paramsSerializer: 'repeat' },
    );

  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

/**
 * 审核通过 / 驳回
 * POST PaymentApplicationAdmin/AuditAsync
 * - success=true → 通过，仅待审
 * - success=false → 驳回；待审走工作流不通过，整单已通过走与 RejectAsync 同一套退回
 * - 驳回前置：任务状态为待审核或已通过；权限 Admin.PaymentApplication.Audit
 */
export async function payAppAudit(
  data: PaymentReviewAdminApi.TaskItemAuditDto,
) {
  return requestClient.post(`${API_PREFIX}/AuditAsync`, data);
}

/**
 * 审核通过后反悔驳回
 * POST PaymentApplicationAdmin/RejectAsync
 * - 入参：任务 id 列表 + 驳回备注（无 success 字段）
 * - 前置：任务已是 Passed，或 Auditing（本人节点已过、整单还在审）
 * - 整单已通过也可改走 AuditAsync(false)；本人已过、下一级还在审时仍须本接口
 */
export async function payAppReject(
  data: PaymentReviewAdminApi.TaskItemRejectAuditDto,
) {
  return requestClient.post(`${API_PREFIX}/RejectAsync`, data);
}
