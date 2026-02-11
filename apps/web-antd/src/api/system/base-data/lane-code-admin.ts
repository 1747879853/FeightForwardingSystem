import { requestClient } from '#/api/request';

export namespace LaneCodeAdminApi {
  /** 新增航线参数 */
  export interface LaneCodeAddDto {
    /** 航线代码 */
    code?: string;
    /** 航线中文名称 */
    laneName?: string;
    /** 航线英文名称 */
    laneEnName?: string;
    /** EDI代码 */
    ediCode?: string;
    /** 状态 0启用 1禁用 */
    status?: number;
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
    id?: number;
  }

  /** 编辑航线参数 */
  export interface LaneCodeEditDto {
    id: number;
    /** 航线代码 */
    code?: string;
    /** 航线中文名称 */
    laneName?: string;
    /** 航线英文名称 */
    laneEnName?: string;
    /** EDI代码 */
    ediCode?: string;
    /** 状态 0启用 1禁用 */
    status?: number;
  }

  /** 航线详情/列表输出 */
  export interface LaneCodeDto {
    /** 航线代码 */
    code?: string;
    /** 航线中文名称 */
    laneName?: string;
    /** 航线英文名称 */
    laneEnName?: string;
    /** EDI代码 */
    ediCode?: string;
    /** 状态 0启用 1禁用 */
    status?: number;
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
  export interface PagedListOfLaneCodeDto {
    /** 跳过的数量 */
    skipCount?: number;
    /** 返回的最大数据量 */
    maxResultCount?: number;
    /** 分好页的数据集合 */
    items: LaneCodeDto[];
    /** 总记录数 */
    totalCount: number;
    /** 当前页 */
    currentPage?: number;
    /** 总页数 */
    totalPages?: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    /** 关键字 模糊匹配 */
    Keyword?: string;
    /** 状态 0启用 1禁用 */
    Status?: number;
    /** 排序 默认是Id */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/LaneCodeAdmin';

/**
 * 获取航线分页列表
 */
export const getLaneCodePagedList = (
  params: LaneCodeAdminApi.GetPagedListParams,
) => {
  return requestClient.get<LaneCodeAdminApi.PagedListOfLaneCodeDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取航线详情
 */
export const getLaneCodeDetail = (id: number) => {
  return requestClient.get<LaneCodeAdminApi.LaneCodeDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

/**
 * 新增航线
 */
export const addLaneCode = (data: LaneCodeAdminApi.LaneCodeAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑航线
 */
export const editLaneCode = (data: LaneCodeAdminApi.LaneCodeEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除航线
 */
export const deleteLaneCode = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
