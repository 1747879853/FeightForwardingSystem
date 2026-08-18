import type { ComputedRef, Ref } from 'vue';

import {
  computed,
  getCurrentScope,
  nextTick,
  onMounted,
  onScopeDispose,
  ref,
  watch,
} from 'vue';

import type { BizSelectCache } from './cache/create-biz-select-cache';
import type { OptionItem } from './use-paged-select';

export interface CachedSelectOptions<T = any> {
  cache: BizSelectCache<T>;
  mapItemToOption: (item: T) => OptionItem;
  /** 除关键词外的本地过滤（角色、公司等）；在 computed 中调用以便收集依赖 */
  matchesItem?: (item: T) => boolean;
  /** 关键词匹配；默认按 option.label 包含 */
  matchesKeyword?: (item: T, keyword: string) => boolean;
  selectedItemsRef?: Ref<T[] | undefined>;
  selectedValuesRef?: Ref<any>;
  searchDebounce?: number;
}

export interface UseCachedSelectReturn {
  findCachedOption: (value: number | string) => OptionItem | undefined;
  handleDropdownVisibleChange: (visible: boolean) => void;
  handleSearch: (keyword: string) => void;
  loading: Ref<boolean>;
  mergeSelectedItems: (items: any[]) => void;
  options: ComputedRef<OptionItem[]>;
  pinSelectedFromOptions: (rawValue: any, optionList: OptionItem[]) => void;
  searchValue: Ref<string>;
}

function normalizeSelectedValues(raw: any): Array<number | string> {
  if (raw === undefined || raw === null || raw === '') return [];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter(
    (value) => value !== undefined && value !== null && value !== '',
  );
}

/**
 * 全量缓存下拉：挂载/下拉打开时 ensure 缓存，关键词与筛选项仅前端过滤。
 * 已选项始终 pin 进 options，避免过滤后回显成 id。
 */
export function useCachedSelect<T = any>(
  options: CachedSelectOptions<T>,
): UseCachedSelectReturn {
  const {
    cache,
    mapItemToOption,
    matchesItem,
    matchesKeyword,
    selectedItemsRef,
    selectedValuesRef,
    searchDebounce = 300,
  } = options;

  const searchValue = ref('');
  const keyword = ref('');
  const pinnedCache = new Map<string, OptionItem>();
  const pinVersion = ref(0);

  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const cancelPendingSearch = () => {
    if (searchTimer === undefined) return;
    clearTimeout(searchTimer);
    searchTimer = undefined;
  };

  const getPinnedOption = (value: number | string) =>
    pinnedCache.get(String(value));

  const pinOption = (option: OptionItem) => {
    if (option.value === undefined || option.value === null) return;
    pinnedCache.set(String(option.value), option);
    pinVersion.value += 1;
  };

  const syncPinnedCacheWithSelection = () => {
    const activeValues = new Set(
      normalizeSelectedValues(selectedValuesRef?.value).map(String),
    );
    if (activeValues.size === 0) {
      if (pinnedCache.size > 0) {
        pinnedCache.clear();
        pinVersion.value += 1;
      }
      return;
    }
    let changed = false;
    for (const [key, option] of pinnedCache) {
      if (
        !activeValues.has(String(key)) &&
        !activeValues.has(String(option.value))
      ) {
        pinnedCache.delete(key);
        changed = true;
      }
    }
    if (changed) pinVersion.value += 1;
  };

  const mergeSelectedItems = (rawItems: any[]) => {
    if (!rawItems?.length) return;
    for (const item of rawItems) {
      if (!item) continue;
      const option = mapItemToOption(item);
      if (option.value === undefined || option.value === null) continue;
      if (!option.label) continue;
      pinOption(option);
    }
  };

  const pinSelectedFromOptions = (rawValue: any, optionList: OptionItem[]) => {
    for (const value of normalizeSelectedValues(rawValue)) {
      const matched =
        optionList.find((option) => String(option.value) === String(value)) ??
        getPinnedOption(value);
      if (!matched) continue;
      pinOption(matched);
    }
  };

  const findCachedOption = (value: number | string) => {
    const pinned = getPinnedOption(value);
    if (pinned) return pinned;
    const idStr = String(value);
    const item = cache.items.value.find((entry) => {
      const option = mapItemToOption(entry);
      return String(option.value) === idStr;
    });
    return item ? mapItemToOption(item) : undefined;
  };

  const defaultMatchesKeyword = (item: T, query: string) => {
    const label = String(mapItemToOption(item).label ?? '').toLowerCase();
    return label.includes(query);
  };

  const filteredOptions = computed(() => {
    void pinVersion.value;
    const query = keyword.value.trim().toLowerCase();
    const selectedKeys = new Set(
      normalizeSelectedValues(selectedValuesRef?.value).map(String),
    );
    const result = new Map<string, OptionItem>();

    for (const item of cache.items.value) {
      const option = mapItemToOption(item);
      const key = String(option.value);
      if (matchesItem && !matchesItem(item) && !selectedKeys.has(key)) {
        continue;
      }
      if (query) {
        const hit = matchesKeyword
          ? matchesKeyword(item, query)
          : defaultMatchesKeyword(item, query);
        if (!hit && !selectedKeys.has(key)) continue;
      }
      result.set(key, option);
    }

    for (const option of pinnedCache.values()) {
      const key = String(option.value);
      if (!result.has(key)) result.set(key, option);
    }

    if (selectedItemsRef?.value) {
      for (const item of selectedItemsRef.value) {
        if (!item) continue;
        const option = mapItemToOption(item);
        const key = String(option.value);
        if (option.value === undefined || option.value === null) continue;
        if (!option.label) continue;
        if (!result.has(key)) result.set(key, option);
      }
    }

    return [...result.values()];
  });

  const applyKeyword = (next: string) => {
    if (keyword.value === next) return;
    keyword.value = next;
  };

  const handleSearch = (nextKeyword: string) => {
    searchValue.value = nextKeyword ?? '';
    const trimmed = (nextKeyword ?? '').trim();
    cancelPendingSearch();
    if (searchDebounce <= 0) {
      applyKeyword(trimmed);
      return;
    }
    searchTimer = setTimeout(() => {
      searchTimer = undefined;
      applyKeyword(trimmed);
    }, searchDebounce);
  };

  const handleDropdownVisibleChange = (visible: boolean) => {
    if (visible) {
      void cache.ensure();
      return;
    }
    nextTick(() => {
      cancelPendingSearch();
      searchValue.value = '';
      applyKeyword('');
    });
  };

  if (selectedItemsRef) {
    watch(
      selectedItemsRef,
      (list) => {
        if (list?.length) mergeSelectedItems(list);
      },
      { immediate: true },
    );
  }

  if (selectedValuesRef) {
    watch(
      selectedValuesRef,
      (value) => {
        syncPinnedCacheWithSelection();
        for (const selectedValue of normalizeSelectedValues(value)) {
          const cached = findCachedOption(selectedValue);
          if (cached) pinOption(cached);
        }
      },
      { flush: 'sync' },
    );
  }

  onMounted(() => {
    void cache.ensure();
  });

  if (getCurrentScope()) {
    onScopeDispose(cancelPendingSearch);
  }

  return {
    findCachedOption,
    handleDropdownVisibleChange,
    handleSearch,
    loading: cache.loading,
    mergeSelectedItems,
    options: filteredOptions,
    pinSelectedFromOptions,
    searchValue,
  };
}
