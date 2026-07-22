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

/** 用户属性（位标志枚举） */
export enum UserAttribute {
  None = 0,
  Operation = 1,
  CustomerService = 2,
  Documentation = 4,
  Business = 8,
  Sales = 16,
  Finance = 32,
  OverseasCustomerService = 64,
  HR = 128,
}

// ==================== 用户管理 API (UserAdminAppService) ====================

export namespace SystemUserAdminApi {
  /** 用户状态 */
  export type UserStatus = typeof UserStatus;

  /** 用户属性 */
  export type UserAttributeType = typeof UserAttribute;

  /** 分页列表响应结构 */
  export interface PagedList<T> {
    items: T[];
    totalCount: number;
    currentPage: number;
    totalPages: number;
  }

  /** 简易用户DTO（用于下拉选人、列表展示） */
  export interface UserSimpleDto {
    id: number;
    nickName: string;
    enName?: string;
    employeeID?: string;
    avatar?: string;
    organization?: string;
  }

  /** 用户角色DTO */
  export interface UserRoleDto {
    roleId: number;
    roleName: string;
    roleDisplayName: string;
  }

  /** 用户资料DTO */
  export interface UserProfileDto {
    userId: number;
    trueName?: string;
    nickName?: string;
    phoneNumber?: string;
    gender?: number;
    birthday?: string;
    address?: string;
    description?: string;
    avatar?: string;
    emailAddress?: string;
    wechat?: string;
  }

  /** 公司银行账户打印DTO */
  export interface CompanyBankAccountPrintDto {
    currencyCode: string;
    accountName: string;
    bankShortName: string;
    bankName: string;
    bankAccount: string;
  }

  /** 用户打印信息DTO */
  export interface UserPrintDto {
    nickName?: string;
    enName?: string;
    emailAddress?: string;
    phoneNumber?: string;
    companyDisplayName?: string;
    companyShortName?: string;
    companyEnName?: string;
    companyAddress?: string;
    companyContactPhone?: string;
    companyEmail?: string;
    unifiedSocialCreditCode?: string;
    logo?: string;
    defaultBanks?: CompanyBankAccountPrintDto[];
  }

  /** 密码复杂度设置 */
  export interface PasswordComplexitySetting {
    requiredLength: number;
    requireDigit: boolean;
    requireLowercase: boolean;
    requireUppercase: boolean;
    requireNonAlphanumeric: boolean;
  }

  /** 修改密码输入DTO */
  export interface MyPasswordInputDto {
    password: string;
    confirmPassword: string;
  }

  /** 用户简易分页查询参数 */
  export interface UserSimplePagedQueryDto {
    keyWords?: string;
    userAttribute?: number;
    pageIndex?: number;
    pageSize?: number;
    sorting?: string;
  }

  /** 用户所属组织机构路径项 */
  export interface UserOrganizationPathItemDto {
    id: number;
    name: string;
    isCompany: boolean;
    localCurrencyId?: number | null; // 本位币id（新增）
  }

  /** 用户所属组织路径DTO */
  export interface UserOrganizationPathDto {
    default: boolean; // 是否默认组织
    oneOrganizationPath: UserOrganizationPathItemDto[]; // 单条组织链，从顶级组织到当前组织
  }

  /** 更新用户组织路径DTO（用于创建/更新） */
  export interface UpdateUserOrganizationPathDto {
    id: number; // 组织id（须存在且启用）
    default?: boolean; // 是否设为默认组织（最多一条为 true）
  }

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
    userAttribute?: UserAttribute;
    /** 所属部门名称（用户直接挂载的组织名称） */
    organization?: string;
    /** 用户全部所属组织路径（一个用户可属多个组织，每条为一条从顶到底的组织链）；用户未挂组织时为空数组 */
    organizations?: UserOrganizationPathDto[];
    creationTime: string;
    lastLoginTime?: string;
    roles?: string[];
    enName?: string;
    qq?: string;
    employeeID?: string;
    gender?: number | null;
    enable?: boolean;
    idNumber?: string;
    remark?: string;
    emailPwd?: string;
    receiveAddrPort?: string;
    sendAddrPort?: string;
    officeTel?: string;
    senderDisplayName?: string;
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
    keyWords?: string; // 关键字(匹配邮箱、用户名、昵称、手机号)
    KeyWords?: string; // 兼容旧代码
    isActive?: boolean; // 是否已激活
    IsActive?: boolean; // 兼容旧代码
    isEmailConfirmed?: boolean; // 邮箱是否验证
    IsEmailConfirmed?: boolean; // 兼容旧代码
    isPhoneNumberConfirmed?: boolean; // 手机是否验证
    IsPhoneNumberConfirmed?: boolean; // 兼容旧代码
    status?: UserStatus; // 审核状态
    Status?: UserStatus; // 兼容旧代码
    roleId?: number; // 角色Id
    RoleId?: number; // 兼容旧代码
    userAttribute?: UserAttribute; // 用户属性(位掩码，精确匹配)
    creationTimeStart?: string; // 创建时间起
    CreationTimeStart?: string; // 兼容旧代码
    creationTimeEnd?: string; // 创建时间止
    CreationTimeEnd?: string; // 兼容旧代码
    lastLoginTimeStart?: string; // 最后登录时间起
    LastLoginTimeStart?: string; // 兼容旧代码
    lastLoginTimeEnd?: string; // 最后登录时间止
    LastLoginTimeEnd?: string; // 兼容旧代码
    pageIndex?: number; // 当前页码，默认1
    PageIndex?: number; // 兼容旧代码
    page?: number; // 兼容旧代码
    pageSize?: number; // 每页条数，默认10
    PageSize?: number; // 兼容旧代码
    sorting?: string; // 排序字段，默认 "Id DESC"
    Sorting?: string; // 兼容旧代码
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
    userAttribute?: UserAttribute;
    creationTime: string;
    lastLoginTime?: string;
    roleIds?: number[];
    roles?: string[];
    enName?: string;
    qq?: string;
    employeeID?: string;
    gender?: number | null;
    enable?: boolean;
    idNumber?: string;
    remark?: string;
    emailPwd?: string;
    receiveAddrPort?: string;
    sendAddrPort?: string;
    officeTel?: string;
    senderDisplayName?: string;
    userBankAccounts?: UserBankAccountDto[];
    /** 下次登录是否需要改密码 */
    shouldChangePasswordOnNextLogin?: boolean;
    /** 用户全部所属组织路径，默认组织 default=true（替代原 organizationId/organizationName） */
    organizations?: UserOrganizationPathDto[];
  }

  /** 用户编辑数据DTO（含数据权限） */
  export interface UserInAdminDataPermissionDto extends UserDto {
    grantedOrganizationIds?: number[]; // 数据权限(可查看的部门Id列表)
    dataPermissionType?: number; // 数据权限类型
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
    /** 用户所属组织列表（替代原 organizationId/organizationName），据此重建多组织关系并设默认组织 */
    organizations?: UpdateUserOrganizationPathDto[];
    userAttribute?: UserAttribute;
    enName?: string;
    qq?: string;
    employeeID?: string;
    gender?: number | null;
    enable?: boolean;
    idNumber?: string;
    remark?: string;
    emailPwd?: string;
    receiveAddrPort?: string;
    sendAddrPort?: string;
    officeTel?: string;
    senderDisplayName?: string;
    /** 下次登录是否需要改密码 */
    shouldChangePasswordOnNextLogin?: boolean;
  }

  /** 用户输入DTO（含数据权限） */
  export interface UserInAdminDataPermissionInputDto extends UserInAdminInputDto {
    grantedOrganizationIds?: number[]; // 数据权限(可查看的部门Id列表)
    dataPermissionType?: number; // 数据权限类型
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

  /** 用户银行账户DTO */
  export interface UserBankAccountDto {
    id: number;
    userId: number;
    currencyId: number;
    currencyCode?: string;
    accountName?: string;
    bankShortName: string;
    bankName: string;
    bankAddress?: string;
    bankAccount: string;
  }

  /** 创建用户银行账户输入DTO */
  export interface CreateUserBankAccountInputDto {
    userId: number;
    currencyId: number;
    accountName?: string;
    bankShortName: string;
    bankName: string;
    bankAddress?: string;
    bankAccount: string;
  }

  /** 更新用户银行账户输入DTO */
  export interface UpdateUserBankAccountInputDto extends CreateUserBankAccountInputDto {
    id: number;
  }

  // 兼容旧代码的类型定义
  export interface SystemUser extends UserListDto {
    [key: string]: any;
  }
}

/**
 * 获取用户分页列表
 */
async function getUserPagedList(
  params: SystemUserAdminApi.UserQueryParams,
): Promise<
  Pick<SystemUserAdminApi.PagingListOfUserListDto, 'items' | 'totalCount'>
> {
  const queryParams: SystemUserAdminApi.UserQueryParams = {
    KeyWords: params.KeyWords || params.keyWords,
    IsActive: params.IsActive ?? params.isActive,

    userAttribute: params.userAttribute,
    IsPhoneNumberConfirmed:
      params.IsPhoneNumberConfirmed ?? params.isPhoneNumberConfirmed,
    Status: params.Status ?? params.status,
    RoleId: params.RoleId ?? params.roleId,
    CreationTimeStart: params.CreationTimeStart ?? params.creationTimeStart,
    CreationTimeEnd: params.CreationTimeEnd ?? params.creationTimeEnd,
    LastLoginTimeStart: params.LastLoginTimeStart ?? params.lastLoginTimeStart,
    LastLoginTimeEnd: params.LastLoginTimeEnd ?? params.lastLoginTimeEnd,
    Sorting: params.Sorting ?? params.sorting ?? 'Id desc',
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
    totalCount: response.totalCount || 0,
  };
}

type GetUserOptions = {
  /** 为 true 时不弹出全局错误提示（用户不存在等场景） */
  silent?: boolean;
};

/**
 * 获取单个用户
 */
async function getUser(
  id: number,
  options?: GetUserOptions,
): Promise<SystemUserAdminApi.UserDto> {
  return requestClient.get<SystemUserAdminApi.UserDto>(
    '/services/app/UserAdmin/GetUserAsync',
    {
      params: { Id: id },
      ...(options?.silent ? { skipErrorMessage: true } : {}),
    },
  );
}

/**
 * 获取用户详情用于后台编辑
 */
async function getUserForEdit(
  id: number,
): Promise<SystemUserAdminApi.UserInAdminDataPermissionDto> {
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
): Promise<SystemUserAdminApi.UserDto> {
  return requestClient.post<SystemUserAdminApi.UserDto>(
    '/services/app/UserAdmin/CreateOrUpdateUserAsync',
    data,
  );
}

/**
 * 创建或更新用户（含数据权限）
 */
async function createOrUpdateUserWithDataPermission(
  data: SystemUserAdminApi.UserInAdminDataPermissionInputDto,
): Promise<SystemUserAdminApi.UserInAdminDataPermissionDto> {
  return requestClient.post<SystemUserAdminApi.UserInAdminDataPermissionDto>(
    '/services/app/UserAdmin/CreateOrUpdateUserInAdminAsync',
    data,
  );
}

/**
 * 删除用户（支持批量）
 * @param ids 用户ID数组
 * @param toId 可选，将数据转移到目标用户
 */
async function deleteUser(ids: number, toId?: number): Promise<void> {
  return requestClient.delete('/services/app/UserAdmin/DeleteUsersAsync', {
    params: { Id: ids, ToId: toId },
  });
}

/**
 * 获取用户的角色名称列表
 */
async function getUserRolesName(userId: number): Promise<string[]> {
  return requestClient.get<string[]>(
    '/services/app/UserAdmin/GetRolesNameAsync',
    {
      params: { Id: userId },
    },
  );
}

/**
 * 分配角色
 */
async function setUserRoles(
  data: SystemUserAdminApi.UserRolesDto,
): Promise<SystemUserAdminApi.IdentityResult> {
  return requestClient.post<SystemUserAdminApi.IdentityResult>(
    '/services/app/UserAdmin/SetRolesAsync',
    data,
  );
}

/**
 * 获取用户权限
 */
async function getUserPermissions(userId: number): Promise<string[]> {
  return requestClient.get<string[]>(
    '/services/app/UserAdmin/GetUserPermissionsAsync',
    {
      params: { Id: userId },
    },
  );
}

/**
 * 更新用户权限
 */
async function updateUserPermissions(
  data: SystemUserAdminApi.UserPermissionDto,
): Promise<void> {
  return requestClient.put(
    '/services/app/UserAdmin/UpdateUserPermissionsAsync',
    data,
  );
}

/**
 * 重置用户所有权限
 */
async function resetUserAllPermissions(userId: number): Promise<void> {
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
): Promise<SystemUserAdminApi.IdentityResult> {
  const url = unlock
    ? '/services/app/UserAdmin/ChangePasswordAndUnlockAsync'
    : '/services/app/UserAdmin/ChangePasswordAsync';
  return requestClient.post<SystemUserAdminApi.IdentityResult>(url, data);
}

/**
 * 导入用户
 * @param formData 包含文件的FormData
 */
async function importUsers(
  formData: FormData,
): Promise<SystemUserAdminApi.IdentityResult> {
  return requestClient.post<SystemUserAdminApi.IdentityResult>(
    '/services/app/UserAdmin/ImportUsersAsync',
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
    },
  );
}

/**
 * 获取用户银行账户列表
 */
async function getUserBankAccountList(
  userId: number,
): Promise<SystemUserAdminApi.UserBankAccountDto[]> {
  return requestClient.get<SystemUserAdminApi.UserBankAccountDto[]>(
    '/services/app/UserAdmin/GetUserBankAccountListAsync',
    { params: { Id: userId } },
  );
}

/**
 * 获取单个银行账户
 */
async function getUserBankAccount(
  id: number,
): Promise<SystemUserAdminApi.UserBankAccountDto> {
  return requestClient.get<SystemUserAdminApi.UserBankAccountDto>(
    '/services/app/UserAdmin/GetUserBankAccountAsync',
    {
      params: { Id: id },
    },
  );
}

/**
 * 创建用户银行账户
 */
async function createUserBankAccount(
  data: SystemUserAdminApi.CreateUserBankAccountInputDto,
): Promise<SystemUserAdminApi.UserBankAccountDto> {
  return requestClient.post<SystemUserAdminApi.UserBankAccountDto>(
    '/services/app/UserAdmin/CreateUserBankAccountAsync',
    data,
  );
}

/**
 * 更新用户银行账户
 */
async function updateUserBankAccount(
  data: SystemUserAdminApi.UpdateUserBankAccountInputDto,
): Promise<SystemUserAdminApi.UserBankAccountDto> {
  return requestClient.put<SystemUserAdminApi.UserBankAccountDto>(
    '/services/app/UserAdmin/UpdateUserBankAccountAsync',
    data,
  );
}

/**
 * 删除用户银行账户
 */
async function deleteUserBankAccount(id: number): Promise<void> {
  return requestClient.delete<void>(
    '/services/app/UserAdmin/DeleteUserBankAccountAsync',
    { params: { Id: id } },
  );
}

// ==================== 用户通用 API (UserAppService) 函数实现 ====================

/**
 * 获取用户简易分页列表
 * @description 仅需登录，返回精简字段，适合下拉搜索选人。仅返回审核已通过且已激活的用户
 * @param params 查询参数
 */
async function getUserSimplePagedList(
  params: SystemUserAdminApi.UserSimplePagedQueryDto,
): Promise<SystemUserAdminApi.PagedList<SystemUserAdminApi.UserSimpleDto>> {
  const queryParams: Recordable<any> = {
    keyWords: params.keyWords,
    userAttribute: params.userAttribute,
    pageIndex: params.pageIndex || 1,
    pageSize: params.pageSize || 10,
    sorting: params.sorting || 'CreationTime DESC',
  };

  // 过滤掉 undefined 值
  const filteredParams = Object.fromEntries(
    Object.entries(queryParams).filter(([_, v]) => v !== undefined),
  );

  return requestClient.get('/services/app/User/GetUserSimplePagedListAsync', {
    params: filteredParams,
  });
}

/**
 * 获取单个用户详细信息（通用接口）
 * @description 根据用户id获取完整用户信息，包含角色和用户资料
 * @param id 用户ID
 */
async function getUserById(id: number): Promise<SystemUserAdminApi.UserDto> {
  return requestClient.get<SystemUserAdminApi.UserDto>(
    '/services/app/User/GetUserAsync',
    {
      params: { id },
    },
  );
}

/**
 * 获取当前用户的打印信息
 * @description 获取当前登录用户的打印信息，包含个人联系方式及所属公司的打印要素
 */
async function getUserPrint(): Promise<SystemUserAdminApi.UserPrintDto> {
  return requestClient.get('/services/app/User/GetUserPrintAsync');
}

/**
 * 获取密码复杂度规则设置
 * @description 获取系统密码复杂度规则，用于注册或修改密码时的前端校验提示
 */
async function getPasswordComplexitySetting(): Promise<SystemUserAdminApi.PasswordComplexitySetting> {
  return requestClient.get('/services/app/User/GetPasswordComplexitySetting');
}

/**
 * 修改当前用户密码
 * @description 当前登录用户修改自己的登录密码
 * @param data 密码数据
 */
async function changeMyPassword(
  data: SystemUserAdminApi.MyPasswordInputDto,
): Promise<void> {
  return requestClient.post('/services/app/User/ChangeMyPasswordAsync', data);
}

export {
  changeMyPassword,
  changePassword,
  createOrUpdateUser,
  createOrUpdateUserWithDataPermission,
  createUserBankAccount,
  deleteUser,
  deleteUserBankAccount,
  getUser,
  getUserBankAccount,
  getUserBankAccountList,
  getUserById,
  getUserForEdit,
  getUserPagedList,
  getUserPermissions,
  getUserPrint,
  getUserRolesName,
  getUserSimplePagedList,
  getPasswordComplexitySetting,
  importUsers,
  resetUserAllPermissions,
  setUserRoles,
  updateUserBankAccount,
  updateUserPermissions,
};
