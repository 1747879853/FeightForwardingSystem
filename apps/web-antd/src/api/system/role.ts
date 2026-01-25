import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

export namespace SystemRoleApi {
  /** 角色列表项DTO */
  export interface RoleListDto {
    id: number;
    creationTime: string;
    creatorUserId?: number;
    /** 角色名称（编码） */
    name: string;
    /** 角色显示名称 */
    displayName: string;
    /** 是否默认角色 */
    isDefault: boolean;
    /** 是否不可删除 */
    isStatic: boolean;
  }

  /** 角色输入DTO */
  export interface RoleInputDto {
    id?: number;
    /** 角色名称（编码） */
    name: string;
    /** 角色显示名称 */
    displayName: string;
    /** 是否默认角色 */
    isDefault?: boolean;
    /** 描述 */
    description?: string;
  }

  /** 角色权限DTO */
  export interface RolePermissionDto {
    roleId: number;
    permissionNames: string[];
  }

  /** 分页列表响应 */
  export interface PagingListOfRoleListDto {
    /** 数据集合 */
    items: RoleListDto[];
    /** 当前页码 */
    pageIndex: number;
    /** 每页显示记录数 */
    pageSize: number;
    /** 总记录数 */
    totalCount: number;
    /** 总页数 */
    totalPages: number;
  }

  /** 角色列表查询参数 */
  export interface RoleQueryParams {
    /** 名字关键字 */
    KeyWords?: string;
    /** 排序 默认是Id */
    Sorting?: string;
    /** 当前页码 */
    PageIndex?: number;
    /** 每页显示记录数 */
    PageSize?: number;
  }

  // 兼容旧代码的类型定义
  export interface SystemRole extends RoleListDto {
    [key: string]: any;
    permissions?: string[];
    description?: string;
  }
}

/**
 * 获取角色列表数据
 */
async function getRoleList(params: Recordable<any>) {
  const queryParams: SystemRoleApi.RoleQueryParams = {
    KeyWords: params.KeyWords || params.name || params.keyWords,
    PageIndex: params.page || params.pageIndex || 1,
    PageSize: params.pageSize || 10,
    Sorting: params.sorting || 'Id',
  };

  const response =
    await requestClient.get<SystemRoleApi.PagingListOfRoleListDto>(
      '/services/app/Role/GetRolePagingListAsync',
      { params: queryParams },
    );

  // 转换为列表格式返回
  return {
    items: response.items || [],
    total: response.totalCount || 0,
  };
}

/**
 * 创建或更新角色
 * @param data 角色数据
 */
async function createOrUpdateRole(data: SystemRoleApi.RoleInputDto) {
  return requestClient.post('/services/app/Role/CreateOrUpdateRoleAsync', data);
}

/**
 * 创建角色
 * @param data 角色数据
 */
async function createRole(data: Omit<SystemRoleApi.RoleInputDto, 'id'>) {
  return createOrUpdateRole(data);
}

/**
 * 更新角色
 * @param id 角色 ID
 * @param data 角色数据
 */
async function updateRole(
  id: number,
  data: Partial<SystemRoleApi.RoleInputDto>,
) {
  return createOrUpdateRole({ ...data, id } as SystemRoleApi.RoleInputDto);
}

/**
 * 删除角色
 * @param id 角色 ID
 */
async function deleteRole(id: number) {
  return requestClient.delete('/services/app/Role/DeleteRoleAsync', {
    params: { Id: id },
  });
}

/**
 * 更新角色权限
 * @param roleId 角色ID
 * @param permissionNames 权限名称数组
 */
async function updateRolePermissions(
  roleId: number,
  permissionNames: string[],
) {
  const data: SystemRoleApi.RolePermissionDto = {
    roleId,
    permissionNames,
  };
  return requestClient.put(
    '/services/app/Role/UpdateRolePermissionsAsync',
    data,
  );
}

/**
 * 获取单个角色用于后台编辑
 * @param id 角色ID
 */
async function getRoleForEdit(id: number) {
  return requestClient.get<SystemRoleApi.RoleInputDto>(
    '/services/app/Role/GetRoleForEditAsync',
    { params: { Id: id } },
  );
}

export {
  createOrUpdateRole,
  createRole,
  deleteRole,
  getRoleForEdit,
  getRoleList,
  updateRole,
  updateRolePermissions,
};
