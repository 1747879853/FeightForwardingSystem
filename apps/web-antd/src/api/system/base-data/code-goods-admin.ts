import { requestClient } from '#/api/request';

export namespace CodeGoodsAdminApi {
  /**
   * 货物类型（与业务单 CargoType 一致：S/R/D/O 对应 0/1/2/3）
   * 文档枚举名：S=普通货、R=冻柜、D=危险品、O=超限箱
   */
  export type CargoType = 0 | 1 | 2 | 3;

  /** 规格/型号新建明细 */
  export interface CodeGoodsSpecAddDto {
    /** 名称，必填，最长 128；同品名下不重名（大小写不敏感） */
    name: string;
    /** 不传则按数组下标生成 */
    sortId?: null | number;
    remark?: null | string;
  }

  export type CodeGoodsModelAddDto = CodeGoodsSpecAddDto;

  /** 规格/型号编辑明细：有 id=改，无 id/null=增；未提交的旧行会被删 */
  export interface CodeGoodsSpecEditDto {
    id?: null | string;
    name: string;
    sortId?: null | number;
    remark?: null | string;
  }

  export type CodeGoodsModelEditDto = CodeGoodsSpecEditDto;

  /** 新增商品信息参数 */
  export interface CodeGoodsAddDto {
    code?: string;
    name?: string;
    /** 货物类型，必填 */
    cargoId?: CargoType;
    goodNo?: string;
    enName?: string;
    description?: string;
    hsCode?: string;
    ruleUnit?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    /** 规格明细；不传或 [] 表示无规格 */
    codeGoodsSpecs?: CodeGoodsSpecAddDto[];
    /** 型号明细；不传或 [] 表示无型号 */
    codeGoodsModels?: CodeGoodsModelAddDto[];
  }

  /** 编辑商品信息参数（子表全量提交） */
  export interface CodeGoodsEditDto {
    id: number | string;
    code?: string;
    name?: string;
    cargoId?: CargoType;
    goodNo?: string;
    enName?: string;
    description?: string;
    hsCode?: string;
    ruleUnit?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    /** 全量提交；不传或 [] 表示清空该品名下所有规格 */
    codeGoodsSpecs?: CodeGoodsSpecEditDto[];
    /** 全量提交；不传或 [] 表示清空该品名下所有型号 */
    codeGoodsModels?: CodeGoodsModelEditDto[];
  }

  /** 品名规格（列表/详情/海运进口下拉候选项，按 sortId 升序） */
  export interface CodeGoodsSpecSimpleDto {
    id: string;
    codeGoodsId?: number | string;
    name?: null | string;
    sortId?: number;
    remark?: null | string;
    creationTime?: string;
    creatorUserId?: null | number | string;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number | string;
  }

  /** 品名型号（列表/详情/海运进口下拉候选项，按 sortId 升序） */
  export interface CodeGoodsModelSimpleDto {
    id: string;
    codeGoodsId?: number | string;
    name?: null | string;
    sortId?: number;
    remark?: null | string;
    creationTime?: string;
    creatorUserId?: null | number | string;
    lastModificationTime?: null | string;
    lastModifierUserId?: null | number | string;
  }

  /** 商品信息详情 */
  export interface CodeGoodsDto {
    id: number | string;
    code?: string;
    name?: string;
    cargoId?: CargoType;
    goodNo?: string;
    enName?: string;
    description?: string;
    hsCode?: string;
    ruleUnit?: string;
    enable?: boolean;
    sortId?: number;
    remark?: string;
    creationTime?: string;
    creatorUserId?: null | number | string;
    lastModificationTime?: string;
    lastModifierUserId?: null | number | string;
    /** 规格子表；未配置时为 [] / null，已按 sortId 升序 */
    codeGoodsSpecs?: CodeGoodsSpecSimpleDto[] | null;
    /** 型号子表；未配置时为 [] / null，已按 sortId 升序 */
    codeGoodsModels?: CodeGoodsModelSimpleDto[] | null;
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
    CargoId?: CargoType;
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
 * @param id 建议传 string 避免大数精度丢失
 */
export const getCodeGoodsDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<CodeGoodsAdminApi.CodeGoodsDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
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
export const deleteCodeGoods = (id: number | string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
