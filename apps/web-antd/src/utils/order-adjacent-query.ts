import { buildBrandStorageKey } from '#/utils/brand-storage';

/** 海出 / 海进 / 空出共用的「按列表条件翻票」模块名 */
export type OrderAdjacentModule = 'air-export' | 'sea-export' | 'sea-import';

const STORAGE_PREFIX = 'order-adjacent-query';
const PAGING_KEYS = new Set(['pageIndex', 'pageSize', 'PageIndex', 'PageSize']);

export type OrderAdjacentIds = {
  nextId?: null | string;
  previousId?: null | string;
};

function storageKey(module: OrderAdjacentModule) {
  return buildBrandStorageKey(`${STORAGE_PREFIX}:${module}`);
}

/** 去掉分页与空值，只保留详情翻票需要的筛选和排序 */
export function sanitizeAdjacentQuery(
  params: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!params) {
    return {};
  }
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (PAGING_KEYS.has(key)) {
      continue;
    }
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    next[key] = value;
  }
  return next;
}

export function rememberOrderAdjacentQuery(
  module: OrderAdjacentModule,
  params: Record<string, unknown>,
) {
  try {
    sessionStorage.setItem(
      storageKey(module),
      JSON.stringify(sanitizeAdjacentQuery(params)),
    );
  } catch {
    // 隐私模式等写不进 sessionStorage 时，详情仍可只带 Id
  }
}

export function readOrderAdjacentQuery(
  module: OrderAdjacentModule,
): Record<string, unknown> {
  try {
    const raw = sessionStorage.getItem(storageKey(module));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return sanitizeAdjacentQuery(parsed as Record<string, unknown>);
  } catch {
    return {};
  }
}

export function hasRepeatableQueryArray(params: Record<string, unknown>) {
  return Object.values(params).some(
    (value) => Array.isArray(value) && value.length > 0,
  );
}

export function normalizeAdjacentId(value: unknown): null | string {
  if (value == null) {
    return null;
  }
  const id = String(value).trim();
  if (!id || id === '0' || id === '00000000-0000-0000-0000-000000000000') {
    return null;
  }
  return id;
}

export function buildOrderDetailParams(
  id: string | number,
  options?: {
    isPrint?: boolean;
    listQuery?: Record<string, unknown>;
  },
) {
  const params: Record<string, unknown> = {
    ...sanitizeAdjacentQuery(options?.listQuery),
    Id: String(id),
  };
  if (options?.isPrint) {
    params.IsPrint = true;
  }
  return params;
}
