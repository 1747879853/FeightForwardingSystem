import { requestClient } from '#/api/request';

const API_PREFIX = '/services/app/ClientBillingPeriodAdmin';

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
    bizTypes?: number;
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
/** 不分页列表响应 */
// export interface ListOfBillingPeriodDto <BillingPeriodDetailDto[]>

/**
 * 新增账单期
 */
export const addBillingPeriod = (
  data: BillingPeriodAdminApi.BillingPeriodAddDto,
) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 修改账单期
 */
export const editBillingPeriod = (
  data: BillingPeriodAdminApi.BillingPeriodEditDto,
) => {
  return requestClient.put<number>(`${API_PREFIX}/EditAsync`, data);
};
/**
 * 删除账单期
 */
export const deleteBillingPeriod = (id: number | string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};

/**
 * 获取账单期分页列表
 */
export const getBillingPeriodPagedList = (
  params: BillingPeriodAdminApi.GetPagedListParams,
) => {
  return requestClient.get<BillingPeriodAdminApi.PagedListOfBillingPeriodDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取账单期不分页列表
 */
export const getBillingPeriodList = (
  params: BillingPeriodAdminApi.GetPagedListParams,
) => {
  return requestClient.get<BillingPeriodAdminApi.BillingPeriodDetailDto[]>(
    `${API_PREFIX}/GetListAsync`,
    { params },
  );
};

/**
 * 获取账单期详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getBillingPeriodDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<BillingPeriodAdminApi.BillingPeriodDetailDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};
