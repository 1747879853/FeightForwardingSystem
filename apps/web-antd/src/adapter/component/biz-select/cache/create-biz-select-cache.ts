import type { Ref, ShallowRef } from 'vue';

import { ref, shallowRef } from 'vue';

import { useUserStore } from '@vben/stores';

import { buildBrandStorageKey } from '#/utils/brand-storage';

export interface CreateBizSelectCacheOptions<T> {
  /** 缓存名，用于 storage key 与注册表隔离 */
  name: string;
  /** 拉取全量列表；失败时不覆盖旧缓存 */
  fetchAll: () => Promise<T[]>;
  /** 缓存结构版本，变更后丢弃旧 localStorage */
  version?: number;
  /** 过期时间（毫秒），默认 5 分钟，对齐 usePagedSelect */
  staleTime?: number;
  /** 是否写入 localStorage，默认 true */
  persist?: boolean;
  /** 作用域（默认当前登录用户 id），用于品牌+用户隔离 */
  getScope?: () => string;
}

export interface BizSelectCache<T> {
  /** 当前作用域下的列表快照（成功拉取后才替换） */
  items: ShallowRef<T[]>;
  /** 当前快照写入时间；0 表示尚无快照 */
  updatedAt: Ref<number>;
  /** 仅在「没有任何可用快照」时为 true；静默刷新不亮 loading */
  loading: Ref<boolean>;
  ensure: (opts?: { force?: boolean }) => Promise<T[]>;
  getSnapshot: () => T[] | null;
  findById: (
    id: number | string,
    getId?: (item: T) => number | string,
  ) => T | undefined;
  clear: () => void;
}

interface PersistPayload<T> {
  items: T[];
  updatedAt: number;
  version: number;
}

const registry = new Set<BizSelectCache<unknown>>();

function defaultGetScope() {
  try {
    const userStore = useUserStore();
    const userId = userStore.userInfo?.userId;
    if (userId === undefined || userId === null || userId === '') {
      return 'anon';
    }
    return String(userId);
  } catch {
    return 'anon';
  }
}

/**
 * 通用 biz-select 全量列表缓存。
 * 命中旧缓存立即返回；后台刷新成功才覆盖，失败保留旧数据。
 */
export function createBizSelectCache<T>(
  options: CreateBizSelectCacheOptions<T>,
): BizSelectCache<T> {
  const {
    name,
    fetchAll,
    version = 1,
    staleTime = 5 * 60 * 1000,
    persist = true,
    getScope = defaultGetScope,
  } = options;

  const items = shallowRef<T[]>([]) as ShallowRef<T[]>;
  const updatedAt = ref(0);
  const loading = ref(false);

  const memoryByScope = new Map<string, { items: T[]; updatedAt: number }>();
  const inflightByScope = new Map<string, Promise<T[]>>();
  let activeScope: string | null = null;

  const persistPrefix = () => buildBrandStorageKey(`biz_select_${name}_`);
  const persistKeyOf = (scope: string) => `${persistPrefix()}${scope}`;

  const applySnapshot = (scope: string, snapshot: T[], stamp: number) => {
    memoryByScope.set(scope, { items: snapshot, updatedAt: stamp });
    if (activeScope === scope || activeScope === null) {
      activeScope = scope;
      items.value = snapshot;
      updatedAt.value = stamp;
    }
  };

  const readPersist = (scope: string): PersistPayload<T> | null => {
    if (!persist || typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(persistKeyOf(scope));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as PersistPayload<T>;
      if (
        !parsed ||
        parsed.version !== version ||
        !Array.isArray(parsed.items)
      ) {
        return null;
      }
      if (typeof parsed.updatedAt !== 'number') return null;
      return parsed;
    } catch {
      return null;
    }
  };

  const writePersist = (scope: string, snapshot: T[], stamp: number) => {
    if (!persist || typeof localStorage === 'undefined') return;
    try {
      const payload: PersistPayload<T> = {
        items: snapshot,
        updatedAt: stamp,
        version,
      };
      localStorage.setItem(persistKeyOf(scope), JSON.stringify(payload));
    } catch {
      // 配额满或隐私模式：忽略，不影响内存缓存
    }
  };

  const hydrateScope = (scope: string) => {
    const mem = memoryByScope.get(scope);
    if (mem) {
      applySnapshot(scope, mem.items, mem.updatedAt);
      return mem;
    }
    const stored = readPersist(scope);
    if (!stored) return null;
    applySnapshot(scope, stored.items, stored.updatedAt);
    return { items: stored.items, updatedAt: stored.updatedAt };
  };

  const isStale = (stamp: number) => Date.now() - stamp >= staleTime;

  const runFetch = (scope: string): Promise<T[]> => {
    const existing = inflightByScope.get(scope);
    if (existing) return existing;

    const hasSnapshot = memoryByScope.has(scope);
    if (!hasSnapshot) loading.value = true;

    const request = (async () => {
      const nextItems = await fetchAll();
      const stamp = Date.now();
      applySnapshot(scope, nextItems, stamp);
      writePersist(scope, nextItems, stamp);
      return nextItems;
    })()
      .catch((error) => {
        const fallback = memoryByScope.get(scope);
        if (fallback) return fallback.items;
        throw error;
      })
      .finally(() => {
        inflightByScope.delete(scope);
        loading.value = false;
      });

    inflightByScope.set(scope, request);
    return request;
  };

  const ensure = async (opts?: { force?: boolean }): Promise<T[]> => {
    const scope = getScope();
    const snapshot = hydrateScope(scope);
    const force = opts?.force === true;

    if (snapshot && !force && !isStale(snapshot.updatedAt)) {
      return snapshot.items;
    }

    if (snapshot && !force) {
      // 有旧缓存：立刻返回，后台静默刷新；失败不覆盖
      void runFetch(scope).catch(() => {
        // 保留旧缓存，不打断下拉
      });
      return snapshot.items;
    }

    try {
      return await runFetch(scope);
    } catch {
      return snapshot?.items ?? items.value;
    }
  };

  const getSnapshot = (): T[] | null => {
    const scope = getScope();
    hydrateScope(scope);
    const mem = memoryByScope.get(scope);
    return mem ? mem.items : null;
  };

  const findById = (
    id: number | string,
    getId: (item: T) => number | string = (item) =>
      (item as { id?: number | string }).id as number | string,
  ): T | undefined => {
    const key = String(id);
    const list = getSnapshot() ?? items.value;
    return list.find((item) => String(getId(item)) === key);
  };

  const clear = () => {
    memoryByScope.clear();
    inflightByScope.clear();
    items.value = [];
    updatedAt.value = 0;
    loading.value = false;
    activeScope = null;
    if (!persist || typeof localStorage === 'undefined') return;
    const prefix = persistPrefix();
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) toRemove.push(key);
    }
    for (const key of toRemove) localStorage.removeItem(key);
  };

  const cache: BizSelectCache<T> = {
    items,
    updatedAt,
    loading,
    ensure,
    getSnapshot,
    findById,
    clear,
  };

  registry.add(cache as BizSelectCache<unknown>);
  return cache;
}

/** 登出时清空全部 biz-select 全量缓存（内存 + 当前品牌下的 localStorage） */
export function clearAllBizSelectCaches() {
  for (const cache of registry) {
    cache.clear();
  }
}
