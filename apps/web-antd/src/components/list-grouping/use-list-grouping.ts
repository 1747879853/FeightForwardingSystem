import type { GroupFieldDef, GroupItem } from './types';

import { computed, ref, shallowRef } from 'vue';

/**
 * 分组字段持久化适配（由调用方注入，通常基于用户设置接口）。
 * 仅持久化「启用的分组字段」，不持久化选中的分组项（分组项随搜索条件刷新）。
 */
export interface ListGroupingPersist<TField extends number = number> {
  /** 读取已保存的分组字段值；无则返回 null/undefined */
  load: () => Promise<TField | null | undefined> | TField | null | undefined;
  /** 保存当前分组字段值（undefined 表示不分组） */
  save: (fieldValue: TField | undefined) => void;
}

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
  /** 分组字段持久化（可选）；提供后会在挂载时恢复、切换时保存 */
  persist?: ListGroupingPersist<TField>;
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
  const { fields, fetchGroups, getGridApi, persist } = options;

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
  /** 最近一次列表查询使用的基础搜索参数（供「重新进入列表」时刷新分组复用） */
  let lastBaseParams: Record<string, any> = {};
  /** 当前因启用分组而被禁用的搜索项字段名 */
  let disabledSearchField: string | undefined;
  /** 被禁用搜索项的原始 componentProps / help，恢复时完整还原 */
  let disabledFieldOriginal:
    | { componentProps?: unknown; help?: unknown }
    | undefined;
  /** 用于丢弃过期的分组请求结果 */
  let fetchToken = 0;

  const isGrouping = computed(() => !!enabledField.value);

  function getFormApi(): any {
    return getGridApi()?.formApi;
  }

  /**
   * 禁用并清空互斥的搜索项。
   * 为了让用户直观知道「该项是因为开启分组才不可用」，除置灰外还会：
   * - 将 placeholder 替换为「已按『X』分组」内联提示；
   * - 在 label 旁挂帮助图标（help），说明原因与恢复方式。
   * 原始 placeholder / help 会被记录，关闭分组时还原。
   */
  function disableSearchField(field: GroupFieldDef<TField>) {
    const target = field.searchField ?? field.paramKey;
    const formApi = getFormApi();
    if (!formApi || !target) {
      return;
    }
    const schemaItem = (formApi.state?.schema ?? []).find(
      (item: any) => item.fieldName === target,
    );
    const originalComponentProps = schemaItem?.componentProps;
    disabledFieldOriginal = {
      componentProps: originalComponentProps,
      help: schemaItem?.help,
    };
    disabledSearchField = target;
    const groupingProps = {
      disabled: true,
      placeholder: `已按「${field.label}」分组`,
    };
    const disabledComponentProps =
      typeof originalComponentProps === 'function'
        ? (...args: any[]) => ({
            ...(originalComponentProps(...args) ?? {}),
            ...groupingProps,
          })
        : {
            ...((originalComponentProps ?? {}) as Record<string, unknown>),
            ...groupingProps,
          };
    formApi.updateSchema([
      {
        fieldName: target,
        help: `该条件已作为「${field.label}」分组维度，暂不可筛选；关闭分组后可恢复。`,
        componentProps: disabledComponentProps,
      },
    ]);
    formApi.setFieldValue?.(target, undefined);
  }

  /** 恢复之前被禁用的搜索项（含 placeholder / help 还原） */
  function restoreSearchField() {
    if (!disabledSearchField) {
      return;
    }
    const formApi = getFormApi();
    formApi?.updateSchema?.([
      {
        fieldName: disabledSearchField,
        // merge 基于 defu 会忽略 undefined（保留旧值），故用空字符串兜底覆盖，
        // 确保帮助图标与分组提示 placeholder 都能被清掉。
        help: (disabledFieldOriginal?.help ?? '') as any,
        componentProps: disabledFieldOriginal?.componentProps ?? {},
      },
    ]);
    disabledSearchField = undefined;
    disabledFieldOriginal = undefined;
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
   *
   * 选中项三态：
   * - `undefined`：未点击任何分组项（「全部」），不追加筛选；
   * - `null`：选中「未填写」分组项，追加 `{ [emptyParamKey]: true }`（需字段配置 `emptyParamKey`）；
   * - 具体值：追加 `{ [paramKey]: 值 }`。
   */
  function decorateListParams(
    listParams: Record<string, any>,
  ): Record<string, any> {
    const field = enabledField.value;
    if (!field) {
      return listParams;
    }

    lastBaseParams = { ...listParams };
    const signature = buildSignature(listParams);
    if (signature !== lastSignature) {
      lastSignature = signature;
      selectedItemId.value = undefined;
      void refreshGroups(listParams);
    }

    // 「全部」：未点击任何分组项
    if (selectedItemId.value === undefined) {
      return listParams;
    }
    // 「未填写」分组项：传对应字段的 *Empty=true
    if (selectedItemId.value === null) {
      return field.emptyParamKey
        ? { ...listParams, [field.emptyParamKey]: true }
        : listParams;
    }
    // 具体分组值
    return { ...listParams, [field.paramKey]: selectedItemId.value };
  }

  /**
   * 启用分组字段（内部）。
   * - `shouldPersist`：是否写入持久化；
   * - `skipQuery`：是否跳过触发列表查询（用于「挂载时恢复」场景，
   *   由调用方在写入表单默认值后统一触发首查，避免竞态导致分组数据拉取不到）。
   */
  function applyField(
    value: TField,
    shouldPersist: boolean,
    skipQuery = false,
  ) {
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
    if (shouldPersist) {
      persist?.save(value);
    }
    if (!skipQuery) {
      getGridApi()?.query?.();
    }
  }

  /** 启用分组字段（切换或首次启用） */
  function enableField(value: TField) {
    applyField(value, true);
  }

  /**
   * 恢复已持久化的分组字段（仅设置状态，不触发列表查询）。
   * 由列表页在挂载时于「写入表单默认值之后、首次查询之前」调用，
   * 使首次查询即带上分组字段，从而在同一次查询中拉取分组数据。
   */
  async function restorePersistedField(): Promise<void> {
    if (!persist) {
      return;
    }
    try {
      const saved = await persist.load();
      if (saved == null || enabledField.value) {
        return;
      }
      if (fields.some((item) => item.value === saved)) {
        applyField(saved, false, true);
      }
    } catch {
      // 恢复失败不影响列表正常使用
    }
  }

  /** 关闭分组 */
  function disable() {
    restoreSearchField();
    enabledField.value = undefined;
    selectedItemId.value = undefined;
    groupItems.value = [];
    lastSignature = undefined;
    persist?.save(undefined);
    getGridApi()?.query?.();
  }

  /**
   * 强制刷新分组数据（不改变选中项）。
   * 用于「重新进入列表页」等场景：分组统计不做缓存，每次进入都拉取最新数据。
   * 复用最近一次列表查询的搜索参数，未启用分组时不做任何事。
   */
  function refreshGroupData() {
    if (!enabledField.value) {
      return;
    }
    void refreshGroups(lastBaseParams);
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
    refreshGroupData,
    restorePersistedField,
  };
}

export type ListGroupingReturn = ReturnType<typeof useListGrouping>;
