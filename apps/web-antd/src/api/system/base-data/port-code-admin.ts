import { requestClient } from '#/api/request';

export namespace PortCodeAdminApi {
  /** 新增港口信息参数 */
  export interface PortCodeAddDto {
    /** 港口英文名称 */
    portName?: string;
    /** 港口中文名称 */
    cnName?: string;
    /** 所在大洲 */
    chau?: string;
    /** 说明 */
    explain?: string;
    /** 港口类型 */
    portType?: string;
    /** 国家Id */
    countryId?: number;
    /** 航线Id */
    laneId?: number;
    /** EDI代码 */
    ediCode?: string;
    /** 统计区域 */
    statisticalArea?: string;
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

  /** 编辑港口信息参数 */
  export interface PortCodeEditDto {
    id: number;
    /** 港口英文名称 */
    portName?: string;
    /** 港口中文名称 */
    cnName?: string;
    /** 所在大洲 */
    chau?: string;
    /** 说明 */
    explain?: string;
    /** 港口类型 */
    portType?: string;
    /** 国家Id */
    countryId?: number;
    /** 航线Id */
    laneId?: number;
    /** EDI代码 */
    ediCode?: string;
    /** 统计区域 */
    statisticalArea?: string;
    /** 状态 0启用 1禁用 */
    status?: number;
  }

  /** 港口信息详情/列表输出 */
  export interface PortCodeDto {
    /** 港口英文名称 */
    portName?: string;
    /** 港口中文名称 */
    cnName?: string;
    /** 国家名称 */
    countryName?: string;
    /** 所在大洲 */
    chau?: string;
    /** 说明 */
    explain?: string;
    /** 港口类型 */
    portType?: string;
    /** 国家Id */
    countryId?: number;
    /** 航线Id */
    laneId?: number;
    /** 航线代码 */
    laneCode?: string;
    /** 航线中文名称 */
    laneName?: string;
    /** 航线 */
    lane?: string;
    /** EDI代码 */
    ediCode?: string;
    /** 统计区域 */
    statisticalArea?: string;
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
  export interface PagedListOfPortCodeDto {
    skipCount?: number;
    maxResultCount?: number;
    items: PortCodeDto[];
    totalCount: number;
    currentPage?: number;
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

const API_PREFIX = '/services/app/PortCodeAdmin';

/**
 * 获取港口信息分页列表
 */
export const getPortCodePagedList = (
  params: PortCodeAdminApi.GetPagedListParams,
) => {
  return requestClient.get<PortCodeAdminApi.PagedListOfPortCodeDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取港口信息详情
 */
export const getPortCodeDetail = (id: number) => {
  return requestClient.get<PortCodeAdminApi.PortCodeDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

/**
 * 新增港口信息
 */
export const addPortCode = (data: PortCodeAdminApi.PortCodeAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑港口信息
 */
export const editPortCode = (data: PortCodeAdminApi.PortCodeEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除港口信息
 */
export const deletePortCode = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
