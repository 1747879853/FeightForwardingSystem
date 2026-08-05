import type { CountryCodeAdminApi } from '#/api/system/base-data/country-code-admin';

import { requestClient } from '#/api/request';

// ==================== AirPort（业务端，仅需登录）====================

export namespace AirPortApi {
  /**
   * 分页查询参数
   *
   * 管理端与业务端共用；后端固定按 SortId 降序、Id 降序排序，不接受前端指定排序字段
   */
  export interface GetPagedListParams {
    /** 关键字，模糊匹配三字码/英中文名称/ICAO码/城市/备注及所属国家的代码与名称 */
    Keyword?: string;
    /** 状态 0启用 1禁用，不传为全部 */
    Status?: number;
    /** 国家Id 精确筛选；传了该条件时未选国家的机场不会出现 */
    CountryId?: number | string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }

  /** 业务端选机场列表项（比管理端精简，不含备注、排序 id 和审计信息） */
  export interface AirPortSelectDto {
    /** 机场Id（大数经 json-bigint 解析为 string） */
    id: number | string;
    /** 三字码 */
    iataCode?: string;
    /** 英文名称 */
    enName?: string;
    /** 机场名称（中文名称） */
    cnName?: string;
    /** ICAO码 */
    icaoCode?: string;
    /** 城市 */
    city?: string;
    /** 时区，相对 UTC 的小时偏移，可能带小数（如 5.75） */
    timeZone?: number;
    /** 状态 0启用 1禁用；本接口不按状态过滤，禁用项也会返回 */
    status?: number;
    /** 关联国家，未选国家时为 null */
    country?: CountryCodeAdminApi.CountryCodeDto | null;
  }

  /** 分页列表响应 */
  export interface PagedListOfAirPortSelectDto {
    skipCount?: number;
    maxResultCount?: number;
    items: AirPortSelectDto[];
    totalCount: number;
  }
}

const AIR_PORT_API_PREFIX = '/services/app/AirPort';

/**
 * 获取业务端选机场分页列表（无需业务权限，仅需登录）
 *
 * 说明：
 * - 系统不提供一次性返回全部机场的接口，关键字一律交给后端搜索，配合翻页/滚动加载
 * - 不按状态过滤，禁用的机场也会返回，是否置灰由前端决定
 * - 排序由后端固定为 SortId 降序、Id 降序
 */
export const getAirPortPagedList = (params: AirPortApi.GetPagedListParams) => {
  return requestClient.get<AirPortApi.PagedListOfAirPortSelectDto>(
    `${AIR_PORT_API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

// ==================== AirPortAdmin（管理接口，带权限）====================

export namespace AirPortAdminApi {
  /** 新增空运港口参数 */
  export interface AirPortAddDto {
    /** 三字码，后端自动去首尾空格并转大写，最长 8 位 */
    iataCode?: string;
    /** 英文名称 */
    enName?: string;
    /** 机场名称（中文名称）；编辑时传 null 清空 */
    cnName?: null | string;
    /** ICAO码；编辑时传 null 清空 */
    icaoCode?: null | string;
    /** 国家Id（大数经 json-bigint 解析为 string，需原样透传）；null 表示不选国家 */
    countryId?: null | number | string;
    /** 城市；编辑时传 null 清空 */
    city?: null | string;
    /** 时区，相对 UTC 的小时偏移，东正西负，绝对值必须小于 100 */
    timeZone?: null | number;
    /** 状态 0启用 1禁用 */
    status?: number;
    /** 排序 id，降序，大的在前；后端不会自动生成，必须传 */
    sortId?: number;
    /** 备注，最长 1024；编辑时传 null 清空 */
    remark?: null | string;
  }

  /** 编辑空运港口参数（全量提交，未传字段视为清空） */
  export interface AirPortEditDto extends AirPortAddDto {
    /** 机场Id（大数经 json-bigint 解析为 string，需原样透传） */
    id: number | string;
  }

  /** 空运港口详情/列表输出 */
  export interface AirPortDto {
    /** 机场Id（大数经 json-bigint 解析为 string） */
    id: number | string;
    /** 三字码，库中已是大写 */
    iataCode?: string;
    /** 英文名称 */
    enName?: string;
    /** 机场名称（中文名称） */
    cnName?: string;
    /** ICAO码 */
    icaoCode?: string;
    /** 国家Id（大数经 json-bigint 解析为 string），未选国家时为 null */
    countryId?: null | number | string;
    /** 城市 */
    city?: string;
    /** 时区，相对 UTC 的小时偏移，可能带小数（如 5.75） */
    timeZone?: null | number;
    /** 状态 0启用 1禁用 */
    status?: number;
    /** 排序 id，降序，大的在前 */
    sortId?: number;
    /** 备注 */
    remark?: string;
    /** 关联国家，未选国家时为 null，展示前必须判空 */
    country?: CountryCodeAdminApi.CountryCodeDto | null;
    creationTime?: string;
    creatorUserId?: number | string;
    /** 创建人昵称，取不到时为 null */
    creatorUserName?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number | string;
    /** 最后修改人昵称，取不到时为 null */
    lastModifierUserName?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfAirPortDto {
    skipCount?: number;
    maxResultCount?: number;
    items: AirPortDto[];
    totalCount: number;
  }

  /** 分页查询参数，与业务端一致 */
  export type GetPagedListParams = AirPortApi.GetPagedListParams;
}

const API_PREFIX = '/services/app/AirPortAdmin';

/**
 * 获取空运港口分页列表
 */
export const getAirPortAdminPagedList = (
  params: AirPortAdminApi.GetPagedListParams,
) => {
  return requestClient.get<AirPortAdminApi.PagedListOfAirPortDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取空运港口详情
 * @param id 机场 ID，建议传 string 避免大数精度丢失
 */
export const getAirPortDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<AirPortAdminApi.AirPortDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增空运港口
 */
export const addAirPort = (data: AirPortAdminApi.AirPortAddDto) => {
  return requestClient.post<number | string>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑空运港口（全量提交，非必填字段传 null 即清空原值）
 */
export const editAirPort = (data: AirPortAdminApi.AirPortEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除空运港口（软删除，一次只删一条）
 * @param id 机场 ID，大数以 string 透传避免精度丢失
 */
export const deleteAirPort = (id: number | string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
