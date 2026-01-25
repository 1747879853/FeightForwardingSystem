import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';
export enum UserStatus {
  /** 禁用 */
  Unpassed = 10,
  /** 待审核 */
  Pending = 20,
  /** 正常 */
  Passed = 40,
}

export namespace SystemUserAdminApi {
  /** 用户状态 */
  export type UserStatus = typeof UserStatus;

  /** 用户列表项DTO */
  export interface UserListDto {
    id: number;
    userName: string;
    nickName?: string;
    emailAddress?: string;
    phoneNumber?: string;
    isActive: boolean;

    isPhoneNumberConfirmed: boolean;
    status: UserStatus;
    avatar?: string;
    creationTime: string;
    lastLoginTime?: string;
    roles?: string[];
  }

  /** 分页列表响应 */
  export interface PagingListOfUserListDto {
    items: UserListDto[];
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }

  /** 用户查询参数 */
  export interface UserQueryParams {
    KeyWords?: string;
    IsActive?: boolean;

    IsPhoneNumberConfirmed?: boolean;
    Status?: UserStatus;
    RoleId?: number;
    CreationTimeStart?: string;
    CreationTimeEnd?: string;
    LastLoginTimeStart?: string;
    LastLoginTimeEnd?: string;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }

  /** 用户详情DTO（用于编辑） */
  export interface UserDto {
    id: number;
    userName: string;
    nickName?: string;
    emailAddress?: string;
    phoneNumber?: string;
    isActive: boolean;

    isPhoneNumberConfirmed: boolean;
    status: UserStatus;
    avatar?: string;
    creationTime: string;
    lastLoginTime?: string;
    roleIds?: number[];
    roles?: string[];
  }

  /** 用户编辑数据DTO（含数据权限） */
  export interface UserInAdminDataPermissionDto extends UserDto {
    grantedOrganizationIds?: number[];
  }

  /** 用户输入DTO */
  export interface UserInAdminInputDto {
    id?: number;
    userName: string;
    nickName?: string;
    emailAddress?: string;
    phoneNumber?: string;
    isActive?: boolean;
    status?: UserStatus;
    password?: string;
    avatar?: string;
    roleIds?: number[];
  }

  /** 用户输入DTO（含数据权限） */
  export interface UserInAdminDataPermissionInputDto extends UserInAdminInputDto {
    grantedOrganizationIds?: number[];
  }

  /** 用户角色分配DTO */
  export interface UserRolesDto {
    userId: number;
    roleNames: string[];
  }

  /** 用户权限DTO */
  export interface UserPermissionDto {
    userId: number;
    permissionNames: string[];
  }

  /** 修改密码DTO */
  export interface PasswordInputDto {
    /** 用户ID */
    id: number;
    /** 密码 */
    password: string;
    /** 确认密码 */
    confirmPassword?: string;
    /** 下次登录是否需要修改密码 */
    shouldChangePasswordOnNextLogin?: boolean;
  }

  /** Identity 结果 */
  export interface IdentityResult {
    succeeded: boolean;
    errors?: Array<{ code: string; description: string }>;
  }

  // 兼容旧代码的类型定义
  export interface SystemUser extends UserListDto {
    [key: string]: any;
  }
}

/**
 * 获取用户分页列表
 */
async function getUserPagedList(params: Recordable<any>) {
  const queryParams: SystemUserAdminApi.UserQueryParams = {
    KeyWords: params.KeyWords || params.keyWords,
    IsActive: params.IsActive ?? params.isActive,

    IsPhoneNumberConfirmed:
      params.IsPhoneNumberConfirmed ?? params.isPhoneNumberConfirmed,
    Status: params.Status ?? params.status,
    RoleId: params.RoleId ?? params.roleId,
    CreationTimeStart: params.CreationTimeStart ?? params.creationTimeStart,
    CreationTimeEnd: params.CreationTimeEnd ?? params.creationTimeEnd,
    LastLoginTimeStart: params.LastLoginTimeStart ?? params.lastLoginTimeStart,
    LastLoginTimeEnd: params.LastLoginTimeEnd ?? params.lastLoginTimeEnd,
    Sorting: params.Sorting ?? params.sorting ?? 'Id',
    PageIndex: params.page || params.pageIndex || params.PageIndex || 1,
    PageSize: params.pageSize || params.PageSize || 10,
  };

  // 过滤掉 undefined 值
  const filteredParams = Object.fromEntries(
    Object.entries(queryParams).filter(([_, v]) => v !== undefined),
  );

  const response =
    await requestClient.get<SystemUserAdminApi.PagingListOfUserListDto>(
      '/services/app/UserAdmin/GetUserPagedListAsync',
      { params: filteredParams },
    );

  return {
    items: response.items || [],
    total: response.totalCount || 0,
  };
}

/**
 * 获取单个用户
 */
async function getUser(id: number) {
  return requestClient.get<SystemUserAdminApi.UserDto>(
    '/services/app/UserAdmin/GetUserAsync',
    { params: { Id: id } },
  );
}

/**
 * 获取用户详情用于后台编辑
 */
async function getUserForEdit(id: number) {
  return requestClient.get<SystemUserAdminApi.UserInAdminDataPermissionDto>(
    '/services/app/UserAdmin/GetUserForEditAsync',
    { params: { Id: id } },
  );
}

/**
 * 创建或更新用户（基础字段）
 */
async function createOrUpdateUser(
  data: SystemUserAdminApi.UserInAdminInputDto,
) {
  return requestClient.post(
    '/services/app/UserAdmin/CreateOrUpdateUserAsync',
    data,
  );
}

/**
 * 创建或更新用户（含数据权限）
 */
async function createOrUpdateUserWithDataPermission(
  data: SystemUserAdminApi.UserInAdminDataPermissionInputDto,
) {
  return requestClient.post(
    '/services/app/UserAdmin/CreateOrUpdateUserInAdminAsync',
    data,
  );
}

/**
 * 删除用户（支持批量）
 * @param ids 用户ID数组
 * @param toId 可选，将数据转移到目标用户
 */
async function deleteUser(ids: number, toId?: number) {
  return requestClient.delete('/services/app/UserAdmin/DeleteUsersAsync', {
    params: { Id: ids, ToId: toId },
  });
}

/**
 * 获取用户的角色名称列表
 */
async function getUserRolesName(userId: number): Promise<string[]> {
  return requestClient.get('/services/app/UserAdmin/GetRolesNameAsync', {
    params: { Id: userId },
  });
}

/**
 * 分配角色
 */
async function setUserRoles(
  data: SystemUserAdminApi.UserRolesDto,
): Promise<SystemUserAdminApi.IdentityResult> {
  return requestClient.post('/services/app/UserAdmin/SetRolesAsync', data);
}

/**
 * 获取用户权限
 */
async function getUserPermissions(userId: number): Promise<string[]> {
  return requestClient.get('/services/app/UserAdmin/GetUserPermissionsAsync', {
    params: { Id: userId },
  });
}

/**
 * 更新用户权限
 */
async function updateUserPermissions(
  data: SystemUserAdminApi.UserPermissionDto,
) {
  return requestClient.put(
    '/services/app/UserAdmin/UpdateUserPermissionsAsync',
    data,
  );
}

/**
 * 重置用户所有权限
 */
async function resetUserAllPermissions(userId: number) {
  return requestClient.post(
    '/services/app/UserAdmin/ResetAllPermissionsAsync',
    { id: userId },
  );
}

/**
 * 管理员修改密码
 * @param data 密码数据
 * @param unlock 是否同时解锁用户
 */
async function changePassword(
  data: SystemUserAdminApi.PasswordInputDto,
  unlock = false,
) {
  const url = unlock
    ? '/services/app/UserAdmin/ChangePasswordAndUnlockAsync'
    : '/services/app/UserAdmin/ChangePasswordAsync';
  return requestClient.post(url, data);
}

/**
 * 导入用户
 * @param formData 包含文件的FormData
 */
async function importUsers(formData: FormData) {
  return requestClient.post(
    '/services/app/UserAdmin/ImportUsersAsync',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
}

export {
  changePassword,
  createOrUpdateUser,
  createOrUpdateUserWithDataPermission,
  deleteUser,
  getUser,
  getUserForEdit,
  getUserPagedList,
  getUserPermissions,
  getUserRolesName,
  importUsers,
  resetUserAllPermissions,
  setUserRoles,
  updateUserPermissions,
};
