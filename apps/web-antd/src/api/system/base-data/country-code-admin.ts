import { requestClient } from '#/api/request';

export namespace CountryCodeAdminApi {
  /** 新增国家信息参数 */
  export interface CountryCodeAddDto {
    /** 国家唯一代码 */
    code?: string;
    /** 国家名称 */
    countryName?: string;
    /** 国家英文名称 */
    countryEnName?: string;
    /** 所在大洲 */
    chau?: string;
    /** 首都 */
    capital?: string;
    /** 关税等级 */
    tariff?: number;
    /** 吨位税 */
    tonnageTax?: number;
    /** 国家3字代码 */
    countryCode3?: string;
    /** 国家描述 */
    explain?: string;
    /** 备注 */
    remark?: string;
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

  /** 编辑国家信息参数 */
  export interface CountryCodeEditDto {
    id: number;
    /** 国家唯一代码 */
    code?: string;
    /** 国家名称 */
    countryName?: string;
    /** 国家英文名称 */
    countryEnName?: string;
    /** 所在大洲 */
    chau?: string;
    /** 首都 */
    capital?: string;
    /** 关税等级 */
    tariff?: number;
    /** 吨位税 */
    tonnageTax?: number;
    /** 国家3字代码 */
    countryCode3?: string;
    /** 国家描述 */
    explain?: string;
    /** 备注 */
    remark?: string;
    /** 状态 0启用 1禁用 */
    status?: number;
  }

  /** 国家信息详情/列表输出 */
  export interface CountryCodeDto {
    /** 国家唯一代码 */
    code?: string;
    /** 国家名称 */
    countryName?: string;
    /** 国家英文名称 */
    countryEnName?: string;
    /** 所在大洲 */
    chau?: string;
    /** 首都 */
    capital?: string;
    /** 关税等级 */
    tariff?: number;
    /** 吨位税 */
    tonnageTax?: number;
    /** 国家3字代码 */
    countryCode3?: string;
    /** 国家描述 */
    explain?: string;
    /** 备注 */
    remark?: string;
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
  export interface PagedListOfCountryCodeDto {
    skipCount?: number;
    maxResultCount?: number;
    items: CountryCodeDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    /** 关键字 模糊匹配 */
    Keyword?: string;
    /** 国家唯一代码 */
    Code?: string;
    /** 国家名称 */
    CountryName?: string;
    /** 国家英文名称 */
    CountryEnName?: string;
    /** 所在大洲 */
    Chau?: string;
    /** 首都 */
    Capital?: string;
    /** 关税等级 */
    Tariff?: number;
    /** 吨位税 */
    TonnageTax?: number;
    /** 国家3字代码 */
    CountryCode3?: string;
    /** 国家描述 */
    Explain?: string;
    /** 备注 */
    Remark?: string;
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

const API_PREFIX = '/services/app/CountryCodeAdmin';

/**
 * 获取国家信息分页列表
 */
export const getCountryCodePagedList = (
  params: CountryCodeAdminApi.GetPagedListParams,
) => {
  return requestClient.get<CountryCodeAdminApi.PagedListOfCountryCodeDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取国家信息详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getCountryCodeDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<CountryCodeAdminApi.CountryCodeDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增国家信息
 */
export const addCountryCode = (data: CountryCodeAdminApi.CountryCodeAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑国家信息
 */
export const editCountryCode = (
  data: CountryCodeAdminApi.CountryCodeEditDto,
) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除国家信息
 */
export const deleteCountryCode = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
