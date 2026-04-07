import { requestClient } from '#/api/request';

export namespace ClientAdminApi {
  /** 新增客户参数 */
  export interface ClientAddDto {
    /** 客户简称 */
    name?: string;
    /** 客户代码 */
    code?: string;
    /** 公司电话 */
    phone?: string;
    /** 客户全称 */
    fullName?: string;
    /** 客户英文名 */
    enName?: string;
    /** 国家 */
    country?: string;
    /** 所在省市 */
    areaId?: string;
    /** 地址 */
    address?: string;
    /** 英文地址 */
    enAddress?: string;
    /** 主营产品 */
    mainProduct?: string;
    /** 是否有效 */
    enable?: boolean;
    /** 客户性质 0-直客 1-同行 2-供应商 */
    clientType?: number;
    /** 行业类别 */
    industryCategories?: string;
    /** 备注 */
    remark?: string;
  }

  /** 编辑客户参数 */
  export interface ClientEditDto {
    id: number | string;
    /** 客户简称 */
    name?: string;
    /** 客户代码 */
    code?: string;
    /** 公司电话 */
    phone?: string;
    /** 客户全称 */
    fullName?: string;
    /** 客户英文名 */
    enName?: string;
    /** 国家 */
    country?: string;
    /** 所在省市 */
    areaId?: string;
    /** 地址 */
    address?: string;
    /** 英文地址 */
    enAddress?: string;
    /** 主营产品 */
    mainProduct?: string;
    /** 是否有效 */
    enable?: boolean;
    /** 客户性质 0-直客 1-同行 2-供应商 */
    clientType?: number;
    /** 行业类别 */
    industryCategories?: string;
    /** 备注 */
    remark?: string;
  }

  /** 客户详情/列表输出 */
  export interface ClientDto {
    /** 客户简称 */
    name?: string;
    /** 客户代码 */
    code?: string;
    /** 公司电话 */
    phone?: string;
    /** 客户全称 */
    fullName?: string;
    /** 客户英文名 */
    enName?: string;
    /** 国家 */
    country?: string;
    /** 所在省市 */
    areaId?: string;
    /** 地址 */
    address?: string;
    /** 英文地址 */
    enAddress?: string;
    /** 主营产品 */
    mainProduct?: string;
    /** 是否有效 */
    enable?: boolean;
    /** 客户性质 0-直客 1-同行 2-供应商 */
    clientType?: number;
    /** 行业类别 */
    industryCategories?: string;
    /** 备注 */
    remark?: string;
    isDeleted?: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime?: string;
    creatorUserId?: number;
    id: number | string;
  }

  /** 分页列表响应 */
  export interface PagedListOfClientDto {
    skipCount?: number;
    maxResultCount?: number;
    items: ClientDto[];
    totalCount: number;
    currentPage?: number;
    totalPages?: number;
  }

  /** 分页查询参数 */
  export interface GetPagedListParams {
    /** 关键字 模糊匹配 */
    Keyword?: string;
    /** 行业类别 */
    IndustryCategory?: string;
    /** 排序 默认是Id */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }
}

const API_PREFIX = '/services/app/ClientAdmin';

/**
 * 获取客户分页列表
 */
export const getClientPagedList = (
  params: ClientAdminApi.GetPagedListParams,
) => {
  return requestClient.get<ClientAdminApi.PagedListOfClientDto>(
    `${API_PREFIX}/GetPagedListAsync`,
    { params },
  );
};

/**
 * 获取客户详情
 * @param id 建议传 string 避免大数精度丢失
 */
export const getClientDetail = (id: number | string) => {
  const idStr = id === undefined || id === null || id === '' ? '' : String(id);
  return requestClient.get<ClientAdminApi.ClientDto>(
    `${API_PREFIX}/DetailAsync`,
    { params: { Id: idStr } },
  );
};

/**
 * 新增客户
 */
export const addClient = (data: ClientAdminApi.ClientAddDto) => {
  return requestClient.post<number>(`${API_PREFIX}/AddAsync`, data);
};

/**
 * 编辑客户
 */
export const editClient = (data: ClientAdminApi.ClientEditDto) => {
  return requestClient.put<boolean>(`${API_PREFIX}/EditAsync`, data);
};

/**
 * 删除客户
 */
export const deleteClient = (id: number | string) => {
  return requestClient.delete<boolean>(`${API_PREFIX}/DeleteAsync`, {
    data: { id },
  });
};
