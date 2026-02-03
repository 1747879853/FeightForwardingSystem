/**
 * ABP 权限码工具
 * 用于路由 meta.authority 的 ABP 权限码生成
 */

/** ABP 权限动作类型 */
export type AbpAction = 'Add' | 'Delete' | 'Edit' | 'Get';

/**
 * 构建 ABP 权限码
 * @param base 基础权限路径，如 'Admin.Team.Role'
 * @param action 动作类型
 * @returns 完整权限码，如 'Admin.Team.Role.Get'
 */
export const buildAbpCode = (base: string, action: AbpAction): string =>
  `${base}.${action}`;

/**
 * 生成页面访问所需的 authority 数组
 * 规则：拥有 base 或 base.Get 任一权限即可访问页面
 * @param base 基础权限路径，支持单个或多个
 *   - 单个: 'Admin.Team.Role'
 *   - 多个: ['Admin.BasicData.Carrier', 'Admin.BasicData.CodeInvoice']
 *     多个权限时，只要拥有其中任一权限即可访问（用于父级菜单包含多个子菜单权限的场景）
 * @returns authority 数组
 *
 * @example
 * // 单个权限
 * abpPageAuthority('Admin.Team.Role')
 * // => ['Admin.Team.Role', 'Admin.Team.Role.Get']
 *
 * @example
 * // 多个权限组合（用于自定义父级菜单）
 * abpPageAuthority(['Admin.BasicData.Carrier', 'Admin.BasicData.CodeInvoice'])
 * // => ['Admin.BasicData.Carrier', 'Admin.BasicData.Carrier.Get',
 * //     'Admin.BasicData.CodeInvoice', 'Admin.BasicData.CodeInvoice.Get']
 */
export const abpPageAuthority = (base: string | string[]): string[] => {
  const bases = Array.isArray(base) ? base : [base];
  return bases.flatMap((b) => [b, buildAbpCode(b, 'Get')]);
};

/**
 * 生成指定动作的权限码
 * @param base 基础权限路径
 * @param action 动作类型
 * @returns 权限码字符串
 */
export const abpActionCode = (base: string, action: AbpAction): string =>
  buildAbpCode(base, action);
