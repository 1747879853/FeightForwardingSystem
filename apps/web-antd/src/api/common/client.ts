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
    /** 行业类别；传 'p' 时额外启用干系人数据权限过滤 */
    industryCategory?: string;
    /** 业务来源id，为空不筛选 */
    codeSourceId?: number | string | null;
    /** 客户合作状态多选，为空不筛选 */
    clientCoopStatus?: CoopStatus[];
    /** 供应商合作状态多选，为空不筛选 */
    supplierCoopStatus?: CoopStatus[];
    /** 当前页码，从1开始，默认1 */
    pageIndex?: number;
    /** 每页条数，默认10，范围1~1000 */
    pageSize?: number;
    /** 排序字段，默认 CreationTime DESC */
    sorting?: string;
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
