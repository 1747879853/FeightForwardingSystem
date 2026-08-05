import type { ComputedRef, Ref } from 'vue';

import {
  computed,
  getCurrentScope,
  nextTick,
  onScopeDispose,
  reactive,
  ref,
  toRefs,
  watch,
} from 'vue';

import { useQueryClient } from '@tanstack/vue-query';

export interface OptionItem {
  disabled?: boolean;
  label: any;
  value: number | string;
  [key: string]: any;
}

export interface FetchPageParams {
  KeyWords?: string;
  PageIndex: number;
  PageSize: number;
  [key: string]: any;
}

export interface PagedSelectOptions<T = any> {
  /** 获取分页数据的函数 */
  fetchPage: (
    params: FetchPageParams,
  ) => Promise<{ items?: T[]; total?: number; totalCount?: number }>;
  /** 将数据项转换为 Option 的函数 */
  mapItemToOption: (item: T) => OptionItem;
  /** 额外参数 ref，变化时触发重新请求（如 IndustryCategory） */
  extraParamsRef?: Ref<Record<string, any>>;
  /**
   * TanStack Query 缓存键前缀。
   * 提供此选项后，底层请求将通过 queryClient.fetchQuery 发起，
   * 相同键的并发请求自动合并为一次网络调用，结果在 staleTime 内从缓存直接返回，
   * 适用于在可编辑表格等多实例场景下共享同一数据源的 Select 组件。
   */
  queryKey?: readonly string[];
  /** 缓存有效时间（毫秒），仅在提供 queryKey 时生效，默认 5 分钟 */
  staleTime?: number;
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** 关键词搜索防抖时长（毫秒），默认 300，设为 0 关闭防抖 */
  searchDebounce?: number;
  /** 已选中项的 ref（用于编辑时回显不在第一页的数据） */
  selectedItemsRef?: Ref<T[]>;
  /** 当前选中值 ref，下拉关闭重置缓存时保留对应 option 以正确回显 label */
  selectedValuesRef?: Ref<any>;
  /** value 字段名，默认 'id' */
  valueKey?: string;
}

export interface UsePagedSelectReturn {
  /** 提供给 ApiComponent 的 api 函数 */
  api: () => Promise<OptionItem[]>;
  /** 从已加载缓存（含 pinned）中查找 option；命中说明无需再请求详情 */
  findCachedOption: (value: number | string) => OptionItem | undefined;
  /** 是否还有更多数据 */
  hasMore: ComputedRef<boolean>;
  /** 处理下拉框滚动，用于加载下一页 */
  handlePopupScroll: (e: Event) => void;
  /** 处理搜索，重置分页并搜索 */
  handleSearch: (keyword: string) => void;
  /** 下拉关闭时重置搜索词（与 Select 内部清空搜索框同步） */
  handleDropdownVisibleChange: (visible: boolean) => void;
  /** 是否正在加载更多 */
  loadingMore: Ref<boolean>;
  /**
   * 合并已选中项到缓存中。
   * `complete` 表示该数据字段齐全（如详情接口返回），可覆盖此前的精简回显项。
   */
  mergeSelectedItems: (items: any[], options?: { complete?: boolean }) => void;
  /** 从当前 options 中 pin 已选值 */
  pinSelectedFromOptions: (rawValue: any, options: OptionItem[]) => void;
  /** 计算属性：当前参数（用于触发 ApiComponent 重新请求） */
  params: ComputedRef<{
    keyword: string;
    pageIndex: number;
    pageSize: number;
  }>;
  /** 重置状态 */
  reset: () => void;
  /** 受控搜索框文本，需绑定到 Select searchValue */
  searchValue: Ref<string>;
}

/**
 * 分页下拉选择的组合式函数
 * 提供分页加载、关键字搜索、已选项回显等能力
 */
export function usePagedSelect<T = any>(
  options: PagedSelectOptions<T>,
): UsePagedSelectReturn {
  const {
    fetchPage,
    mapItemToOption,
    pageSize = 20,
    searchDebounce = 300,
    selectedItemsRef,
    selectedValuesRef,
    queryKey,
    staleTime = 5 * 60 * 1000,
    extraParamsRef,
  } = options;

  const queryClient = useQueryClient();

  // 内部状态
  const state = reactive({
    cache: new Map<number | string, OptionItem>(),
    keyword: '',
    loadingMore: false,
    openedOnce: false,
    optionsVersion: 0,
    pageIndex: 1,
    pageSize,
    queryVersion: 0,
    total: 0,
  });

  const { loadingMore } = toRefs(state);
  const searchValue = ref('');
  /** 已选 option 持久缓存（key 统一为 String(value)），下拉关闭重置分页时不丢失 label */
  const pinnedCache = new Map<string, OptionItem>();
  /** 字段齐全的 option value 集合（来自分页接口或详情接口），不可被精简回显项覆盖 */
  const completeValues = new Set<string>();

  const normalizeSelectedValues = (raw: any): Array<number | string> => {
    if (raw === undefined || raw === null || raw === '') return [];
    const list = Array.isArray(raw) ? raw : [raw];
    return list.filter(
      (value) => value !== undefined && value !== null && value !== '',
    );
  };

  const getPinnedOption = (value: number | string): OptionItem | undefined =>
    pinnedCache.get(String(value));

  const findCachedOption = (value: number | string): OptionItem | undefined => {
    const direct = state.cache.get(value) ?? getPinnedOption(value);
    if (direct) return direct;

    const asNumber = Number(value);
    if (!Number.isNaN(asNumber)) {
      return state.cache.get(asNumber);
    }

    return state.cache.get(String(value));
  };

  const pinOption = (option: OptionItem) => {
    if (option.value === undefined || option.value === null) return;
    pinnedCache.set(String(option.value), option);
  };

  const syncPinnedCacheWithSelection = () => {
    const activeValues = new Set(
      normalizeSelectedValues(selectedValuesRef?.value).map(String),
    );
    if (activeValues.size === 0) {
      pinnedCache.clear();
      return;
    }

    for (const [key, option] of pinnedCache) {
      if (
        !activeValues.has(String(key)) &&
        !activeValues.has(String(option.value))
      ) {
        pinnedCache.delete(key);
      }
    }
  };

  const restorePinnedToCache = () => {
    for (const option of pinnedCache.values()) {
      state.cache.set(option.value, option);
    }
  };

  /** 待生效的关键词定时器，用于防抖与取消 */
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  const cancelPendingSearch = () => {
    if (searchTimer === undefined) return;
    clearTimeout(searchTimer);
    searchTimer = undefined;
  };

  const applyKeyword = (keyword: string) => {
    if (keyword === state.keyword) return;
    state.keyword = keyword;
    reset();
    // params 变化会自动触发 ApiComponent 重新请求
  };

  /** 延迟应用关键词，连续输入只在停止后发一次请求 */
  const scheduleKeyword = (keyword: string) => {
    cancelPendingSearch();
    if (searchDebounce <= 0) {
      applyKeyword(keyword);
      return;
    }
    searchTimer = setTimeout(() => {
      searchTimer = undefined;
      applyKeyword(keyword);
    }, searchDebounce);
  };

  /**
   * 清空搜索词并重新拉取默认列表
   */
  const clearKeyword = () => {
    cancelPendingSearch();
    if (!state.keyword && !searchValue.value) return;
    state.keyword = '';
    searchValue.value = '';
    reset();
  };

  /**
   * 重置分页状态
   */
  const reset = () => {
    syncPinnedCacheWithSelection();

    state.pageIndex = 1;
    state.total = 0;
    state.cache.clear();

    // 搜索态下已选项不参与候选列表，避免与关键词无关的选项被固定在结果里
    if (!state.keyword) {
      restorePinnedToCache();
      if (pinnedCache.size > 0) {
        state.optionsVersion += 1;
      }
    }

    state.queryVersion += 1;
  };

  /**
   * 合并已选中项到缓存
   * 解决编辑时已选值不在第一页导致回显失败的问题
   */
  const mergeSelectedItems = (
    items: any[],
    mergeOptions?: { complete?: boolean },
  ) => {
    if (!items || items.length === 0) return;

    const complete = mergeOptions?.complete ?? false;
    // 搜索态下已选项只更新 pin（供关闭后回显），不注入候选列表
    const injectIntoOptions = !state.keyword;
    let hasNewOption = false;

    for (const item of items) {
      if (!item) continue;
      const option = mapItemToOption(item);
      if (option.value === undefined || option.value === null) continue;

      const key = String(option.value);
      // 已有字段齐全的数据时，不能被仅用于回显的精简项降级
      if (!complete && completeValues.has(key)) {
        const cached = findCachedOption(option.value);
        if (cached) {
          pinOption(cached);
          if (injectIntoOptions) state.cache.set(cached.value, cached);
          continue;
        }
      }

      if (complete) completeValues.add(key);
      pinOption(option);

      if (injectIntoOptions) {
        if (!state.cache.has(option.value)) hasNewOption = true;
        state.cache.set(option.value, option);
      }
    }

    if (hasNewOption) {
      state.optionsVersion += 1;
    }
  };

  /**
   * 从当前 options 中同步 pin 已选值（用于 change 早于 dropdown close 的场景）
   */
  const pinSelectedFromOptions = (rawValue: any, options: OptionItem[]) => {
    const injectIntoOptions = !state.keyword;
    for (const value of normalizeSelectedValues(rawValue)) {
      const matched =
        options.find((option) => String(option.value) === String(value)) ??
        findCachedOption(value);
      if (!matched) continue;
      pinOption(matched);
      if (injectIntoOptions) state.cache.set(matched.value, matched);
    }

    if (pinnedCache.size > 0) {
      state.optionsVersion += 1;
    }
  };

  /**
   * 提供给 ApiComponent 的 api 函数
   */
  const api = async (): Promise<OptionItem[]> => {
    const queryVersion = state.queryVersion;
    try {
      const fetchParams: FetchPageParams = {
        KeyWords: state.keyword || undefined,
        PageIndex: state.pageIndex,
        PageSize: state.pageSize,
        ...(extraParamsRef?.value ?? {}),
      };

      const res = queryKey
        ? await queryClient.fetchQuery({
            queryKey: [...queryKey, fetchParams],
            queryFn: () => fetchPage(fetchParams),
            staleTime,
          })
        : await fetchPage(fetchParams);

      // 搜索词或筛选项已变化时，丢弃旧请求结果，避免历史数据回灌
      if (queryVersion !== state.queryVersion) {
        return Array.from(state.cache.values());
      }

      // 兼容不同接口返回：total / totalCount
      const total =
        typeof res.total === 'number'
          ? res.total
          : typeof res.totalCount === 'number'
            ? res.totalCount
            : 0;
      state.total = total;

      // 将新数据合并到缓存
      for (const item of res.items ?? []) {
        const option = mapItemToOption(item);
        if (option.value !== undefined && option.value !== null) {
          const key = String(option.value);
          state.cache.set(option.value, option);
          completeValues.add(key);
          // 命中已选项时用接口的完整数据升级 pin，修正精简回显项缺字段的展示
          if (pinnedCache.has(key)) pinOption(option);
        }
      }

      // 搜索态只返回命中关键词的结果，已选项不再固定注入
      if (!state.keyword) {
        restorePinnedToCache();

        // 确保已选项始终在 options 中（解决回显问题）
        if (selectedItemsRef?.value) {
          mergeSelectedItems(selectedItemsRef.value);
        }
      }

      return Array.from(state.cache.values());
    } catch (error) {
      console.error('[usePagedSelect] fetch error:', error);
      return Array.from(state.cache.values());
    } finally {
      state.loadingMore = false;
    }
  };

  /**
   * 处理搜索：输入框即时回显，实际请求按 searchDebounce 防抖
   */
  const handleSearch = (nextKeyword: string) => {
    searchValue.value = nextKeyword ?? '';
    scheduleKeyword((nextKeyword ?? '').trim());
  };

  /**
   * Select 收起时会清空搜索框 UI，但不一定触发 search('');
   * 下拉关闭时同步重置内部 keyword，避免再次打开仍显示上次筛选结果。
   */
  const handleDropdownVisibleChange = (visible: boolean) => {
    if (!visible) {
      // Select 可能先触发 dropdown close 再触发 change，延迟重置避免丢失已选 label
      nextTick(() => {
        clearKeyword();
      });
    }
  };

  /**
   * 检查是否接近底部
   */
  const isNearBottom = (target: HTMLElement): boolean => {
    const { clientHeight, scrollHeight, scrollTop } = target;
    // 距离底部 50px 时触发加载
    return scrollHeight - scrollTop - clientHeight < 50;
  };

  /**
   * 处理下拉框滚动，实现滚动加载更多
   */
  const handlePopupScroll = (e: Event) => {
    const target = e.target as HTMLElement;
    if (!target) return;

    // 检查是否接近底部
    if (!isNearBottom(target)) return;

    // 检查是否还有更多数据
    if (state.cache.size >= state.total) return;

    // 防止重复加载
    if (state.loadingMore) return;

    state.loadingMore = true;
    state.pageIndex += 1;
    // params 变化会自动触发 ApiComponent 重新请求
  };

  /**
   * 计算属性：是否还有更多数据
   */
  const hasMore = computed(() => state.cache.size < state.total);

  /**
   * 计算属性：当前参数
   * ApiComponent 监听此参数变化来触发请求
   */
  const params = computed(() => ({
    keyword: state.keyword,
    optionsVersion: state.optionsVersion,
    pageIndex: state.pageIndex,
    pageSize: state.pageSize,
    ...(extraParamsRef?.value ?? {}),
  }));

  // 监听 selectedItemsRef 变化，自动合并
  if (selectedItemsRef) {
    watch(
      selectedItemsRef,
      (items) => {
        if (items && items.length > 0) {
          mergeSelectedItems(items);
        }
      },
      { immediate: true },
    );
  }

  if (selectedValuesRef) {
    watch(
      selectedValuesRef,
      (value) => {
        syncPinnedCacheWithSelection();
        if (value === undefined || value === null || value === '') return;

        for (const selectedValue of normalizeSelectedValues(value)) {
          const cached = findCachedOption(selectedValue);
          if (cached) {
            pinOption(cached);
            if (!state.keyword) state.cache.set(cached.value, cached);
          }
        }
      },
      { flush: 'sync' },
    );
  }

  // 监听 extraParamsRef 变化，重置并触发重新请求
  if (extraParamsRef) {
    watch(
      extraParamsRef,
      () => {
        reset();
      },
      { deep: true },
    );
  }

  if (getCurrentScope()) {
    onScopeDispose(cancelPendingSearch);
  }

  return {
    api,
    findCachedOption,
    hasMore,
    handleDropdownVisibleChange,
    handlePopupScroll,
    handleSearch,
    loadingMore,
    mergeSelectedItems,
    params,
    pinSelectedFromOptions,
    reset,
    searchValue,
  };
}
