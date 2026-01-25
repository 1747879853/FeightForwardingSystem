import type { ComputedRef, Ref } from 'vue';

import { computed, reactive, toRefs, watch } from 'vue';

export interface OptionItem {
  disabled?: boolean;
  label: string;
  value: number | string;
  [key: string]: any;
}

export interface PagedSelectOptions<T = any> {
  /** 获取分页数据的函数 */
  fetchPage: (params: {
    KeyWords?: string;
    PageIndex: number;
    PageSize: number;
  }) => Promise<{ items: T[]; total: number }>;
  /** 将数据项转换为 Option 的函数 */
  mapItemToOption: (item: T) => OptionItem;
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** 已选中项的 ref（用于编辑时回显不在第一页的数据） */
  selectedItemsRef?: Ref<T[]>;
  /** value 字段名，默认 'id' */
  valueKey?: string;
}

export interface UsePagedSelectReturn {
  /** 提供给 ApiComponent 的 api 函数 */
  api: () => Promise<OptionItem[]>;
  /** 是否还有更多数据 */
  hasMore: ComputedRef<boolean>;
  /** 处理下拉框滚动，用于加载下一页 */
  handlePopupScroll: (e: Event) => void;
  /** 处理搜索，重置分页并搜索 */
  handleSearch: (keyword: string) => void;
  /** 是否正在加载更多 */
  loadingMore: Ref<boolean>;
  /** 合并已选中项到缓存中 */
  mergeSelectedItems: (items: any[]) => void;
  /** 计算属性：当前参数（用于触发 ApiComponent 重新请求） */
  params: ComputedRef<{
    keyword: string;
    pageIndex: number;
    pageSize: number;
  }>;
  /** 重置状态 */
  reset: () => void;
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
    selectedItemsRef,
    valueKey = 'id',
  } = options;

  // 内部状态
  const state = reactive({
    cache: new Map<number | string, OptionItem>(),
    keyword: '',
    loadingMore: false,
    openedOnce: false,
    pageIndex: 1,
    pageSize,
    total: 0,
  });

  const { loadingMore } = toRefs(state);

  /**
   * 重置分页状态
   */
  const reset = () => {
    state.pageIndex = 1;
    state.total = 0;
    state.cache.clear();
  };

  /**
   * 合并已选中项到缓存
   * 解决编辑时已选值不在第一页导致回显失败的问题
   */
  const mergeSelectedItems = (items: any[]) => {
    if (!items || items.length === 0) return;

    for (const item of items) {
      if (!item) continue;
      const option = mapItemToOption(item);
      if (option.value !== undefined && option.value !== null) {
        state.cache.set(option.value, option);
      }
    }
  };

  /**
   * 提供给 ApiComponent 的 api 函数
   */
  const api = async (): Promise<OptionItem[]> => {
    try {
      const res = await fetchPage({
        KeyWords: state.keyword || undefined,
        PageIndex: state.pageIndex,
        PageSize: state.pageSize,
      });

      state.total = res.total;

      // 将新数据合并到缓存
      for (const item of res.items) {
        const option = mapItemToOption(item);
        if (option.value !== undefined && option.value !== null) {
          state.cache.set(option.value, option);
        }
      }

      // 确保已选项始终在 options 中（解决回显问题）
      if (selectedItemsRef?.value) {
        mergeSelectedItems(selectedItemsRef.value);
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
   * 处理搜索
   */
  const handleSearch = (nextKeyword: string) => {
    const keyword = nextKeyword?.trim() ?? '';
    if (keyword === state.keyword) return;

    state.keyword = keyword;
    reset();
    // params 变化会自动触发 ApiComponent 重新请求
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
    pageIndex: state.pageIndex,
    pageSize: state.pageSize,
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

  return {
    api,
    hasMore,
    handlePopupScroll,
    handleSearch,
    loadingMore,
    mergeSelectedItems,
    params,
    reset,
  };
}
