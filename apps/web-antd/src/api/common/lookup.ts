import type { EnumerationAdminApi } from '#/api/system/enum-admin';

import { getEnumItems } from '#/utils/init-enum';

/** 系统枚举「ModuleType」名称（system/enumeration 自定义枚举） */
export const MODULE_TYPE_ENUM_NAME = 'ModuleType';

export type ModuleTypeOption = { label: string; value: number };

let moduleTypeLabelCache: Map<number, string> | null = null;

/** 将 ModuleType 枚举项转为 moduleType 数值 -> 显示名 映射 */
export function buildModuleTypeLabelMap(
  items: EnumerationAdminApi.EnumerationItemDto[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const item of items) {
    if (item.enable === false) continue;
    const value = Number(item.value);
    if (Number.isNaN(value)) continue;
    map.set(value, item.displayName || String(value));
  }
  return map;
}

/** 将 ModuleType 枚举项转为下拉选项 */
export function buildModuleTypeOptionsFromEnum(
  items: EnumerationAdminApi.EnumerationItemDto[],
): ModuleTypeOption[] {
  return [...buildModuleTypeLabelMap(items).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
}

export async function getModuleTypeEnumItems() {
  return getEnumItems(MODULE_TYPE_ENUM_NAME);
}

/** 获取 ModuleType 下拉选项（仅含已启用枚举项） */
export async function getModuleTypeOptions(): Promise<ModuleTypeOption[]> {
  const items = await getModuleTypeEnumItems();
  return buildModuleTypeOptionsFromEnum(items);
}

/** 获取并缓存 moduleType 显示名映射 */
export async function getModuleTypeLabelMap(): Promise<Map<number, string>> {
  if (moduleTypeLabelCache) {
    return moduleTypeLabelCache;
  }
  const items = await getModuleTypeEnumItems();
  moduleTypeLabelCache = buildModuleTypeLabelMap(items);
  return moduleTypeLabelCache;
}

/** 清除 moduleType 显示名缓存（枚举变更后可调用） */
export function clearModuleTypeLabelCache() {
  moduleTypeLabelCache = null;
}

/** 将 moduleType 数值格式化为显示名 */
export function formatModuleTypeLabel(
  moduleType: number,
  labelMap: Map<number, string>,
): string {
  return labelMap.get(moduleType) ?? String(moduleType);
}

/** 按显示名解析 ModuleType 枚举值 */
export async function resolveModuleTypeByLabel(
  label: string,
): Promise<number | null> {
  const options = await getModuleTypeOptions();
  const found = options.find((item) => item.label === label);
  return found?.value ?? null;
}
