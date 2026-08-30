import {
  type PaymentReviewAdminApi,
  TaskStatus,
} from '#/api/audit-approval/payment-review-admin';
import { requestClient } from '#/api/request';

export namespace CommissionOrderAdminApi {
  // ==================== 枚举定义 ====================

  /** 提成类型 */
  export enum CommissionType {
    /** 销售提成 */
    Sales = 0,
    /** 操作提成 */
    Operation = 1,
  }

  /** 提成单状态 */
  export enum CommissionOrderStatus {
    /** 录入状态 */
    Draft = 0,
    /** 提交审核 */
    Submitted = 1,
    /** 审核驳回 */
    Rejected = 2,
    /** 审核通过 */
    Approved = 3,
    /** 发放完成 */
    Granted = 4,
  }

  /** 利润分类 */
  export enum CommissionItemProfitType {
    /** 达标计入 */
    Qualified = 0,
    /** 未达门槛 */
    BelowThreshold = 1,
    /** 负利润扣减 */
    NegativeProfit = 2,
  }

  /** 计算步骤类型 */
  export enum CommissionStepType {
    /** 达标利润汇总 */
    ProfitSummary = 0,
    /** 固定比例 */
    FixedRate = 1,
    /** 阶梯档 */
    Ladder = 2,
    /** 负利润扣减 */
    NegativeDeduction = 3,
    /** 条件项命中 */
    RuleHit = 4,
    /** 底薪 */
    BaseSalary = 5,
    /** 合计 */
    Total = 6,
  }

  /** 门槛比较符 */
  export enum ProfitThresholdOperator {
    /** 大于 */
    GreaterThan = 0,
    /** 大于等于 */
    GreaterThanOrEqual = 1,
  }

  /** 销售提成计算方式 */
  export enum SalesCommissionType {
    /** 固定比例 */
    FixedRate = 0,
    /** 按阶梯(阶梯内分段计费) */
    LadderSegment = 1,
    /** 按阶梯(达标后整体到档) */
    LadderWhole = 2,
  }

  /** 底薪模式 */
  export enum BaseSalaryMode {
    /** 直接加 */
    DirectAdd = 0,
    /** 提成与底薪取最大值 */
    MaxOfBoth = 1,
  }

  /** 业务类型 */
  export enum BizType {
    /** 海运出口 */
    SeaExport = 0,
    /** 海运进口 */
    SeaImport = 1,
    /** 空运出口 */
    AirExport = 2,
  }

  /** 货物类型 */
  export enum CargoType {
    /** 普通货 */
    Normal = 0,
    /** 冻柜 */
    Reefer = 1,
    /** 危险品 */
    Hazardous = 2,
    /** 超限箱 */
    OverSize = 3,
  }

  // ==================== 共用 SimpleDto ====================

  /** 用户简易对象 */
  export interface UserSimpleDto {
    id?: number;
    nickName?: string | null;
  }

  /** 组织简易对象 */
  export interface OrganizationUnitSimpleDto {
    id?: number;
    name?: string | null;
    /** 是否公司节点 */
    isCompany?: boolean;
  }

  /** 客户简易对象 */
  export interface ClientSimpleDto {
    id?: string;
    name?: string | null;
    fullName?: string | null;
  }

  /** 币别简易对象（以 Code 为键，无 Id） */
  export interface CurrencySimpleDto {
    code?: string;
    cnName?: string;
    enName?: string;
  }

  /** 提成配置简易对象 */
  export interface CommissionConfigSimpleDto {
    id?: string;
    name?: string | null;
  }

  // ==================== 入参 DTO ====================

  /** 提成预览查询入参（销售/操作共用） */
  export interface CommissionPreviewQueryDto {
    /** 提成人id，单选 */
    userId: number;
    /** 所属组织id，必填，必须是提成人的直属组织；确认与新建必须传同一个值 */
    orgId: number | string;
    /** 提成月集合，至少一个，只取年月 */
    accountDates: string[];
  }

  /** 新建提成单入参 */
  export interface CommissionOrderAddDto {
    /** 提成人id，单选 */
    userId: number;
    /** 所属组织id，必填，必须是提成人的直属组织；须与确认预览时传的 orgId 一致 */
    orgId: number | string;
    /** 提成类型：0销售提成 1操作提成 */
    commissionType: CommissionType;
    /** 提成月集合，至少一个，一个月生成一张提成单 */
    accountDates: string[];
    /** 备注，最长1024 */
    remark?: string;
  }

  /** 提成单分页查询入参 */
  export interface CommissionOrderQueryDto {
    /** 页码，从1开始，默认1 */
    pageIndex?: number;
    /** 每页条数，默认10 */
    pageSize?: number;
    /** 排序，默认 AccountDate DESC, CreationTime DESC */
    sorting?: string;
    /** 关键字，模糊匹配提成单号或备注 */
    keyword?: string;
    /** 提成人，不传=全部 */
    userId?: number;
    /** 提成类型，不传=全部 */
    commissionType?: CommissionType;
    /** 提成单状态，不传=全部 */
    status?: CommissionOrderStatus;
    /** 提成月起，只取年月，含当月 */
    accountDateStart?: string;
    /** 提成月止，只取年月，含当月 */
    accountDateEnd?: string;
  }

  /** 待我审核列表查询入参（继承 TaskItemQueryDto，不过数据权限） */
  export interface CommissionOrderTaskQueryDto {
    /** 页码，从1开始，默认1 */
    pageIndex?: number;
    /** 每页条数，默认10 */
    pageSize?: number;
    /** 排序，默认 CreationTime DESC，最新提上来的在前 */
    sorting?: string;
    /** 我的审核状态，不传=全部（含我这一条为空的） */
    myStatus?: TaskStatus;
    /** 整个任务的状态，不传=全部 */
    taskStatus?: TaskStatus;
    /** 终审人，按任务上的终审人筛 */
    auditUserId?: number;
    /** 终审时间起 */
    auditTimeStart?: string;
    /** 终审时间止 */
    auditTimeEnd?: string;
    /** 审核意见，模糊匹配 */
    remark?: string;
    /** 关键字，模糊匹配提成单号或备注 */
    keyword?: string;
    /** 提成人（不叫 userId，避免与审核人混淆），不传=全部 */
    commissionUserId?: number;
    /** 提成类型，不传=全部 */
    commissionType?: CommissionType;
    /** 提成单状态，不传=全部 */
    commissionOrderStatus?: CommissionOrderStatus;
    /** 提成月起，只取年月，含当月 */
    accountDateStart?: string;
    /** 提成月止，只取年月，含当月 */
    accountDateEnd?: string;
  }

  /** 待发放列表查询入参（只返回审核通过的单据，状态写死在后端，无状态字段） */
  export interface CommissionOrderGrantQueryDto {
    /** 页码，从1开始，默认1 */
    pageIndex?: number;
    /** 每页条数，默认10 */
    pageSize?: number;
    /** 排序，默认 AccountDate DESC, CreationTime DESC */
    sorting?: string;
    /** 关键字，模糊匹配提成单号或备注 */
    keyword?: string;
    /** 提成人，不传=全部 */
    userId?: number;
    /** 提成类型，不传=全部 */
    commissionType?: CommissionType;
    /** 提成月起，只取年月，含当月 */
    accountDateStart?: string;
    /** 提成月止，只取年月，含当月 */
    accountDateEnd?: string;
  }

  /** 提交审核 / 撤销提交入参 */
  export interface CommissionOrderSubmitDto {
    /** 提成单id */
    id: string;
  }

  /** 审核入参 */
  export interface CommissionOrderAuditDto {
    /** 提成单id */
    id: string;
    /** 是否通过，false 为驳回 */
    success: boolean;
    /** 审核意见，驳回时必填，最长1024 */
    remark?: string;
  }

  /** 审核后驳回入参 */
  export interface CommissionOrderRejectDto {
    /** 提成单id */
    id: string;
    /** 驳回原因，必填，最长1024 */
    remark: string;
  }

  /** 批量审核入参（一批共用同一个结论与同一条审核意见） */
  export interface CommissionOrderBatchAuditDto {
    /** 提成单id集合，至少一个，后端会去重 */
    ids: string[];
    /** 是否通过，一批共用同一个结论 */
    success: boolean;
    /** 审核意见，驳回时必填，最长1024，一批共用同一条 */
    remark?: string;
  }

  /** 批量审核后驳回入参 */
  export interface CommissionOrderBatchRejectDto {
    /** 提成单id集合，至少一个，后端会去重 */
    ids: string[];
    /** 驳回原因，必填，最长1024，一批共用同一条 */
    remark: string;
  }

  /** 批量发放入参（一律按各自应发金额全额发放，没有金额入参） */
  export interface CommissionOrderBatchGrantDto {
    /** 提成单id集合，至少一个，后端会去重 */
    ids: string[];
    /** 发放备注，必填，最长1024，一批共用同一条 */
    remark: string;
  }

  /** 发放入参 */
  export interface CommissionOrderGrantDto {
    /** 提成单id */
    id: string;
    /** 实际发放金额，由发放人自由填写，允许为负 */
    grantAmount: number;
    /** 发放备注，最长1024 */
    remark?: string;
  }

  /** Guid类型Id Dto */
  export interface GuidIdDto {
    id?: string;
  }

  // ==================== 出参 DTO ====================

  /** 计算步骤 */
  export interface CommissionStepDto {
    /** 步骤类型 */
    stepType: CommissionStepType;
    /** 后端拼好的整句，可直接显示 */
    description: string;
    /** 本步金额，负利润扣减为负数 */
    amount: number;
    /** 本步计算基数 */
    baseValue?: number | null;
    /** 比例(%) */
    rate?: number | null;
    /** 阶梯档区间下限 */
    minAmount?: number | null;
    /** 阶梯档区间上限，为空代表无上限 */
    maxAmount?: number | null;
    /** 涉及票数 */
    itemCount?: number | null;
    /** 命中的条件项id */
    commissionConfigRuleId?: string | null;
    /** 排序id，从1开始 */
    sortId: number;
  }

  /** 计算结果 */
  export interface CommissionCalculationDto {
    /** 命中的提成配置，仅确认接口有值；详情接口恒为 null */
    commissionConfig?: CommissionConfigSimpleDto | null;
    /** 利润门槛，仅销售 */
    profitThreshold?: number | null;
    /** 门槛比较符，仅销售 */
    profitThresholdOperator?: ProfitThresholdOperator | null;
    /** 负利润提成比例(%)，仅销售 */
    negativeProfitRate?: number | null;
    /** 计算方式，仅销售 */
    salesCommissionType?: SalesCommissionType | null;
    /** 固定提成比例(%)，仅销售且计算方式=0 */
    fixedRate?: number | null;
    /** 总利润（达标票利润合计，本位币），仅销售 */
    totalProfit?: number | null;
    /** 达标票数，仅销售 */
    countedItemCount?: number | null;
    /** 亏损票利润合计（负数），仅销售 */
    negativeProfit?: number | null;
    /** 亏损票数，仅销售 */
    negativeItemCount?: number | null;
    /** 负利润扣减金额（正数），仅销售 */
    negativeDeduction?: number | null;
    /** 提成金额（已扣负利润、不含底薪） */
    commissionAmount: number;
    /** 底薪金额 */
    baseSalary?: number | null;
    /** 底薪模式 */
    baseSalaryMode?: BaseSalaryMode | null;
    /** 是否真的计算底薪，前端用这个判断 */
    isBaseSalaryEnabled: boolean;
    /** 最终应发金额 */
    finalAmount: number;
    /** 计算步骤，按 sortId 升序 */
    steps: CommissionStepDto[];
  }

  /** 按币别分组的原币明细（销售提成专属） */
  export interface CommissionCurrencyDto {
    /** 币别 */
    currency: CurrencySimpleDto;
    /** 币别id */
    currencyId: number;
    /** 应收（原币） */
    receivable: number;
    /** 应付（原币） */
    payable: number;
    /** 利润（原币）= 应收 − 应付 */
    profit: number;
    /** 本次折算用的应收汇率，费用币别即本位币时恒为 1 */
    exchangeRate: number;
  }

  /** 业务主单信息 */
  export interface CommissionTransportOrderDto {
    /** 业务主单id */
    id: string;
    /** 业务类型 */
    bizType: BizType;
    /** 委托编号 */
    commissionNum?: string | null;
    /** 主提单号 */
    mblNum?: string | null;
    /** 业务日期（海出=开船日 海进=到港日 空出=起飞日） */
    bizDate?: string | null;
    /** 货物类型 */
    cargoId: CargoType;
    /** 委托单位 */
    client?: ClientSimpleDto | null;
    /** 主单会计期间 */
    accountDate: string;
    /** 所属组织串 */
    orgs: OrganizationUnitSimpleDto[];
    /** 销售 */
    sales: UserSimpleDto[];
    /** 操作 */
    operations: UserSimpleDto[];
  }

  /** 操作提成命中条件项 */
  export interface CommissionHitRuleDto {
    /** 条件项id */
    commissionConfigRuleId: string;
    /** 条件项名称 */
    ruleName: string;
    /** 该条件项的每票金额 */
    amount: number;
    /** 排序，从1开始 */
    sortId: number;
  }

  /** 票（提成单中的每一票） */
  export interface CommissionTicketDto {
    /** 业务主单id，供前端跳转 */
    transportOrderId: string;
    /** 更改单id，为空代表主单原票 */
    changeOrderId?: string | null;
    /** 是否原票 */
    isOriginal: boolean;
    /** 这一票的会计期间，可能小于提成月（补提的） */
    accountDate: string;
    /** 业务主单信息 */
    transportOrder: CommissionTransportOrderDto;

    // ---- 销售提成专属字段 ----
    /** 这一票的利润（本位币），第二部分为 null */
    profit?: number | null;
    /** 利润分类，第二部分为 null */
    profitType?: CommissionItemProfitType | null;
    /** 应收合计（本位币） */
    totalReceivable?: number | null;
    /** 应付合计（本位币） */
    totalPayable?: number | null;
    /** 按币别分组的原币明细 */
    currencies?: CommissionCurrencyDto[] | null;
    /** 未结清的费用条数，仅第二部分有值 */
    unsettledFeeCount?: number | null;

    // ---- 操作提成专属字段 ----
    /** 操作提成金额，一条都没命中时为 0 */
    amount?: number | null;
    /** 命中的条件项，一条都没命中时为空列表 */
    hitRules?: CommissionHitRuleDto[] | null;
  }

  // ---- 销售提成确认出参 ----

  /** 销售提成月数据（一个月一条） */
  export interface CommissionSalesMonthDto {
    /** 提成月 */
    accountDate: string;
    /** 参与本月计算的票 */
    settledTickets: CommissionTicketDto[];
    /** 计算结果，命中不到配置或汇率缺失时为 null */
    calculation?: CommissionCalculationDto | null;
    /** 未全部结算的票，有值就不能提交 */
    unsettledTickets: CommissionTicketDto[];
    /** 是否可新建/提交 */
    canSubmit: boolean;
    /** 不能新建/提交的原因 */
    cannotSubmitReasons: string[];
  }

  /** 销售提成确认结果 */
  export interface CommissionSalesPreviewDto {
    /** 按提成月升序，输入几个月就几条 */
    months: CommissionSalesMonthDto[];
  }

  // ---- 操作提成确认出参 ----

  /** 操作提成月数据 */
  export interface CommissionOperationMonthDto {
    /** 提成月 */
    accountDate: string;
    /** 参与本月计算的票 */
    tickets: CommissionTicketDto[];
    /** 计算结果，命中不到配置时为 null */
    calculation?: CommissionCalculationDto | null;
    /** 是否可新建/提交 */
    canSubmit: boolean;
    /** 不能新建/提交的原因 */
    cannotSubmitReasons: string[];
  }

  /** 操作提成确认结果 */
  export interface CommissionOperationPreviewDto {
    /** 按提成月升序 */
    months: CommissionOperationMonthDto[];
  }

  // ---- 提成单单头 ----

  /** 提成单单头（列表与详情的 CommissionOrder 字段） */
  export interface CommissionOrderDto {
    /** 提成单id */
    id: string;
    /** 提成单号 */
    commissionOrderNum: string;
    /** 提成类型 */
    commissionType: CommissionType;
    /** 提成月，恒为当月1号 */
    accountDate: string;
    /** 提成单状态 */
    status: CommissionOrderStatus;
    /** 备注 */
    remark?: string | null;
    /** 提成人 */
    user: UserSimpleDto;
    /** 提成金额（已扣负利润、不含底薪，允许为负） */
    commissionAmount: number;
    /** 底薪金额，为空代表本单不计底薪 */
    baseSalary?: number | null;
    /** 底薪模式 */
    baseSalaryMode?: BaseSalaryMode | null;
    /** 最终应发金额（允许为负） */
    finalAmount: number;
    /** 命中的提成配置，配置已被删除时为 null */
    commissionConfig?: CommissionConfigSimpleDto | null;
    /** 配置名称快照 */
    commissionConfigName?: string | null;
    /** 参与计算的票数 */
    itemCount: number;
    /** 提交人昵称 */
    submitUserName?: string | null;
    /** 提交时间 */
    submitTime?: string | null;
    /** 终审人昵称 */
    auditUserName?: string | null;
    /** 终审时间 */
    auditTime?: string | null;
    /** 审核意见/驳回原因 */
    auditRemark?: string | null;
    /** 发放人昵称 */
    grantUserName?: string | null;
    /** 发放时间 */
    grantTime?: string | null;
    /** 实际发放金额，可能不等于 finalAmount */
    grantAmount?: number | null;
    /** 发放备注 */
    grantRemark?: string | null;
    /** 数据所属人id（就是提成人id） */
    userId: number;
    /** 所属组织id */
    orgId?: number | null;
    /** 所属组织串，从最高级组织到本组织 */
    orgs: OrganizationUnitSimpleDto[];
    /** 本位币id：单据所属公司配置的本位币，不要自己从 orgs 里找 */
    localCurrencyId?: null | number;
    /** 本位币代码，如 RMB / USD */
    localCurrencyCode?: null | string;
    /** 创建人昵称 */
    creatorUserName?: string | null;
    /** 最后修改人昵称 */
    lastModifierUserName?: string | null;
    /** 创建时间 */
    creationTime: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfCommissionOrderDto {
    items: CommissionOrderDto[];
    totalCount: number;
    skipCount: number;
    maxResultCount: number;
  }

  /** 待我审核列表项（任务信息 + 提成单信息） */
  export interface CommissionOrderTaskDto {
    /** 任务id，不是提成单id */
    id: string;
    /** 整个任务的状态 */
    taskStatus: TaskStatus;
    /** 我这一级的状态，为空=还没轮到我或被或签置空 */
    myStatus?: null | TaskStatus;
    /** 逐级审批明细，按 Level 分组 */
    taskItemWorkFlowInstance?: null | PaymentReviewAdminApi.WorkFlowInstanceDetailDto;
    /** 终审人昵称 */
    auditUserName?: null | string;
    /** 终审时间 */
    auditTime?: null | string;
    /** 审核意见 */
    remark?: null | string;
    /** 任务创建人，即提交人 */
    creatorUserName?: null | string;
    /** 任务创建时间，即提交时间 */
    creationTime?: null | string;
    /** 提成单id，调审核/驳回接口用这个 */
    commissionOrderId: string;
    /** 提成单信息 */
    commissionOrder: CommissionOrderDto;
  }

  /** 待我审核列表分页响应 */
  export interface PagedListOfCommissionOrderTaskDto {
    items: CommissionOrderTaskDto[];
    totalCount: number;
    skipCount?: number;
    maxResultCount?: number;
  }

  /** 批量操作结果（批量审核/批量驳回/批量发放共用） */
  export interface CommissionOrderBatchResultDto {
    /** 实际处理的提成单数 */
    count: number;
    /** 本批应发金额合计，仅批量发放返回，其余两个恒为 0 */
    totalAmount: number;
  }

  // ---- 详情出参 ----

  /** 销售提成单详情 */
  export interface CommissionSalesDetailDto {
    /** 提成单单头 */
    commissionOrder: CommissionOrderDto;
    /** 参与本单计算的票 */
    tickets: CommissionTicketDto[];
    /** 本单的计算结果 */
    calculation?: CommissionCalculationDto | null;
  }

  /** 操作提成单详情 */
  export interface CommissionOperationDetailDto {
    /** 提成单单头 */
    commissionOrder: CommissionOrderDto;
    /** 参与本单计算的票 */
    tickets: CommissionTicketDto[];
    /** 本单的计算结果 */
    calculation?: CommissionCalculationDto | null;
  }
}

// ==================== API 接口定义 ====================

const API_PREFIX = '/services/app/CommissionOrderAdmin';

/**
 * 销售提成 新建前确认（只算不写库）
 */
export const getSalesPreview = (
  data: CommissionOrderAdminApi.CommissionPreviewQueryDto,
) => {
  return requestClient.post<CommissionOrderAdminApi.CommissionSalesPreviewDto>(
    `${API_PREFIX}/GetSalesPreviewAsync`,
    data,
  );
};

/**
 * 操作提成 新建前确认（只算不写库）
 */
export const getOperationPreview = (
  data: CommissionOrderAdminApi.CommissionPreviewQueryDto,
) => {
  return requestClient.post<CommissionOrderAdminApi.CommissionOperationPreviewDto>(
    `${API_PREFIX}/GetOperationPreviewAsync`,
    data,
  );
};

/**
 * 新建提成单（销售/操作共用，靠 commissionType 分支）
 */
export const addCommissionOrder = (
  data: CommissionOrderAdminApi.CommissionOrderAddDto,
) => {
  return requestClient.post<string[]>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 销售提成单 详情
 */
export const getSalesDetail = (id: string) => {
  return requestClient.get<CommissionOrderAdminApi.CommissionSalesDetailDto>(
    `${API_PREFIX}/GetSalesDetailAsync`,
    { params: { Id: String(id) } },
  );
};

/**
 * 操作提成单 详情
 */
export const getOperationDetail = (id: string) => {
  return requestClient.get<CommissionOrderAdminApi.CommissionOperationDetailDto>(
    `${API_PREFIX}/GetOperationDetailAsync`,
    { params: { Id: String(id) } },
  );
};

/**
 * 提成单 分页列表（销售与操作共用，靠 commissionType 区分）
 */
export const getCommissionOrderPagedList = (
  params: CommissionOrderAdminApi.CommissionOrderQueryDto,
) => {
  return requestClient.get<CommissionOrderAdminApi.PagedListOfCommissionOrderDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 待我审核列表（从工作流实例明细反查当前登录人，不过数据权限）
 * 审核岗必须用这个列表，不能用普通分页列表（会漏掉该我审的单子）
 */
export const getCommissionOrderTaskList = (
  params: CommissionOrderAdminApi.CommissionOrderTaskQueryDto,
) => {
  return requestClient.get<CommissionOrderAdminApi.PagedListOfCommissionOrderTaskDto>(
    `${API_PREFIX}/CommissionOrderTaskListAsync`,
    { params },
  );
};

/**
 * 待发放列表（只返回审核通过的单据，状态写死在后端，不过数据权限）
 * 发放岗必须用这个列表，发放完成的单据会从列表里消失
 */
export const getCommissionOrderGrantList = (
  params: CommissionOrderAdminApi.CommissionOrderGrantQueryDto,
) => {
  return requestClient.get<CommissionOrderAdminApi.PagedListOfCommissionOrderDto>(
    `${API_PREFIX}/CommissionOrderGrantListAsync`,
    { params },
  );
};

/**
 * 删除提成单（只有录入状态与驳回状态可以删）
 */
export const deleteCommissionOrder = (id: string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id: String(id) },
  });
};

/**
 * 提交审核
 */
export const submitCommissionOrder = (
  data: CommissionOrderAdminApi.CommissionOrderSubmitDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/SubmitAsync`, data);
};

/**
 * 撤销提交（只有审核中且还没有任何人审过才能撤）
 */
export const unSubmitCommissionOrder = (
  data: CommissionOrderAdminApi.CommissionOrderSubmitDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/UnSubmitAsync`, data);
};

/**
 * 审核（通过或驳回）
 */
export const auditCommissionOrder = (
  data: CommissionOrderAdminApi.CommissionOrderAuditDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/AuditAsync`, data);
};

/**
 * 批量审核（一批共用同一个结论与同一条审核意见，全部校验通过才执行）
 */
export const batchAuditCommissionOrder = (
  data: CommissionOrderAdminApi.CommissionOrderBatchAuditDto,
) => {
  return requestClient.post<CommissionOrderAdminApi.CommissionOrderBatchResultDto>(
    `${API_PREFIX}/BatchAuditAsync`,
    data,
  );
};

/**
 * 审核后驳回（审核中与审核通过都能驳，已发放完成的不可驳回）
 */
export const rejectCommissionOrder = (
  data: CommissionOrderAdminApi.CommissionOrderRejectDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/RejectAsync`, data);
};

/**
 * 批量审核后驳回（一批共用同一条驳回原因，全部校验通过才执行）
 */
export const batchRejectCommissionOrder = (
  data: CommissionOrderAdminApi.CommissionOrderBatchRejectDto,
) => {
  return requestClient.post<CommissionOrderAdminApi.CommissionOrderBatchResultDto>(
    `${API_PREFIX}/BatchRejectAsync`,
    data,
  );
};

/**
 * 发放（只有审核通过的可发放，发放完成是终态）
 */
export const grantCommissionOrder = (
  data: CommissionOrderAdminApi.CommissionOrderGrantDto,
) => {
  return requestClient.post<boolean>(`${API_PREFIX}/GrantAsync`, data);
};

/**
 * 批量发放（一律按各自应发金额全额发放，没有金额入参；发放备注必填；全部校验通过才执行）
 */
export const batchGrantCommissionOrder = (
  data: CommissionOrderAdminApi.CommissionOrderBatchGrantDto,
) => {
  return requestClient.post<CommissionOrderAdminApi.CommissionOrderBatchResultDto>(
    `${API_PREFIX}/BatchGrantAsync`,
    data,
  );
};
