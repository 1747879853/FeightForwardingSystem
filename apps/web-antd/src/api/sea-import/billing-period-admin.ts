/**
 * 海进侧旧账期服务已删除，请使用 ClientAdmin.billingPeriods / SyncBillingPeriodAsync。
 * 本文件不再发起 ClientBillingPeriodAdmin 请求。
 */
export namespace BillingPeriodAdminApi {
  /** 新增账单期参数 */
  export interface BillingPeriodAddDto {
    /** 客户id */
    clientId: number | string;
    /**长期有效  */
    permanent: boolean;
    /** 生效时间 */
    effectiveTime?: string;
    /** 失效时间 */
    expiringTime?: string;
    /** 业务类型 */
    bizTypes?: number[];
    /** 结算方式 */
    settlementType: number;
    /**间隔月份 */
    months?: number;
    /** 结算日 */
    settlementDay?: number;
    /** 天数 */
    days?: number;
    /** 备注 */
    remark?: string;
    /** 组织id */
    organizationUnitIds?: number[];
    /** 用户id */
    userIds?: number[];
    /**业务来源  */
    codeSourceIds?: number[];
  }
  /** 修改账单期参数 */
  export interface BillingPeriodEditDto extends BillingPeriodAddDto {
    id: number | string;
  }

  /** 账单详情 */
  export interface BillingPeriodDetailDto {
    /** id */
    id: number | string;
    /** 客户id */
    clientId: number | string;
    /**长期有效  */
    permanent: boolean;
    /** 生效时间 */
    effectiveTime?: string;
    /** 失效时间 */
    expiringTime?: string;
    /** 业务类型 */
    bizTypes?: number[];
    /** 结算方式 */
    settlementType: number;
    /**间隔月份 */
    months?: number;
    /** 结算日 */
    settlementDay?: number;
    /** 天数 */
    days?: number;
    /** 备注 */
    remark?: string;
    /** 组织id */
    organizationUnitIds?: number[];
    /** 用户id */
    userIds?: number[];
    /**业务来源  */
    codeSourceIds?: number[];
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    /** 关键字 模糊匹配 */
    Keyword?: string;
    /** 客户id */
    ClientId?: number | string;
    /** 排序 默认是Id */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }

  /** 分页列表响应 */
  export interface PagedListOfBillingPeriodDto {
    skipCount?: number;
    maxResultCount?: number;
    items: BillingPeriodDetailDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }
}
