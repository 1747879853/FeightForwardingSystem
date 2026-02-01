import { requestClient } from '#/api/request';

export namespace CodeGoodsAdminApi {
  /** 新增商品信息参数 */
  export interface CodeGoodsAddDto {
    code?: string;
    name?: string;
    goodNo?: string;
    enName?: string;
    description?: string;
    hsCode?: string;
    ruleUnit?: string;
    ruleUnit1?: string;
    ruleUnit2?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 编辑商品信息参数 */
  export interface CodeGoodsEditDto {
    id: number;
    code?: string;
    name?: string;
    goodNo?: string;
    enName?: string;
    description?: string;
    hsCode?: string;
    ruleUnit?: string;
    ruleUnit1?: string;
    ruleUnit2?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
  }

  /** 商品信息详情 */
  export interface CodeGoodsDto {
    id: number;
    code?: string;
    name?: string;
    goodNo?: string;
    enName?: string;
    description?: string;
    hsCode?: string;
    ruleUnit?: string;
    ruleUnit1?: string;
    ruleUnit2?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    lastModificationTime?: string;
  }

  /** 分页列表响应 */
  export interface PagedListOfCodeGoodsDto {
    items: CodeGoodsDto[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    Keyword?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/CodeGoodsAdmin';

/**
 * 获取商品信息分页列表
 */
export const getCodeGoodsPagedList = (
  params: CodeGoodsAdminApi.GetPagedListParams,
) => {
  return requestClient.get<CodeGoodsAdminApi.PagedListOfCodeGoodsDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取商品信息详情
 */
export const getCodeGoodsDetail = (id: number) => {
  return requestClient.get<CodeGoodsAdminApi.CodeGoodsDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: id } },
  );
};

/**
 * 新增商品信息
 */
export const addCodeGoods = (data: CodeGoodsAdminApi.CodeGoodsAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑商品信息
 */
export const editCodeGoods = (data: CodeGoodsAdminApi.CodeGoodsEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除商品信息
 */
export const deleteCodeGoods = (id: number) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
