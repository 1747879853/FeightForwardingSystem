/**
 * ABP 权限工具
 * 用于组件中的按钮级权限控制
 */

import type { AbpAction } from '#/router/abp-authority';

import { abpPageAuthority, buildAbpCode } from '#/router/abp-authority';

/** ABP 权限对象类型 */
export interface AbpPermission {
  /** 新增权限码 */
  add: string;
  /** 基础权限路径 */
  base: string;
  /** 删除权限码 */
  delete: string;
  /** 编辑权限码 */
  edit: string;
  /** 查询权限码 */
  get: string;
  /** 页面访问所需的 authority 数组 */
  pageAuthority: string[];
}

/**
 * 创建 ABP 权限对象
 * @param base 基础权限路径，如 'Admin.Team.Role'
 * @returns ABP 权限对象，包含各动作的权限码
 *
 * @example
 * ```ts
 * const perm = createAbpPermission('Admin.Team.Role');
 *
 * // 在模板中使用
 * // <Button v-access:code="perm.add">新增</Button>
 * // <Button v-access:code="perm.edit">编辑</Button>
 * // <Button v-access:code="perm.delete">删除</Button>
 * ```
 */
export const createAbpPermission = (base: string): AbpPermission => {
  return {
    add: buildAbpCode(base, 'Add'),
    base,
    delete: buildAbpCode(base, 'Delete'),
    edit: buildAbpCode(base, 'Edit'),
    get: buildAbpCode(base, 'Get'),
    pageAuthority: abpPageAuthority(base),
  };
};

/**
 * 检查是否拥有指定的 ABP 权限
 * @param accessCodes 当前用户拥有的权限码列表
 * @param base 基础权限路径
 * @param action 动作类型
 * @returns 是否拥有权限
 */
export const hasAbpPermission = (
  accessCodes: string[],
  base: string,
  action: AbpAction,
): boolean => {
  const code = buildAbpCode(base, action);
  return accessCodes.includes(code);
};

/**
 * 检查是否拥有页面访问权限（Get 或父级权限）
 * @param accessCodes 当前用户拥有的权限码列表
 * @param base 基础权限路径，支持单个或多个
 * @returns 是否拥有页面访问权限
 */
export const hasAbpPageAccess = (
  accessCodes: string[],
  base: string | string[],
): boolean => {
  const authority = abpPageAuthority(base);
  return authority.some((code) => accessCodes.includes(code));
};
