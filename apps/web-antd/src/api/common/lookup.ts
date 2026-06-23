import { requestClient } from '#/api/request';

export namespace CommonLookupApi {
  /** 附件所属模块（ModuleTypeId / 默认展示模块 moduleType 共用数值） */
  export interface ModuleType {
    id?: string | null;
    name?: string | null;
    displayName?: string | null;
  }
}

const API_PREFIX = '/services/app/CommonLookup';

/**
 * 获取 ModuleType 列表（用于附件默认展示模块等场景）
 */
export const getModuleTypes = () => {
  return requestClient.get<CommonLookupApi.ModuleType[]>(
    `${API_PREFIX}/GetModuleTypes`,
  );
};

let moduleTypeLabelCache: Map<number, string> | null = null;

/** 将 ModuleType 列表转为 moduleType 数值 -> 显示名 映射 */
export function buildModuleTypeLabelMap(
  items: CommonLookupApi.ModuleType[],
): Map<number, string> {
  const map = new Map<number, string>();
  for (const item of items) {
    const value = Number(item.id);
    if (Number.isNaN(value)) continue;
    map.set(value, item.displayName || item.name || String(value));
  }
  return map;
}

/** 获取并缓存 moduleType 显示名映射 */
export async function getModuleTypeLabelMap(): Promise<Map<number, string>> {
  if (moduleTypeLabelCache) {
    return moduleTypeLabelCache;
  }
  const items = await getModuleTypes();
  moduleTypeLabelCache = buildModuleTypeLabelMap(items);
  return moduleTypeLabelCache;
}

/** 将 moduleType 数值格式化为显示名 */
export function formatModuleTypeLabel(
  moduleType: number,
  labelMap: Map<number, string>,
): string {
  return labelMap.get(moduleType) ?? String(moduleType);
}
