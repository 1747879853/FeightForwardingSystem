import type { GroupFieldDef, GroupItem } from './types';

import { computed, ref, shallowRef } from 'vue';

interface UseListGroupingOptions<TField extends number = number> {
  /** 可选分组字段定义 */
  fields: GroupFieldDef<TField>[];
  /**
   * 拉取分组数据：入参为「当前搜索条件（已映射的列表查询参数，不含分组筛选）」+ 分组字段。
   * 由调用方负责拼接后端接口（带上 GroupField）。
   */
  fetchGroups: (
    baseParams: Record<string, any>,
    field: TField,
  ) => Promise<GroupItem[]>;
  /** 获取 gridApi（用于触发列表查询） */
  getGridApi: () => any;
}

/** 计算搜索条件签名，用于判断「顶部搜索条件是否手动变更」 */
function buildSignature(params: Record<string, any>): string {
  const entries = Object.keys(params)
    .filter((key) => {
      const value = params[key];
      return value !== undefined && value !== null && value !== '';
    })
    .sort()
    .map((key) => [key, params[key]]);
  return JSON.stringify(entries);
}

/**
 * 列表分组统计通用逻辑。
 *
 * 行为约定（与需求一致）：
 * - 同时只能启用一个分组字段；
 * - 启用某分组后，互斥地禁用并清空对应搜索项（分组与搜索互斥）；
 * - 分组数据仅在「顶部搜索条件手动变更」时刷新，点击分组项只重查列表、不刷新分组；
 * - 点击分组项后，列表查询追加该分组项条件（如起运港 id），分组项与「全部」互斥。
 */
export function useListGrouping<TField extends number = number>(
  options: UseListGroupingOptions<TField>,
) {
  const { fields, fetchGroups, getGridApi } = options;

  /** 当前启用的分组字段（undefined 表示不分组） */
  const enabledField = shallowRef<GroupFieldDef<TField> | undefined>(undefined);
  /** 分组数据 */
  const groupItems = ref<GroupItem[]>([]);
  /** 当前选中的分组项 id（undefined 表示「全部」，即未点击任何分组项） */
  const selectedItemId = ref<null | number | string | undefined>(undefined);
  /** 分组数据加载中 */
  const loading = ref(false);

  /** 最近一次刷新分组时的搜索条件签名；undefined 表示需要强制刷新 */
  let lastSignature: string | undefined;
  /** 当前因启用分组而被禁用的搜索项字段名 */
  let disabledSearchField: string | undefined;
  /** 用于丢弃过期的分组请求结果 */
  let fetchToken = 0;

  const isGrouping = computed(() => !!enabledField.value);

  function getFormApi(): any {
    return getGridApi()?.formApi;
  }

  /** 禁用并清空互斥的搜索项 */
  function disableSearchField(field: GroupFieldDef<TField>) {
    const target = field.searchField ?? field.paramKey;
    const formApi = getFormApi();
    if (!formApi || !target) {
      return;
    }
    disabledSearchField = target;
    formApi.updateSchema([
      { fieldName: target, componentProps: { disabled: true } },
    ]);
    formApi.setFieldValue?.(target, undefined);
  }

  /** 恢复之前被禁用的搜索项 */
  function restoreSearchField() {
    if (!disabledSearchField) {
      return;
    }
    const formApi = getFormApi();
    formApi?.updateSchema?.([
      {
        fieldName: disabledSearchField,
        componentProps: { disabled: false },
      },
    ]);
    disabledSearchField = undefined;
  }

  async function refreshGroups(baseParams: Record<string, any>) {
    const field = enabledField.value;
    if (!field) {
      groupItems.value = [];
      return;
    }
    const token = ++fetchToken;
    loading.value = true;
    try {
      const items = await fetchGroups({ ...baseParams }, field.value);
      if (token === fetchToken) {
        groupItems.value = Array.isArray(items) ? items : [];
      }
    } finally {
      if (token === fetchToken) {
        loading.value = false;
      }
    }
  }

  /**
   * 在列表查询 `mapParams` 末尾调用：
   * 1. 若搜索条件相对上次发生变化 -> 刷新分组数据 + 重置选中项；
   * 2. 追加当前选中分组项的筛选条件。
   */
  function decorateListParams(
    listParams: Record<string, any>,
  ): Record<string, any> {
    const field = enabledField.value;
    if (!field) {
      return listParams;
    }

    const signature = buildSignature(listParams);
    if (signature !== lastSignature) {
      lastSignature = signature;
      selectedItemId.value = undefined;
      void refreshGroups(listParams);
    }

    if (selectedItemId.value === undefined || selectedItemId.value === null) {
      return listParams;
    }
    return { ...listParams, [field.paramKey]: selectedItemId.value };
  }

  /** 启用分组字段（切换或首次启用） */
  function enableField(value: TField) {
    const field = fields.find((item) => item.value === value);
    if (!field) {
      return;
    }
    restoreSearchField();
    enabledField.value = field;
    selectedItemId.value = undefined;
    groupItems.value = [];
    // 强制下一次 decorate 刷新分组数据
    lastSignature = undefined;
    disableSearchField(field);
    getGridApi()?.query?.();
  }

  /** 关闭分组 */
  function disable() {
    restoreSearchField();
    enabledField.value = undefined;
    selectedItemId.value = undefined;
    groupItems.value = [];
    lastSignature = undefined;
    getGridApi()?.query?.();
  }

  /** 点击分组项（id 为 undefined 表示「全部」） */
  function selectItem(id: null | number | string | undefined) {
    if (selectedItemId.value === id) {
      return;
    }
    selectedItemId.value = id;
    getGridApi()?.query?.();
  }

  return {
    fields,
    enabledField,
    isGrouping,
    groupItems,
    selectedItemId,
    loading,
    decorateListParams,
    enableField,
    disable,
    selectItem,
  };
}

export type ListGroupingReturn = ReturnType<typeof useListGrouping>;
