import { requestClient } from '#/api/request';

export namespace CtnCodeAdminApi {
  /** 新增集装箱信息参数 */
  export interface CtnCodeAddDto {
    /** 集装箱类型 */
    ctnSize?: string;
    /** 集装箱尺寸 */
    ctnType?: string;
    /** 表现形式 */
    ctnName?: string;
    /** EDI代码 */
    ediCode?: string;
    /** 箱皮重 */
    ctnWeight?: number;
    /** 中文说明 */
    cnExplain?: string;
    /** 英文说明 */
    enExplain?: string;
    /** AFR代码 */
    afrCode?: string;
    /** 默认限重 */
    limitWeight?: number;
    /** TEU */
    teu?: number;
    /** 排序号 */
    orderNo?: number;
    /** 状态 0启用 1禁用 */
    status?: number;
    /** 是否默认展示列 */
    isDefault?: boolean;
    /** 备注 */
    remark?: string;
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
    id?: number;
  }

  /** 编辑集装箱信息参数 */
  export interface CtnCodeEditDto {
    id: number;
    /** 集装箱类型 */
    ctnSize?: string;
    /** 集装箱尺寸 */
    ctnType?: string;
    /** 表现形式 */
    ctnName?: string;
    /** EDI代码 */
    ediCode?: string;
    /** 箱皮重 */
    ctnWeight?: number;
    /** 中文说明 */
    cnExplain?: string;
    /** 英文说明 */
    enExplain?: string;
    /** AFR代码 */
    afrCode?: string;
    /** 默认限重 */
    limitWeight?: number;
    /** TEU */
    teu?: number;
    /** 排序号 */
    orderNo?: number;
    /** 状态 0启用 1禁用 */
    status?: number;
    /** 是否默认展示列 */
    isDefault?: boolean;
    /** 备注 */
    remark?: string;
  }

  /** 集装箱信息详情/列表输出 */
  export interface CtnCodeDto {
    /** 集装箱类型 */
    ctnSize?: string;
    /** 集装箱尺寸 */
    ctnType?: string;
    /** 表现形式 */
    ctnName?: string;
    /** EDI代码 */
    ediCode?: string;
    /** 箱皮重 */
    ctnWeight?: number;
    /** 中文说明 */
    cnExplain?: string;
    /** 英文说明 */
    enExplain?: string;
    /** AFR代码 */
    afrCode?: string;
    /** 默认限重 */
    limitWeight?: number;
    /** TEU */
    teu?: number;
    /** 排序号 */
    orderNo?: number;
    /** 状态 0启用 1禁用 */
    status?: number;
    /** 是否默认展示列 */
    isDefault?: boolean;
    /** 备注 */
    remark?: string;
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
    id: number;
  }

  /** 分页列表响应 */
  export interface PagedListOfCtnCodeDto {
    skipCount?: number;
    maxResultCount?: number;
    items: CtnCodeDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    /** 关键字 模糊匹配 */
    Keyword?: string;
    /** 集装箱类型 */
    CtnSize?: string;
    /** 集装箱尺寸 */
    CtnType?: string;
    /** 表现形式 */
    CtnName?: string;
    /** EDI代码 */
    EdiCode?: string;
    /** 中文说明 */
    CnExplain?: string;
    /** 英文说明 */
    EnExplain?: string;
    /** AFR代码 */
    AfrCode?: string;
    /** 排序号 */
    OrderNo?: number;
    /** 状态 0启用 1禁用 */
    Status?: number;
    /** 是否默认展示列 */
    IsDefault?: boolean;
    /** 备注 */
    Remark?: string;
    /** 排序 默认是Id */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/CtnCodeAdmin';

/**
 * 获取集装箱信息分页列表
 */
export const getCtnCodePagedList = (
  params: CtnCodeAdminApi.GetPagedListParams,
) => {
  return requestClient.get<CtnCodeAdminApi.PagedListOfCtnCodeDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取集装箱信息详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getCtnCodeDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<CtnCodeAdminApi.CtnCodeDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增集装箱信息
 */
export const addCtnCode = (data: CtnCodeAdminApi.CtnCodeAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑集装箱信息
 */
export const editCtnCode = (data: CtnCodeAdminApi.CtnCodeEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除集装箱信息
 */
export const deleteCtnCode = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
