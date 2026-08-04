import type { EnumerationAdminApi } from '#/api/system/enum-admin';

import { PRE_ORDER_MODULE_TYPE_ID } from '#/api/pre-order/pre-order-admin';
import { getItemsByName } from '#/api/system/enum-admin';

/** 系统枚举「ModuleType」名称（system/enumeration 自定义枚举） */
export const MODULE_TYPE_ENUM_NAME = 'ModuleType';

export type ModuleTypeOption = { label: string; value: number };

/**
 * 代码侧已知 ModuleType 兜底文案。
 * 枚举管理未及时补齐时（如业务联系单 160050），列表/下拉仍可回显中文名。
 * 枚举已有同 value 时以枚举 displayName 为准。
 */
export const KNOWN_MODULE_TYPE_FALLBACKS: ReadonlyArray<ModuleTypeOption> = [
  { value: PRE_ORDER_MODULE_TYPE_ID, label: '业务联系单' },
];

let moduleTypeLabelCache: Map<number, string> | null = null;
let moduleTypeOptionsCache: ModuleTypeOption[] | null = null;

/** 将枚举未覆盖的已知模块码补进映射（不覆盖已有项） */
function mergeKnownModuleTypeFallbacks(
  map: Map<number, string>,
  items: EnumerationAdminApi.EnumerationItemDto[],
): Map<number, string> {
  const presentValues = new Set(
    items
      .map((item) => Number(item.value))
      .filter((value) => !Number.isNaN(value)),
  );
  for (const item of KNOWN_MODULE_TYPE_FALLBACKS) {
    if (!presentValues.has(item.value) && !map.has(item.value)) {
      map.set(item.value, item.label);
    }
  }
  return map;
}

/** 将 ModuleType 枚举项转为 moduleType 数值 -> 显示名 映射 */
export function buildModuleTypeLabelMap(
  items: EnumerationAdminApi.EnumerationItemDto[],
  options?: { includeDisabled?: boolean },
): Map<number, string> {
  const includeDisabled = options?.includeDisabled ?? false;
  const map = new Map<number, string>();
  for (const item of items) {
    if (!includeDisabled && item.enable === false) continue;
    const value = Number(item.value);
    if (Number.isNaN(value)) continue;
    map.set(value, item.displayName || String(value));
  }
  return mergeKnownModuleTypeFallbacks(map, items);
}

/** 将 ModuleType 枚举项转为下拉选项（仅启用项 + 已知兜底） */
export function buildModuleTypeOptionsFromEnum(
  items: EnumerationAdminApi.EnumerationItemDto[],
): ModuleTypeOption[] {
  return [...buildModuleTypeLabelMap(items).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
}

/**
 * 直连接口拉取 ModuleType，不走 localStorage 枚举缓存。
 * 避免枚举管理新增项后附件类型页仍读到旧 ModuleType。
 */
export async function getModuleTypeEnumItems() {
  try {
    return await getItemsByName(MODULE_TYPE_ENUM_NAME);
  } catch (error) {
    console.error('[ModuleType] 加载枚举失败:', error);
    return [];
  }
}

/** 获取 ModuleType 下拉选项（仅含已启用枚举项 + 已知兜底） */
export async function getModuleTypeOptions(): Promise<ModuleTypeOption[]> {
  if (moduleTypeOptionsCache) {
    return moduleTypeOptionsCache;
  }
  const items = await getModuleTypeEnumItems();
  moduleTypeOptionsCache = buildModuleTypeOptionsFromEnum(items);
  return moduleTypeOptionsCache;
}

/**
 * 获取并缓存 moduleType 显示名映射。
 * 列表回显包含已停用项；`moduleType` 与枚举 `value` 一致（如 110001=客户）。
 */
export async function getModuleTypeLabelMap(): Promise<Map<number, string>> {
  if (moduleTypeLabelCache) {
    return moduleTypeLabelCache;
  }
  const items = await getModuleTypeEnumItems();
  moduleTypeLabelCache = buildModuleTypeLabelMap(items, {
    includeDisabled: true,
  });
  // 空结果不写死缓存，避免首屏失败后一直 miss
  if (moduleTypeLabelCache.size === 0) {
    const empty = moduleTypeLabelCache;
    moduleTypeLabelCache = null;
    return empty;
  }
  return moduleTypeLabelCache;
}

/** 清除 moduleType 显示名缓存（枚举变更后可调用） */
export function clearModuleTypeLabelCache() {
  moduleTypeLabelCache = null;
  moduleTypeOptionsCache = null;
}

/** 将 moduleType 数值格式化为显示名 */
export function formatModuleTypeLabel(
  moduleType: number | string | null | undefined,
  labelMap: Map<number, string>,
): string {
  if (moduleType === null || moduleType === undefined || moduleType === '') {
    return '-';
  }
  const normalized = Number(moduleType);
  if (Number.isNaN(normalized)) {
    return String(moduleType);
  }
  return labelMap.get(normalized) ?? String(moduleType);
}

/** 按显示名解析 ModuleType 枚举值 */
export async function resolveModuleTypeByLabel(
  label: string,
): Promise<number | null> {
  const options = await getModuleTypeOptions();
  const found = options.find((item) => item.label === label);
  return found?.value ?? null;
}
