/**
 * 单据「干系人」可用角色：由 system/enumeration 按业务类型配置，不再前端写死。
 *
 * 枚举子项口径：`value` = UserAttribute 位值、`displayName` = 角色名、
 * `enable` = 是否可用、`extra1` = 是否进入页面即渲染该角色行。
 * 固定角色（海运出口=操作/销售，业务联系单=销售）无论枚举是否配置都展示且不可删除。
 */
import type { MaybeRefOrGetter } from 'vue';

import { ref, toValue, watch } from 'vue';

import type { EnumerationAdminApi } from '#/api/system/enum-admin';

import { getItemsByName } from '#/api/system/enum-admin';
import { UserAttribute } from '#/api/system/user-admin';
import { $t } from '#/locales';
import { getEnumItems } from '#/utils/init-enum';

/** 业务类型 → system/enumeration 中维护干系人角色的枚举名称 */
export const ORDER_USER_ROLE_ENUM_NAMES: Record<number, string> = {
  0: 'SeaExportUserAttribute',
  // 海运进口枚举暂未配置，用不到时勿映射，避免启动/切类型时拉取报「枚举不存在」
  // 1: 'SeaImportUserAttribute',
};

export interface OrderUserRoleOption {
  /** 枚举 extra1：进入页面即渲染该角色行（固定角色恒为 true） */
  defaultVisible: boolean;
  label: string;
  value: number;
}

const USER_ATTRIBUTE_LABEL_KEYS: Record<number, string> = {
  [UserAttribute.Business]: 'business',
  [UserAttribute.CustomerService]: 'customerService',
  [UserAttribute.Documentation]: 'documentation',
  [UserAttribute.Finance]: 'finance',
  [UserAttribute.HR]: 'hr',
  [UserAttribute.LoadingSupervision]: 'loadingSupervision',
  [UserAttribute.Operation]: 'operation',
  [UserAttribute.OverseasCustomerService]: 'overseasCustomerService',
  [UserAttribute.Sales]: 'sales',
  [UserAttribute.ShippingLine]: 'shippingLine',
};

/** 枚举未配置该角色时的兜底名称（取用户属性国际化文案） */
export function getUserAttributeLabel(value?: number): string {
  if (value == null) return '-';
  const key = USER_ATTRIBUTE_LABEL_KEYS[value];
  return key ? $t(`system.user.userAttributeOptions.${key}`) : String(value);
}

/** 可配置为干系人角色的用户属性，顺序与用户管理页的属性勾选一致 */
const USER_ATTRIBUTE_ROLE_VALUES: number[] = [
  UserAttribute.Operation,
  UserAttribute.CustomerService,
  UserAttribute.Documentation,
  UserAttribute.Business,
  UserAttribute.Sales,
  UserAttribute.Finance,
  UserAttribute.OverseasCustomerService,
  UserAttribute.HR,
  UserAttribute.ShippingLine,
  UserAttribute.LoadingSupervision,
];

/**
 * 枚举管理里配置干系人角色时的可选用户属性。
 * 枚举子项 `value` 必须落在这些位值上，否则前端匹配不到人员属性。
 */
export function getUserAttributeRoleOptions(): {
  label: string;
  value: number;
}[] {
  return USER_ATTRIBUTE_ROLE_VALUES.map((value) => ({
    label: getUserAttributeLabel(value),
    value,
  }));
}

/** 该枚举是否用于配置单据干系人角色 */
export function isOrderUserRoleEnum(name?: string): boolean {
  if (!name) return false;
  return Object.values(ORDER_USER_ROLE_ENUM_NAMES).includes(name);
}

const pendingRoleItems = new Map<
  string,
  Promise<EnumerationAdminApi.EnumerationItemDto[]>
>();

/**
 * 取角色枚举子项：优先请求最新配置，后台改完刷新页面即生效；
 * 请求失败才退回本地枚举缓存（可能是旧值）。同名并发请求合并为一次。
 * 枚举未配置是有兜底的预期状态，不弹全局错误提示。
 */
async function loadRoleEnumItems(enumName: string) {
  const pending = pendingRoleItems.get(enumName);
  if (pending) return pending;
  const request = getItemsByName(enumName, { silent: true })
    .catch(() => getEnumItems(enumName, false))
    .finally(() => {
      pendingRoleItems.delete(enumName);
    });
  pendingRoleItems.set(enumName, request);
  return request;
}

/**
 * 按业务类型取干系人角色选项。
 * 枚举漏配固定角色时兜底补在最前，保证固定角色永远可选可用。
 */
export async function getOrderUserRoleOptions(
  bizType: number | undefined,
  fixedRoles: number[],
): Promise<OrderUserRoleOption[]> {
  const enumName = ORDER_USER_ROLE_ENUM_NAMES[Number(bizType ?? 0)];
  const items = enumName ? await loadRoleEnumItems(enumName) : [];
  const options: OrderUserRoleOption[] = [];
  const configured = new Set<number>();
  for (const item of items ?? []) {
    if (item.enable === false) continue;
    const value = Number(item.value);
    if (!Number.isFinite(value) || configured.has(value)) continue;
    configured.add(value);
    options.push({
      defaultVisible: item.extra1 === true || fixedRoles.includes(value),
      label: item.displayName?.trim() || getUserAttributeLabel(value),
      value,
    });
  }
  const missingFixed = fixedRoles
    .filter((role) => !configured.has(role))
    .map((value) => ({
      defaultVisible: true,
      label: getUserAttributeLabel(value),
      value,
    }));
  return [...missingFixed, ...options];
}

export interface UseOrderUserRolesOptions {
  /** 业务类型，变更后自动重新拉取；缺省按海运出口（0） */
  bizType?: MaybeRefOrGetter<number | undefined>;
  /** 无论枚举是否配置都展示且不可删除的角色 */
  fixedRoles: number[];
}

/**
 * 干系人角色选项的响应式加载。
 * 首帧先给出固定角色，枚举返回后再整体替换，避免面板初始为空。
 */
export function useOrderUserRoles(options: UseOrderUserRolesOptions) {
  const { bizType, fixedRoles } = options;
  const roleOptions = ref<OrderUserRoleOption[]>(
    fixedRoles.map((value) => ({
      defaultVisible: true,
      label: getUserAttributeLabel(value),
      value,
    })),
  );
  let requestSeq = 0;
  let readyPromise: Promise<void> = Promise.resolve();

  const reload = () => {
    const seq = ++requestSeq;
    readyPromise = getOrderUserRoleOptions(toValue(bizType), fixedRoles).then(
      (next) => {
        // 业务类型已再次切换时丢弃过期响应
        if (seq !== requestSeq) return;
        roleOptions.value = next;
      },
    );
    return readyPromise;
  };

  watch(
    () => toValue(bizType),
    () => {
      void reload();
    },
    { immediate: true },
  );

  /** 等待当前业务类型的角色加载完成（用于快照基线等需要稳定态的时机） */
  const whenRolesReady = () => readyPromise;

  const roleLabelOf = (value?: number) =>
    roleOptions.value.find((item) => item.value === value)?.label ??
    getUserAttributeLabel(value);

  return { roleLabelOf, roleOptions, whenRolesReady };
}

export interface SyncOrderUserRowsOptions<T> {
  /** 补齐默认展示角色时构造新行 */
  createRow: (userAttribute: number) => T;
  /** 业务类型切换后剔除新枚举中不存在的角色行 */
  dropUnknownRoles?: boolean;
  getUserAttribute: (row: T) => number | undefined;
  roles: OrderUserRoleOption[];
  rows: T[];
}

/**
 * 按角色配置整理干系人行：补齐缺失的默认展示角色，并按枚举顺序排列。
 * 枚举之外的角色（历史数据/手动添加）排在末尾并保持原有相对顺序。
 */
export function syncOrderUserRows<T>(
  options: SyncOrderUserRowsOptions<T>,
): T[] {
  const {
    createRow,
    dropUnknownRoles = false,
    getUserAttribute,
    roles,
    rows,
  } = options;
  const known = new Set(roles.map((role) => role.value));
  const kept = dropUnknownRoles
    ? rows.filter((row) => {
        const attr = getUserAttribute(row);
        return attr != null && known.has(attr);
      })
    : rows;
  const present = new Set(
    kept
      .map((row) => getUserAttribute(row))
      .filter((attr): attr is number => attr != null),
  );
  const missing = roles
    .filter((role) => role.defaultVisible && !present.has(role.value))
    .map((role) => createRow(role.value));
  const order = new Map(roles.map((role, index) => [role.value, index]));
  const rank = (row: T) => {
    const attr = getUserAttribute(row);
    return attr != null && order.has(attr)
      ? (order.get(attr) as number)
      : roles.length;
  };
  return [...kept, ...missing].sort((a, b) => rank(a) - rank(b));
}
