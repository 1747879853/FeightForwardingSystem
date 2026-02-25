import { requestClient } from '#/api/request';

/** 出入类型枚举 */
export enum InOutType {
  /** 出 */
  Out = 0,
  /** 入 */
  In = 1,
}

/** 币别枚举 */
export enum CurrencyEnum {
  /** 人民币 */
  RMB = 1,
  /** 美元 */
  USD = 2,
}

export namespace FeeNameAdminApi {
  /** 新增费用参数 */
  export interface FeeNameAddDto {
    code?: string;
    name?: string;
    enName?: string;
    inOutType?: InOutType;
    defaultCurrency?: CurrencyEnum;
    feeTypeStr?: string;
    remark?: string;
  }

  /** 编辑费用参数 */
  export interface FeeNameEditDto {
    id: number;
    code?: string;
    name?: string;
    enName?: string;
    inOutType?: InOutType;
    defaultCurrency?: CurrencyEnum;
    feeTypeStr?: string;
    remark?: string;
  }

  /** 费用详情 */
  export interface FeeNameDto {
    id: number;
    code?: string;
    name?: string;
    enName?: string;
    inOutType?: InOutType;
    defaultCurrency?: CurrencyEnum;
    feeTypeStr?: string;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfFeeNameDto {
    items: FeeNameDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    Keyword?: string;
    Ids?: number[];
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/FeeNameAdmin';

/**
 * 获取费用分页列表
 */
export const getFeeNamePagedList = (
  params: FeeNameAdminApi.GetPagedListParams,
) => {
  return requestClient.get<FeeNameAdminApi.PagedListOfFeeNameDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取费用详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getFeeNameDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<FeeNameAdminApi.FeeNameDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增费用
 */
export const addFeeName = (data: FeeNameAdminApi.FeeNameAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑费用
 */
export const editFeeName = (data: FeeNameAdminApi.FeeNameEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除费用
 */
export const deleteFeeName = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
