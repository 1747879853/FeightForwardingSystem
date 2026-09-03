import { requestClient } from '#/api/request';
import type { CountryCodeAdminApi } from '#/api/system/base-data/country-code-admin';
import type { LaneCodeAdminApi } from '#/api/system/base-data/lane-code-admin';

// ==================== PortCode（非 Admin，只读接口）====================

export namespace PortCodeApi {
  /** 港口列表项（精简版，单字母字段以减小传输体积） */
  export interface PortCodeListItemDto {
    /** 主键ID */
    i: number;
    /** 港口英文名称/港口代码 */
    p: string;
    /** 港口中文名称 */
    c: string;
    /** 关联国家英文名称；无则为 null */
    e: string | null;
    /** 排序 id，值越大越靠前 */
    s: number;
  }
}

const PORT_CODE_API_PREFIX = '/services/app/PortCode';

/**
 * 获取全部港口列表（无需业务权限，仅需登录）
 *
 * 说明：
 * - 全量返回，不分页
 * - 包含启用和禁用的港口（ABP 软删除过滤后的全部）
 * - 后端按 SortId 降序返回，前端按返回顺序渲染
 * - 使用 ResponseCompression（gzip/brotli）压缩传输
 * - 字段使用单字母命名以减小体积：i(id), p(portName), c(cnName), e(countryEnName), s(sortId)
 *
 * @returns 港口列表（精简版）
 */
export const getPortCodeList = () => {
  return requestClient.get<PortCodeApi.PortCodeListItemDto[]>(
    `${PORT_CODE_API_PREFIX}/GetListAsync`,
  );
};

// ==================== PortCodeAdmin（管理接口，带权限）====================

export namespace PortCodeAdminApi {
  /** 新增港口信息参数 */
  export interface PortCodeAddDto {
    /** 港口英文名称 */
    portName?: string;
    /** 港口中文名称 */
    cnName?: string;
    /** 说明 */
    explain?: string;
    /** 港口类型 */
    portType?: string;
    /** 国家Id（大数经 json-bigint 解析为 string，需原样透传） */
    countryId?: number | string;
    /** 航线Id（大数经 json-bigint 解析为 string，需原样透传） */
    laneId?: number | string;
    /** EDI代码 */
    ediCode?: string;
    /** 统计区域 */
    statisticalArea?: string;
    /** 状态 0启用 1禁用 */
    status?: number;
    /** 排序 id，值越大越靠前；不传时后端按 0 处理 */
    sortId?: number;
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
    /** 港口Id（大数经 json-bigint 解析为 string，需原样透传） */
    id: number | string;
    /** 港口英文名称 */
    portName?: string;
    /** 港口中文名称 */
    cnName?: string;
    /** 说明 */
    explain?: string;
    /** 港口类型 */
    portType?: string;
    /** 国家Id（大数经 json-bigint 解析为 string，需原样透传） */
    countryId?: number | string;
    /** 航线Id（大数经 json-bigint 解析为 string，需原样透传） */
    laneId?: number | string;
    /** EDI代码 */
    ediCode?: string;
    /** 统计区域 */
    statisticalArea?: string;
    /** 状态 0启用 1禁用 */
    status?: number;
    /** 排序 id，值越大越靠前；不传时后端按 0 处理 */
    sortId?: number;
  }

  /** 港口信息详情/列表输出 */
  export interface PortCodeDto {
    /** 港口英文名称 */
    portName?: string;
    /** 港口中文名称 */
    cnName?: string;

    /** 国家对象（替代 countryName / countryEnName） */
    country?: CountryCodeAdminApi.CountryCodeDto;
    /** 所在大洲（列表 GetPagedListAsync 由 MapPortCodeDto 从实体 Chau 带出） */
    chau?: string;
    /** 说明 */
    explain?: string;
    /** 港口类型 */
    portType?: string;
    /** 国家Id（大数经 json-bigint 解析为 string） */
    countryId?: number | string;
    /** 航线Id（大数经 json-bigint 解析为 string） */
    laneId?: number | string;
    /** 航线对象（替代 laneCode / laneName） */
    lane?: LaneCodeAdminApi.LaneCodeDto;
    /** EDI代码 */
    ediCode?: string;
    /** 统计区域 */
    statisticalArea?: string;
    /** 状态 0启用 1禁用 */
    status?: number;
    /** 排序 id，值越大越靠前 */
    sortId?: number;
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
    /** 创建人昵称 */
    creatorUserName?: string;
    /** 港口Id（大数经 json-bigint 解析为 string） */
    id: number | string;
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
    /** 港口查询（模糊匹配港口英文/中文名称） */
    Keyword?: string;
    /** 航线Id */
    LaneId?: number | string;
    /** EDI代码（模糊匹配） */
    EdiCode?: string;
    /** 国家Id */
    CountryId?: number | string;
    /** 状态 0启用 1禁用 */
    Status?: number;
    /** 排序，管理列表首次加载必须传 sortId desc */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/PortCodeAdmin';

/** 管理端分页默认排序：值越大越靠前；调用方显式传 Sorting 时可覆盖 */
const DEFAULT_PORT_CODE_PAGED_SORT = 'sortId DESC';

/**
 * 获取港口信息分页列表
 *
 * 未传 Sorting 时默认 sortId 降序，避免后端回退为创建时间降序。
 */
export const getPortCodePagedList = (
  params: PortCodeAdminApi.GetPagedListParams,
) => {
  return requestClient.get<PortCodeAdminApi.PagedListOfPortCodeDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    {
      params: {
        ...params,
        Sorting: params.Sorting ?? DEFAULT_PORT_CODE_PAGED_SORT,
      },
    },
  );
};

/**
 * 获取港口信息详情
 * @param id 港口 ID，建议传 string 避免大数精度丢失（超过 2^53-1 的 ID 用 number 会丢精度）
 */
export const getPortCodeDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<PortCodeAdminApi.PortCodeDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
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
 * @param id 港口 ID，大数以 string 透传避免精度丢失
 */
export const deletePortCode = (id: number | string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
