import type { UserAttribute } from '#/api/system/user-admin';

import { requestClient } from '#/api/request';

export namespace CommissionConfigAdminApi {
  // ==================== 枚举定义 ====================

  /** 提成类型 */
  export enum CommissionType {
    /** 销售提成 */
    Sales = 0,
    /** 操作提成 */
    Operation = 1,
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

  /** 条件字段 */
  export enum CommissionConditionField {
    /** 海运起运港 */
    SeaDeparturePort = 0,
    /** 海运目的港 */
    SeaDestinationPort = 1,
    /** 空运起运地 */
    AirDeparturePort = 2,
    /** 空运目的地 */
    AirDestinationPort = 3,
    /** 货物类型 */
    CargoType = 4,
    /** 按票（不需要比较符也不需要比较值，必须独占整个条件项） */
    PerTicket = 5,
  }

  /** 条件比较符 */
  export enum CommissionConditionOperator {
    /** 等于 */
    Equal = 0,
    /** 不等于 */
    NotEqual = 1,
    /** 包含于 */
    In = 2,
    /** 不包含于 */
    NotIn = 3,
  }

  // ==================== 共用 SimpleDto ====================

  /** 用户简易对象（本接口只填 id / nickName / userAttribute 三项） */
  export interface UserSimpleDto {
    /** 用户id */
    id: number;
    /** 昵称 */
    nickName: string;
    /** 用户属性位掩码 */
    userAttribute?: UserAttribute;
  }

  /** 组织简易对象 */
  export interface OrganizationUnitSimpleDto {
    /** 组织id */
    id: number;
    /** 组织名 */
    name: string;
    /** 本位币id */
    localCurrencyId?: number | null;
    /** 本位币编码（仅组织串 Orgs 填，ApplyOrgs 不填） */
    localCurrencyCode?: string | null;
    /** 是否公司节点 */
    isCompany?: boolean;
  }

  /** 航线简易对象 */
  export interface LaneCodeSimpleDto {
    id?: number | string;
    code?: string;
    laneName?: string;
    laneEnName?: string;
  }

  /** 国家简易对象 */
  export interface CountryCodeSimpleDto {
    id?: number | string;
    code?: string;
    countryName?: string;
    countryEnName?: string;
  }

  /** 海运港口简易对象（复用港口模块的共享 DTO） */
  export interface PortCodeSimpleDto {
    /** 港口id */
    id: number;
    /** 港口代码 */
    portName?: string | null;
    /** 中文名称 */
    cnName?: string | null;
    /** EDI代码 */
    ediCode?: string | null;
    /** 航线（挂在港口上） */
    lane?: LaneCodeSimpleDto | null;
    /** 国家（挂在港口上） */
    country?: CountryCodeSimpleDto | null;
  }

  /** 空运港口简易对象（复用空运港口模块的共享 DTO） */
  export interface AirPortSimpleDto {
    /** 港口id */
    id: number;
    /** 三字码 */
    iataCode?: string | null;
    /** 英文名称 */
    enName?: string | null;
    /** 中文名称 */
    cnName?: string | null;
  }

  // ==================== 入参 DTO ====================

  /** 提成阶梯入参（无 id） */
  export interface CommissionTierInputDto {
    /** 起始金额，含本值 */
    minAmount: number;
    /** 结束金额，不含本值。只有最后一档不传（=无上限），且最后一档必须不传 */
    maxAmount?: number | null;
    /** 本档提成比例(%)，0~1000 */
    rate: number;
  }

  /** 销售提成规则入参 */
  export interface CommissionSalesInputDto {
    /** 利润门槛，不能为负。一票利润达到该值才计入总利润 */
    profitThreshold?: number | null;
    /** 门槛比较符：0大于 1大于等于 */
    profitThresholdOperator?: ProfitThresholdOperator | null;
    /** 负利润提成比例(%)，取值 0~1000 */
    negativeProfitRate?: number | null;
    /** 计算方式：0固定比例 1按阶梯(阶梯内分段计费) 2按阶梯(达标后整体到档) */
    salesCommissionType?: SalesCommissionType | null;
    /** 固定提成比例(%)，计算方式=0 时必填，取值 0~1000；其余方式必须不传 */
    fixedRate?: number | null;
    /** 提成阶梯，计算方式=1/2 时必填至少一档；=0 时必须不传 */
    tiers?: CommissionTierInputDto[] | null;
  }

  /** 条件值入参（按字段只有其中一个字段有值） */
  export interface CommissionConditionValueInputDto {
    /** 港口id。ConditionField 为 0/1 传 PortCode.Id（海运港口），2/3 传 AirPort.Id（空运港口） */
    portId?: number | null;
    /** 货物类型。ConditionField 为 4 时必填 */
    cargoId?: CargoType | null;
  }

  /** 条件入参 */
  export interface CommissionConditionInputDto {
    /** 条件字段：0海运起运港 1海运目的港 2空运起运地 3空运目的地 4货物类型 5按票 */
    conditionField: CommissionConditionField;
    /** 比较符：0等于 1不等于 2包含于 3不包含于。字段为 5（按票）时不参与判定，传什么都存 0 */
    operator?: CommissionConditionOperator | null;
    /** 比较值。字段为 0~4 时至少一个，且比较符为 0/1 时只能传一个；字段为 5（按票）时必须不传 */
    values?: CommissionConditionValueInputDto[] | null;
  }

  /** 条件组入参（组内为「且」，组间为「或」） */
  export interface CommissionConditionGroupInputDto {
    /** 组内条件，至少一条 */
    conditions: CommissionConditionInputDto[];
  }

  /** 条件项入参（无 id） */
  export interface CommissionRuleInputDto {
    /** 条件项名称，最长128，仅用于识别 */
    name?: string | null;
    /** 每票提成金额(人民币)，必须 > 0 */
    amount: number;
    /** 条件组，至少一组。不带任何筛选的「每票N元」请用 ConditionField=5（按票）的条件，不要传空数组 */
    conditionGroups: CommissionConditionGroupInputDto[];
  }

  /** 操作提成规则入参 */
  export interface CommissionOperationInputDto {
    /** 条件项，至少一条。一票业务把所有条件项挨个判一遍，命中的金额全部累加 */
    rules: CommissionRuleInputDto[];
  }

  /** 新增提成配置入参 */
  export interface CommissionConfigAddDto {
    /** 配置名称，最长128，同租户唯一，大小写不敏感 */
    name: string;
    /** 排序id，列表默认按其升序，也是同层级组织命中多条时的取舍依据 */
    sortId: number;
    /** 备注，最长1024 */
    remark?: string | null;
    /** 是否启用，false 时不参与提成计算，也不参与冲突校验 */
    isEnabled: boolean;
    /** 所属组织，数据权限用。当前停用，本字段不落库也不校验，传不传都行 */
    orgId?: number | null;
    /** 提成类型：0销售提成 1操作提成 */
    commissionType: CommissionType;
    /** 生效起始会计期间，只取年月，后端归一化到当月1号。不传=不限起始 */
    effectiveStartDate?: string | null;
    /** 生效截止会计期间，只取年月，含当月。不传=不限截止 */
    effectiveEndDate?: string | null;
    /** 适用人id集合，多选，与 orgIds 至少填一个，不允许重复 */
    userIds?: number[] | null;
    /** 适用组织id集合，多选，与 userIds 至少填一个，不允许重复 */
    orgIds?: number[] | null;
    /** 适用业务类型，多选，不传或空 = 全部业务类型 */
    bizTypes?: BizType[] | null;
    /** 底薪金额，不能为负。与 baseSalaryMode 两者都填才算底薪 */
    baseSalary?: number | null;
    /** 底薪模式：0直接加 1提成与底薪取最大值 */
    baseSalaryMode?: BaseSalaryMode | null;
    /** 销售提成规则。commissionType=0 时必填，=1 时必须不传 */
    sales?: CommissionSalesInputDto | null;
    /** 操作提成规则。commissionType=1 时必填，=0 时必须不传 */
    operation?: CommissionOperationInputDto | null;
  }

  /** 编辑提成配置入参（在新增入参基础上多一个 id，其余校验完全一致） */
  export interface CommissionConfigEditDto extends CommissionConfigAddDto {
    /** 提成配置id */
    id: string;
  }

  /** 提成配置分页查询入参 */
  export interface CommissionConfigQueryDto {
    /** 页码，从1开始，默认1 */
    pageIndex?: number;
    /** 每页条数，默认10 */
    pageSize?: number;
    /** 排序，默认 SortId ASC，不是创建时间倒序 */
    sorting?: string;
    /** 关键字，模糊匹配配置名称或备注 */
    keyword?: string;
    /** 提成类型，不传=全部 */
    commissionType?: CommissionType;
    /** 是否启用，不传=全部 */
    isEnabled?: boolean;
    /** 适用人，只返回适用人包含该用户的配置 */
    userId?: number;
    /** 适用组织，只返回适用组织包含该组织的配置，不含下属组织 */
    applyOrgId?: number;
    /** 在该会计期间生效，只取年月。只返回生效期覆盖该月的配置（两端为空视为不限制） */
    effectiveDate?: string;
  }

  /** Guid类型Id Dto */
  export interface GuidIdDto {
    id?: string;
  }

  // ==================== 出参 DTO ====================

  /** 提成阶梯 */
  export interface CommissionTierDto {
    /** 阶梯id（编辑后会变，别缓存） */
    id: string;
    /** 起始金额，含本值 */
    minAmount: number;
    /** 结束金额，不含本值。null=无上限 */
    maxAmount?: number | null;
    /** 本档提成比例(%) */
    rate: number;
    /** 排序id，从1开始 */
    sortId: number;
  }

  /** 销售提成规则（仅 CommissionType=0 有值） */
  export interface CommissionSalesDto {
    /** 利润门槛 */
    profitThreshold: number;
    /** 门槛比较符：0大于 1大于等于 */
    profitThresholdOperator: ProfitThresholdOperator;
    /** 负利润提成比例(%) */
    negativeProfitRate: number;
    /** 计算方式：0固定比例 1阶梯内分段计费 2达标后整体到档 */
    salesCommissionType: SalesCommissionType;
    /** 固定提成比例(%)，仅计算方式=0 时有值 */
    fixedRate?: number | null;
    /** 提成阶梯，按起始金额升序。计算方式=0 时为空列表 */
    tiers: CommissionTierDto[];
  }

  /** 条件值（按字段只有其中一个对象有值） */
  export interface CommissionConditionValueDto {
    /** 条件值id（编辑后会变） */
    id: string;
    /** 海运港口，仅 ConditionField 为 0/1 时有值。港口被删掉时返回 null */
    seaPort?: PortCodeSimpleDto | null;
    /** 空运港口，仅 ConditionField 为 2/3 时有值。港口被删掉时返回 null */
    airPort?: AirPortSimpleDto | null;
    /** 货物类型，仅 ConditionField 为 4 时有值 */
    cargoId?: CargoType | null;
    /** 排序id，从1开始 */
    sortId: number;
  }

  /** 条件 */
  export interface CommissionConditionDto {
    /** 条件id（编辑后会变） */
    id: string;
    /** 条件字段：0海运起运港 1海运目的港 2空运起运地 3空运目的地 4货物类型 5按票。决定 values 里哪个对象有值 */
    conditionField: CommissionConditionField;
    /** 比较符。字段为 5（按票）时恒为 0 且无意义，不要显示 */
    operator: CommissionConditionOperator;
    /** 组内排序id，从1开始 */
    sortId: number;
    /** 比较值，按 sortId 升序。字段为 5（按票）时恒为空列表 */
    values: CommissionConditionValueDto[];
  }

  /** 条件组（组间为「或」） */
  export interface CommissionConditionGroupDto {
    /** 分组号，从1开始 */
    groupId: number;
    /** 组内条件，按 sortId 升序，组内为「且」 */
    conditions: CommissionConditionDto[];
  }

  /** 条件项 */
  export interface CommissionRuleDto {
    /** 条件项id（编辑后会变） */
    id: string;
    /** 条件项名称 */
    name: string;
    /** 每票提成金额(人民币) */
    amount: number;
    /** 排序id，从1开始 */
    sortId: number;
    /** 条件组，按 groupId 升序，至少一组。唯一的条件是按票时，该条件项对所有票恒命中 */
    conditionGroups: CommissionConditionGroupDto[];
  }

  /** 操作提成规则（仅 CommissionType=1 有值） */
  export interface CommissionOperationDto {
    /** 条件项，按 sortId 升序 */
    rules: CommissionRuleDto[];
  }

  /** 提成配置（列表与详情共用） */
  export interface CommissionConfigDto {
    /** 提成配置id */
    id: string;
    /** 配置名称 */
    name: string;
    /** 排序id */
    sortId: number;
    /** 备注 */
    remark?: string | null;
    /** 是否启用 */
    isEnabled: boolean;
    /** 提成类型：0销售 1操作。决定 sales 与 operation 哪个有值 */
    commissionType: CommissionType;
    /** 生效起始会计期间，恒为当月1号，null=不限起始 */
    effectiveStartDate?: string | null;
    /** 生效截止会计期间，恒为当月1号，含当月，null=不限截止 */
    effectiveEndDate?: string | null;
    /** 适用业务类型，升序。空列表 = 全部业务类型 */
    bizTypes: BizType[];
    /** 底薪金额 */
    baseSalary?: number | null;
    /** 底薪模式：0直接加 1取最大值 */
    baseSalaryMode?: BaseSalaryMode | null;
    /** 是否真的算底薪，上面两个字段都有值才为 true。前端直接用这个，别自己判 */
    isBaseSalaryEnabled: boolean;
    /** 适用人 */
    applyUsers: UserSimpleDto[];
    /** 适用组织，按名称升序 */
    applyOrgs: OrganizationUnitSimpleDto[];
    /** 销售提成规则，仅 CommissionType=0 有值，否则 null */
    sales?: CommissionSalesDto | null;
    /** 操作提成规则，仅 CommissionType=1 有值，否则 null */
    operation?: CommissionOperationDto | null;
    /** 数据所属人id，数据权限用。当前停用，恒为 0 */
    userId: number;
    /** 数据所属组织id，数据权限用。当前停用，恒为 null */
    orgId?: number | null;
    /** 数据所属组织串，从最高级组织到本组织。当前停用，恒为空列表。与 applyOrgs 语义不同，别混 */
    orgs: OrganizationUnitSimpleDto[];
    /** 创建人昵称 */
    creatorUserName?: string | null;
    /** 最后修改人昵称 */
    lastModifierUserName?: string | null;
    /** 创建时间 */
    creationTime: string;
    /** 创建人id */
    creatorUserId?: number | null;
    /** 最后修改时间 */
    lastModificationTime?: string | null;
    /** 最后修改人id */
    lastModifierUserId?: number | null;
  }

  /** 分页列表响应 */
  export interface PagedListOfCommissionConfigDto {
    items: CommissionConfigDto[];
    totalCount: number;
    skipCount: number;
    maxResultCount: number;
  }
}

// ==================== API 接口定义 ====================

const API_PREFIX = '/services/app/CommissionConfigAdmin';

/**
 * 新增提成配置
 */
export const addCommissionConfig = (
  data: CommissionConfigAdminApi.CommissionConfigAddDto,
) => {
  return requestClient.post<string>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑提成配置（全量提交，所有子表不带 id 整棵重建，没提交的原有数据会删除，编辑后子表 id 会变）
 */
export const editCommissionConfig = (
  data: CommissionConfigAdminApi.CommissionConfigEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除提成配置（主表软删除，子表硬删除）
 */
export const deleteCommissionConfig = (id: string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id: String(id) },
  });
};

/**
 * 提成配置 分页列表
 */
export const getCommissionConfigPagedList = (
  params: CommissionConfigAdminApi.CommissionConfigQueryDto,
) => {
  return requestClient.get<CommissionConfigAdminApi.PagedListOfCommissionConfigDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 提成配置 详情
 */
export const getCommissionConfigDetail = (id: string) => {
  return requestClient.get<CommissionConfigAdminApi.CommissionConfigDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: String(id) } },
  );
};
