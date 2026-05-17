import { requestClient } from '#/api/request';

export namespace CarrierAdminApi {
  export interface AttachmentItemForItemInputDto {
    attachmentId: number;
    displayOrder?: number;
  }

  export interface AttachmentItemDto {
    id: number;
    attachmentId: number;
    itemId?: string;
    moduleTypeId?: string;
    isFirstShow?: boolean;
    displayOrder?: number;
    url?: string;
    mediaType?: number;
    friendlyFileName?: string;
    fileLength?: null | number;
    creationTime?: null | string;
    creatorUserId?: null | number;
    creatorUserNickName?: null | string;
  }

  /** 新增船公司参数 */
  export interface CarrierAddDto {
    cnName?: string;
    cnShortName?: string;
    enName?: string;
    code?: string;
    otherCode?: string;
    ediCode?: string;
    remark?: string;
    logo?: AttachmentItemForItemInputDto | null;
  }

  /** 编辑船公司参数 */
  export interface CarrierEditDto {
    id: number;
    cnName?: string;
    cnShortName?: string;
    enName?: string;
    code?: string;
    otherCode?: string;
    ediCode?: string;
    remark?: string;
    logo?: AttachmentItemForItemInputDto | null;
  }

  /** 船公司详情 */
  export interface CarrierDto {
    id: number;
    cnName?: string;
    cnShortName?: string;
    enName?: string;
    code?: string;
    otherCode?: string;
    ediCode?: string;
    remark?: string;
    logo?: null | AttachmentItemDto;
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
 * @param id 建议传 string 避免大数精度丢失
 */
export const getCarrierDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<CarrierAdminApi.CarrierDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { id: idStr } },
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
