import { requestClient } from '#/api/request';

export namespace ClientAppApi {
  /** 合作状态枚举 */
  export enum CoopStatus {
    /** 潜在 */
    Potential = 0,
    /** 正式 */
    Formal = 1,
    /** 暂停合作 */
    Suspended = 2,
    /** 黑名单 */
    Blacklist = 3,
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

  /** 客户简易DTO（用于外键关联场景） */
  export interface ClientSimpleDto {
    /** 客户主键id */
    id: string;
    /** 客户简称 */
    name?: string;
    /** 客户代码 */
    code?: string;
    /** 客户全称 */
    fullName?: string;
    /** 客户英文名 */
    enName?: string;
    /** 是否失信 */
    isDishonest?: boolean;
    /** 企业类型（前端自定义枚举） */
    enterpriseType?: number;
    /** 是否共享 */
    isShared?: boolean;
    /** 归属组织id */
    orgId?: null | number;
    /** 组织串（从最高级组织到该组织），可空 */
    orgs?: null | OrganizationUnitSimpleDto[];
  }

  /** 客户航线DTO */
  export interface ClientLaneDto {
    /** 航线id */
    id: number;
    /** 航线中文名称 */
    laneName?: string;
  }

  /** 干系人DTO */
  export interface ClientStakeholderDto {
    /** 合作客户id */
    clientId: string;
    /** 干系人 */
    userId: number;
    /** 是否默认 */
    isDefault: boolean;
    /** 用户属性 */
    userAttribute?: number;
    /** 干系人昵称 */
    userNickName?: string;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: number;
  }

  /** 客户按行业类别分组项 */
  export interface ClientIndustryCategoryGroupItem {
    /** 单个行业类别字符（如 'p', 'a' 等） */
    key: string;
    /** 该行业类别下的客户简易列表 */
    value: ClientSimpleDto[];
  }

  /** 分页列表响应 */
  export interface PagedListOfClientSimpleDto {
    items: ClientSimpleDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 分页查询参数 */
  export interface ClientQueryDto {
    /** 关键字，模糊匹配客户简称、代码、全称、英文名、备注 */
    keyword?: string;
    /** 行业类别（业务下拉场景建议必传，仅 1 位）；传 'p' 时额外启用干系人数据权限过滤 */
    industryCategory: string;
    /** 业务来源id，为空不筛选 */
    codeSourceId?: number | string | null;
    /** 是否失信，为空不筛选 */
    isDishonest?: boolean;
    /** 企业类型（前端自定义枚举），为空不筛选 */
    enterpriseType?: number;
    /** 是否共享，为空不筛选 */
    isShared?: boolean;
    /** 归属组织id，为空不筛选 */
    orgId?: null | number;
    /** 当前页码，从1开始，默认1 */
    pageIndex?: number;
    /** 每页条数，默认10，范围1~1000 */
    pageSize?: number;
    /** 排序字段，默认 CreationTime DESC */
    sorting?: string;
  }

  /** 业务来源简易输出（外键关联用） */
  export interface CodeSourceSimpleDto {
    /** 主键id */
    id: number;
    /** 代码 */
    code?: null | string;
    /** 中文名称 */
    cnName?: null | string;
    /** 英文名称 */
    enName?: null | string;
  }

  /**
   * 客户失信状态、业务来源与干系人（销售/客服/操作/单证）摘要
   * 干系人分组逻辑与 ClientAdmin.DetailAsync 一致；数据权限与列表一致
   */
  export interface ClientDishonestStakeholderDto {
    /** 客户id */
    id: string;
    /** 是否失信 */
    isDishonest: boolean;
    /** 业务来源 */
    codeSource?: CodeSourceSimpleDto | null;
    /** 干系人列表 销售 */
    sales?: ClientStakeholderDto[] | null;
    /** 干系人列表 客服 */
    customerServices?: ClientStakeholderDto[] | null;
    /** 干系人列表 操作 */
    operations?: ClientStakeholderDto[] | null;
    /** 干系人列表 单证 */
    documentations?: ClientStakeholderDto[] | null;
  }
}

const API_PREFIX = '/services/app/Client';

/**
 * 获取合作客户简易分页列表
 * 登录即可调用，返回 ClientSimpleDto，筛选条件与 Admin 列表一致
 * 适用于下拉选择委托单位、结算对象、订舱代理等外键关联场景
 * @param params 查询参数
 */
export const getClientPagedList = (params: ClientAppApi.ClientQueryDto) => {
  return requestClient.get<ClientAppApi.PagedListOfClientSimpleDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 客户按行业类别分组
 * 无入参，一次性返回按行业类别（单字符）分组的客户简易列表
 * - 含委托单位(p)的客户走数据权限过滤
 * - 不含 p 的全部返回
 * - 按单字符分组返回 key/value
 * 适用于按行业分组展示/选择客户
 */
export const getClientGroupedByIndustryCategory = () => {
  return requestClient.get<ClientAppApi.ClientIndustryCategoryGroupItem[]>(
    `${API_PREFIX}/GetGroupedByIndustryCategoryAsync`,
  );
};

/**
 * 获取指定客户的失信状态、业务来源与干系人（销售/客服/操作/单证）
 * 登录即可调用（非 ClientAdmin）；干系人分组与 Admin 详情一致
 * 适用于业务页选择委托单位后带出业务来源与干系人
 * @param id 客户id（Guid，建议传 string 避免精度丢失）
 */
export const getClientDishonestStakeholders = (id: string) => {
  return requestClient.get<ClientAppApi.ClientDishonestStakeholderDto>(
    `${API_PREFIX}/GetDishonestStakeholdersAsync`,
    { params: { id } },
  );
};
