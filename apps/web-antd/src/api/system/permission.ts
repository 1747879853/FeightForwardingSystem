import type { Recordable } from '@vben/types';

import { requestClient } from '#/api/request';

// ==================== 枚举定义 ====================

/** 功能枚举 */
export enum ManageType {
  /** 查询 */
  Get = 0,
  /** 编辑 */
  Edit = 1,
}

/** 数据权限枚举 */
export enum DataPermissionType {
  /** 自己 */
  My = 0,
  /** 自己部门 */
  MyPart = 1,
  /** 自己公司 */
  MyCompany = 2,
  /** 多人 */
  ManyUser = 3,
  /** 部分(多部门/多公司) */
  ManyPart = 4,
  /** 全部 */
  All = 5,
}

/** 模块枚举 */
export enum FrightModule {
  /** 仓库管理 */
  WarehouseManagement = 0,
  /** 贸易商管理 */
  TraderManagement = 1,
}

/** 权限条件的比较操作符 */
export enum UserTablePermissionOperator {
  /** 等于 */
  Equals = 0,
  /** 不等于 */
  NotEquals = 1,
  /** 包含 */
  Contains = 2,
  /** 大于 */
  GreaterThan = 3,
  /** 小于 */
  LessThan = 4,
  /** 大于等于 */
  GreaterThanOrEqual = 5,
  /** 小于等于 */
  LessThanOrEqual = 6,
  /** 开头包含 */
  StartsWith = 7,
  /** 结尾包含 */
  EndsWith = 8,
}

// ==================== 枚举选项定义 ====================

/** 功能类型选项 */
export const ManageTypeOptions = [
  { label: '查询', value: ManageType.Get },
  { label: '编辑', value: ManageType.Edit },
];

/** 数据权限类型选项 */
export const DataPermissionTypeOptions = [
  { label: '自己', value: DataPermissionType.My },
  { label: '本部门', value: DataPermissionType.MyPart },
  { label: '本公司', value: DataPermissionType.MyCompany },
  { label: '多用户', value: DataPermissionType.ManyUser },
  { label: '多部门/多公司', value: DataPermissionType.ManyPart },
  { label: '全部', value: DataPermissionType.All },
];

/** 模块选项 */
export const FrightModuleOptions = [
  { label: '仓库管理', value: FrightModule.WarehouseManagement },
  { label: '贸易商管理', value: FrightModule.TraderManagement },
];

/** 操作符选项 */
export const OperatorOptions = [
  { label: '等于', value: UserTablePermissionOperator.Equals },
  { label: '不等于', value: UserTablePermissionOperator.NotEquals },
  { label: '包含', value: UserTablePermissionOperator.Contains },
  { label: '大于', value: UserTablePermissionOperator.GreaterThan },
  { label: '小于', value: UserTablePermissionOperator.LessThan },
  { label: '大于等于', value: UserTablePermissionOperator.GreaterThanOrEqual },
  { label: '小于等于', value: UserTablePermissionOperator.LessThanOrEqual },
  { label: '开头包含', value: UserTablePermissionOperator.StartsWith },
  { label: '结尾包含', value: UserTablePermissionOperator.EndsWith },
];

// ==================== 类型定义 ====================

export namespace SystemPermissionApi {
  /** 权限DTO */
  export interface PermissionDto {
    name: string;
    parentName?: string;
    displayName: string;
    isOpen?: boolean;
  }

  /** 角色权限DTO */
  export interface RolePermissionDto {
    roleId: number;
    permissionNames: string[];
  }

  /** 用户权限DTO */
  export interface UserPermissionDto {
    userId: number;
    permissionNames: string[];
  }

  /** 数据权限DTO */
  export interface UserDataPermissionDto {
    id: number;
    userId?: number;
    roleId?: number;
    dataPermissionType: DataPermissionType;
    manageType: ManageType;
    creationTime?: string;
  }

  /** 数据权限新增DTO */
  export interface UserDataPermissionAddDto {
    userId?: number;
    roleId?: number;
    dataPermissionType: DataPermissionType;
    manageType: ManageType;
  }

  /** 数据权限编辑DTO */
  export interface UserDataPermissionEditDto {
    id: number;
    userId?: number;
    roleId?: number;
    dataPermissionType: DataPermissionType;
    manageType: ManageType;
  }

  /** 数据权限子项DTO */
  export interface UserDataPermissionItemDto {
    id: number;
    userDataPermissionId: number;
    entityId: number;
  }

  /** 数据权限子项新增DTO */
  export interface UserDataPermissionItemAddDto {
    userDataPermissionId: number;
    entityId: number;
  }

  /** 表级权限DTO */
  export interface UserTablePermissionDto {
    id: number;
    userId?: number;
    roleId?: number;
    frightModule: FrightModule;
    manageType: ManageType;
    creationTime?: string;
  }

  /** 表级权限新增DTO */
  export interface UserTablePermissionAddDto {
    userId?: number;
    roleId?: number;
    frightModule: FrightModule;
    manageType: ManageType;
  }

  /** 表级权限编辑DTO */
  export interface UserTablePermissionEditDto {
    id: number;
    userId?: number;
    roleId?: number;
    frightModule: FrightModule;
    manageType: ManageType;
  }

  /** 表级权限条件DTO */
  export interface UserTablePermissionConditionDto {
    id: number;
    userTablePermissionId: number;
    propName: string;
    operator: UserTablePermissionOperator;
    value: string;
  }

  /** 表级权限条件新增DTO */
  export interface UserTablePermissionConditionAddDto {
    userTablePermissionId: number;
    propName: string;
    operator: UserTablePermissionOperator;
    value: string;
  }

  /** 字段权限DTO */
  export interface UserPropPermissionDto {
    id: number;
    userId?: number;
    roleId?: number;
    frightModule: FrightModule;
    propName: string;
    creationTime?: string;
  }

  /** 字段权限新增DTO */
  export interface UserPropPermissionAddDto {
    userId?: number;
    roleId?: number;
    frightModule: FrightModule;
    propName: string;
  }

  /** 字段权限编辑DTO */
  export interface UserPropPermissionEditDto {
    id: number;
    userId?: number;
    roleId?: number;
    frightModule: FrightModule;
    propName: string;
  }

  /** 分页列表响应 */
  export interface PagedList<T> {
    items: T[];
    pageIndex: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  }

  /** 分页查询参数 */
  export interface PagedQueryParams {
    Keyword?: string;
    UserId?: number;
    RoleId?: number;
    Sorting?: string;
    PageIndex?: number;
    PageSize?: number;
  }
}

// ==================== 模块权限API ====================

/**
 * 获取所有权限
 */
async function getAllPermissions() {
  return requestClient.get<SystemPermissionApi.PermissionDto[]>(
    '/services/app/Permission/GetAllPermissions',
  );
}

/**
 * 获取角色的权限名称集合
 * @param roleId 角色ID
 */
async function getRolePermissions(roleId: number) {
  return requestClient.get<string[]>(
    '/services/app/Role/GetRolePermissionsAsync',
    { params: { Id: roleId } },
  );
}

/**
 * 更新角色的权限
 * @param data 角色权限数据
 */
async function updateRolePermissions(
  data: SystemPermissionApi.RolePermissionDto,
) {
  return requestClient.put(
    '/services/app/Role/UpdateRolePermissionsAsync',
    data,
  );
}

/**
 * 获取用户的权限名称集合
 * @param userId 用户ID
 */
async function getUserPermissions(userId: number) {
  return requestClient.get<string[]>(
    '/services/app/UserAdmin/GetUserPermissionsAsync',
    { params: { Id: userId } },
  );
}

/**
 * 更新用户的权限
 * @param data 用户权限数据
 */
async function updateUserPermissions(
  data: SystemPermissionApi.UserPermissionDto,
) {
  return requestClient.put(
    '/services/app/UserAdmin/UpdateUserPermissionsAsync',
    data,
  );
}

// ==================== 数据权限API ====================

/**
 * 获取数据权限列表
 */
async function getDataPermissionList(params: Recordable<any>) {
  const queryParams: SystemPermissionApi.PagedQueryParams = {
    Keyword: params.keyword,
    UserId: params.userId,
    RoleId: params.roleId,
    PageIndex: params.page || params.pageIndex || 1,
    PageSize: params.pageSize || 10,
    Sorting: params.sorting || 'Id',
  };
  const response = await requestClient.get<
    SystemPermissionApi.PagedList<SystemPermissionApi.UserDataPermissionDto>
  >('/services/app/UserDataPermissionAdmin/GetPagedListAsync', {
    params: queryParams,
  });
  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

/**
 * 新增数据权限
 */
async function addDataPermission(
  data: SystemPermissionApi.UserDataPermissionAddDto,
) {
  return requestClient.post<number>(
    '/services/app/UserDataPermissionAdmin/AddAsync',
    data,
  );
}

/**
 * 编辑数据权限
 */
async function editDataPermission(
  data: SystemPermissionApi.UserDataPermissionEditDto,
) {
  return requestClient.put<boolean>(
    '/services/app/UserDataPermissionAdmin/EditAsync',
    data,
  );
}

/**
 * 删除数据权限
 */
async function deleteDataPermission(id: number) {
  return requestClient.delete<boolean>(
    '/services/app/UserDataPermissionAdmin/DeleteAsync',
    { data: { id } },
  );
}

/**
 * 获取数据权限子项列表
 */
async function getDataPermissionItemList(params: Recordable<any>) {
  const queryParams = {
    UserDataPermissionId: params.userDataPermissionId,
    PageIndex: params.page || params.pageIndex || 1,
    PageSize: params.pageSize || 100,
  };
  const response = await requestClient.get<
    SystemPermissionApi.PagedList<SystemPermissionApi.UserDataPermissionItemDto>
  >('/services/app/UserDataPermissionItemAdmin/GetPagedListAsync', {
    params: queryParams,
  });
  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

/**
 * 新增数据权限子项
 */
async function addDataPermissionItem(
  data: SystemPermissionApi.UserDataPermissionItemAddDto,
) {
  return requestClient.post<number>(
    '/services/app/UserDataPermissionItemAdmin/AddAsync',
    data,
  );
}

/**
 * 删除数据权限子项
 */
async function deleteDataPermissionItem(id: number) {
  return requestClient.delete<boolean>(
    '/services/app/UserDataPermissionItemAdmin/DeleteAsync',
    { data: { id } },
  );
}

// ==================== 表级权限API ====================

/**
 * 获取表级权限列表
 */
async function getTablePermissionList(params: Recordable<any>) {
  const queryParams: SystemPermissionApi.PagedQueryParams = {
    Keyword: params.keyword,
    UserId: params.userId,
    RoleId: params.roleId,
    PageIndex: params.page || params.pageIndex || 1,
    PageSize: params.pageSize || 10,
    Sorting: params.sorting || 'Id',
  };
  const response = await requestClient.get<
    SystemPermissionApi.PagedList<SystemPermissionApi.UserTablePermissionDto>
  >('/services/app/UserTablePermissionAdmin/GetPagedListAsync', {
    params: queryParams,
  });
  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

/**
 * 新增表级权限
 */
async function addTablePermission(
  data: SystemPermissionApi.UserTablePermissionAddDto,
) {
  return requestClient.post<number>(
    '/services/app/UserTablePermissionAdmin/AddAsync',
    data,
  );
}

/**
 * 编辑表级权限
 */
async function editTablePermission(
  data: SystemPermissionApi.UserTablePermissionEditDto,
) {
  return requestClient.put<boolean>(
    '/services/app/UserTablePermissionAdmin/EditAsync',
    data,
  );
}

/**
 * 删除表级权限
 */
async function deleteTablePermission(id: number) {
  return requestClient.delete<boolean>(
    '/services/app/UserTablePermissionAdmin/DeleteAsync',
    { data: { id } },
  );
}

/**
 * 获取表级权限条件列表
 */
async function getTablePermissionConditionList(params: Recordable<any>) {
  const queryParams = {
    UserTablePermissionId: params.userTablePermissionId,
    PageIndex: params.page || params.pageIndex || 1,
    PageSize: params.pageSize || 100,
  };
  const response = await requestClient.get<
    SystemPermissionApi.PagedList<SystemPermissionApi.UserTablePermissionConditionDto>
  >('/services/app/UserTablePermissionConditionAdmin/GetPagedListAsync', {
    params: queryParams,
  });
  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

/**
 * 新增表级权限条件
 */
async function addTablePermissionCondition(
  data: SystemPermissionApi.UserTablePermissionConditionAddDto,
) {
  return requestClient.post<number>(
    '/services/app/UserTablePermissionConditionAdmin/AddAsync',
    data,
  );
}

/**
 * 删除表级权限条件
 */
async function deleteTablePermissionCondition(id: number) {
  return requestClient.delete<boolean>(
    '/services/app/UserTablePermissionConditionAdmin/DeleteAsync',
    { data: { id } },
  );
}

// ==================== 字段权限API ====================

/**
 * 获取字段权限列表
 */
async function getPropPermissionList(params: Recordable<any>) {
  const queryParams: SystemPermissionApi.PagedQueryParams = {
    Keyword: params.keyword,
    UserId: params.userId,
    RoleId: params.roleId,
    PageIndex: params.page || params.pageIndex || 1,
    PageSize: params.pageSize || 10,
    Sorting: params.sorting || 'Id',
  };
  const response = await requestClient.get<
    SystemPermissionApi.PagedList<SystemPermissionApi.UserPropPermissionDto>
  >('/services/app/UserPropPermissionAdmin/GetPagedListAsync', {
    params: queryParams,
  });
  return {
    items: response.items || [],
    totalCount: response.totalCount || 0,
  };
}

/**
 * 新增字段权限
 */
async function addPropPermission(
  data: SystemPermissionApi.UserPropPermissionAddDto,
) {
  return requestClient.post<number>(
    '/services/app/UserPropPermissionAdmin/AddAsync',
    data,
  );
}

/**
 * 编辑字段权限
 */
async function editPropPermission(
  data: SystemPermissionApi.UserPropPermissionEditDto,
) {
  return requestClient.put<boolean>(
    '/services/app/UserPropPermissionAdmin/EditAsync',
    data,
  );
}

/**
 * 删除字段权限
 */
async function deletePropPermission(id: number) {
  return requestClient.delete<boolean>(
    '/services/app/UserPropPermissionAdmin/DeleteAsync',
    { data: { id } },
  );
}

export {
  // 模块权限
  getAllPermissions,
  getRolePermissions,
  getUserPermissions,
  updateRolePermissions,
  updateUserPermissions,
  // 数据权限
  addDataPermission,
  addDataPermissionItem,
  deleteDataPermission,
  deleteDataPermissionItem,
  editDataPermission,
  getDataPermissionItemList,
  getDataPermissionList,
  // 表级权限
  addTablePermission,
  addTablePermissionCondition,
  deleteTablePermission,
  deleteTablePermissionCondition,
  editTablePermission,
  getTablePermissionConditionList,
  getTablePermissionList,
  // 字段权限
  addPropPermission,
  deletePropPermission,
  editPropPermission,
  getPropPermissionList,
};
