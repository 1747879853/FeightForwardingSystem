import { requestClient } from '#/api/request';

export namespace CarrierAdminApi {
  /** 新增船公司参数 */
  export interface CarrierAddDto {
    cnName?: string;
    cnShortName?: string;
    enName?: string;
    code?: string;
    otherCode?: string;
    countryId?: number;
    ediCode?: string;
    remark?: string;
  }

  /** 编辑船公司参数 */
  export interface CarrierEditDto {
    id: number;
    cnName?: string;
    cnShortName?: string;
    enName?: string;
    code?: string;
    otherCode?: string;
    countryId?: number;
    ediCode?: string;
    remark?: string;
  }

  /** 船公司详情 */
  export interface CarrierDto {
    id: number;
    cnName?: string;
    cnShortName?: string;
    enName?: string;
    code?: string;
    otherCode?: string;
    countryId?: number;
    ediCode?: string;
    remark?: string;
    country?: {
      id: number;
      cnName?: string;
      enName?: string;
      code?: string;
    };
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfCarrierDto {
    items: CarrierDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    Keyword?: string;
    CnName?: string;
    CnShortName?: string;
    EnName?: string;
    Code?: string;
    OtherCode?: string;
    CountryId?: number;
    EdiCode?: string;
    Remark?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/CarrierAdmin';

/**
 * 获取船公司分页列表
 */
export const getCarrierPagedList = (
  params: CarrierAdminApi.GetPagedListParams,
) => {
  return requestClient.get<CarrierAdminApi.PagedListOfCarrierDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取船公司详情
 */
export const getCarrierDetail = (id: number) => {
  return requestClient.get<CarrierAdminApi.CarrierDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

/**
 * 新增船公司
 */
export const addCarrier = (data: CarrierAdminApi.CarrierAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑船公司
 */
export const editCarrier = (data: CarrierAdminApi.CarrierEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除船公司
 */
export const deleteCarrier = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
