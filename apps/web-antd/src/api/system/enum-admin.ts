import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace EnumerationAdminApi {
  /** 枚举值新建输入 */
  export interface EnumerationItemAddDto {
    /** 枚举值 */
    value: number;
    /** 是否启用 */
    enable: boolean;
    /** 枚举值的展示文本 */
    displayName?: string;
    /** 描述 */
    description?: string;
    /** 备注 */
    remark?: string;
  }

  /** 枚举值编辑输入 */
  export interface EnumerationItemEditDto {
    /** 主键Id（为空表示新增，有值表示修改） */
    id?: string;
    /** 枚举值 */
    value: number;
    /** 是否启用 */
    enable: boolean;
    /** 枚举值的展示文本 */
    displayName?: string;
    /** 描述 */
    description?: string;
    /** 备注 */
    remark?: string;
  }

  /** 枚举新建输入 */
  export interface EnumerationAddDto {
    /** 枚举名称-英文-唯一校验 */
    name?: string;
    /** 描述 */
    description?: string;
    /** 备注 */
    remark?: string;
    /** 枚举值子表列表 */
    enumerationItems?: EnumerationItemAddDto[];
  }

  /** 枚举编辑输入 */
  export interface EnumerationEditDto {
    /** 主键Id */
    id: string;
    /** 枚举名称-英文-唯一校验 */
    name?: string;
    /** 描述 */
    description?: string;
    /** 备注 */
    remark?: string;
    /** 枚举值子表列表（Id为空或Guid.Empty表示新增，有值表示修改，数据库中存在但列表中不包含的会被删除） */
    enumerationItems?: EnumerationItemEditDto[];
  }

  /** 枚举列表输出（不含子表） */
  export interface EnumerationListDto {
    /** 枚举名称-英文 */
    name?: string;
    /** 描述 */
    description?: string;
    /** 备注 */
    remark?: string;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: string;
  }

  /** 枚举值输出 */
  export interface EnumerationItemDto {
    /** 枚举主表Id */
    enumerationId: string;
    /** 枚举值 */
    value: number;
    /** 是否启用 */
    enable: boolean;
    /** 枚举值的展示文本 */
    displayName?: string;
    /** 描述 */
    description?: string;
    /** 备注 */
    remark?: string;
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: string;
  }

  /** 枚举详情输出（含子表） */
  export interface EnumerationDetailDto {
    /** 枚举名称-英文 */
    name?: string;
    /** 描述 */
    description?: string;
    /** 备注 */
    remark?: string;
    /** 枚举值子表列表 */
    enumerationItems?: EnumerationItemDto[];
    isDeleted: boolean;
    deleterUserId?: number;
    deletionTime?: string;
    lastModificationTime?: string;
    lastModifierUserId?: number;
    creationTime: string;
    creatorUserId?: number;
    id: string;
  }

  /** 分页数据封装 */
  export interface PagedListOfEnumerationListDto {
    /** 跳过的数量 */
    skipCount: number;
    /** 返回的最大数据量 */
    maxResultCount: number;
    /** 分好页的数据集合 */
    items?: EnumerationListDto[];
    /** 总记录数 */
    totalCount: number;
    /** 当前页 */
    readonly currentPage: number;
    /** 总页数 */
    readonly totalPages: number;
  }

  /** 枚举列表查询参数 */
  export interface EnumerationQueryParams {
    /** 关键字 模糊匹配 */
    Keyword?: string;
    /** 排序 默认是Id */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }

  /** GUID ID DTO */
  export interface GuidIdDto {
    id: string;
  }
}

/**
 * 获取枚举列表（不含子表）
 */
async function getEnumerationPagedList(params: Recordable<any>) {
  const queryParams: EnumerationAdminApi.EnumerationQueryParams = {
    Keyword: params.Keyword || params.keyword,
    PageIndex: params.page || params.pageIndex || 1,
    PageSize: params.pageSize || 10,
    Sorting: params.sorting || 'Id desc',
  };

  return requestClient.get<EnumerationAdminApi.PagedListOfEnumerationListDto>(
    '/services/app/EnumerationAdmin/GetPagedListAsync',
    { params: queryParams },
  );
}

/**
 * 获取枚举详情（含子表）
 * @param id 枚举ID
 */
async function getEnumerationDetail(id: string) {
  return requestClient.get<EnumerationAdminApi.EnumerationDetailDto>(
    '/services/app/EnumerationAdmin/DetailAsync',
    { params: { Id: id } },
  );
}

/**
 * 新增枚举
 * @param data 枚举数据
 */
async function addEnumeration(data: EnumerationAdminApi.EnumerationAddDto) {
  return requestClient.post<string>(
    '/services/app/EnumerationAdmin/AddAsync',
    data,
  );
}

/**
 * 编辑枚举
 * @param data 枚举数据
 */
async function editEnumeration(data: EnumerationAdminApi.EnumerationEditDto) {
  return requestClient.put<boolean>(
    '/services/app/EnumerationAdmin/EditAsync',
    data,
  );
}

/**
 * 删除枚举
 * @param id 枚举ID
 */
async function deleteEnumeration(id: string) {
  return requestClient.delete<boolean>(
    '/services/app/EnumerationAdmin/DeleteAsync',
    {
      data: { ids: [id] },
    },
  );
}

/**
 * 根据枚举名称获取所有枚举值列表（不分页，带缓存）
 * @param name 枚举名称
 */
async function getItemsByName(name: string) {
  return requestClient.get<EnumerationAdminApi.EnumerationItemDto[]>(
    '/services/app/EnumerationAdmin/GetItemsByNameAsync',
    { params: { name } },
  );
}

export {
  addEnumeration,
  deleteEnumeration,
  editEnumeration,
  getEnumerationDetail,
  getEnumerationPagedList,
  getItemsByName,
};
