<script lang="ts" setup>
import type {
  VxeGridDefines,
  VxeGridInstance,
  VxeGridListeners,
  VxeGridPropTypes,
  VxeGridProps as VxeTableGridProps,
  VxeToolbarPropTypes,
} from 'vxe-table';

import type { SetupContext } from 'vue';

import type { VbenFormProps } from '@vben-core/form-ui';

import type { ExtendedVxeGridApi, VxeGridProps } from './types';

import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  toRaw,
  useSlots,
  useTemplateRef,
  watch,
} from 'vue';

import { usePriorityValues } from '@vben/hooks';
import { EmptyIcon } from '@vben/icons';
import { $t } from '@vben/locales';
import { usePreferences } from '@vben/preferences';
import {
  cloneDeep,
  cn,
  isBoolean,
  isEqual,
  mergeWithArrayOverride,
} from '@vben/utils';

import { VbenHelpTooltip, VbenLoading } from '@vben-core/shadcn-ui';

import { VxeButton } from 'vxe-pc-ui';
import { VxeGrid, VxeUI } from 'vxe-table';

import { extendProxyOptions } from './extends';
import { useTableForm } from './init';

import 'vxe-table/styles/cssvar.scss';
import 'vxe-pc-ui/styles/cssvar.scss';
import './style.css';

interface Props extends VxeGridProps {
  api: ExtendedVxeGridApi;
}

const props = withDefaults(defineProps<Props>(), {});

const FORM_SLOT_PREFIX = 'form-';

const TOOLBAR_ACTIONS = 'toolbar-actions';
const TOOLBAR_TOOLS = 'toolbar-tools';
const TABLE_TITLE = 'table-title';

const gridRef = useTemplateRef<VxeGridInstance>('gridRef');

const state = props.api?.useStore?.();

const {
  gridOptions,
  class: className,
  gridClass,
  gridEvents,
  formOptions,
  columnPersist,
  tableTitle,
  tableTitleHelp,
  showSearchForm,
  separator,
} = usePriorityValues(props, state);

const { isMobile } = usePreferences();
const isSeparator = computed(() => {
  if (
    !formOptions.value ||
    showSearchForm.value === false ||
    separator.value === false
  ) {
    return false;
  }
  if (separator.value === true || separator.value === undefined) {
    return true;
  }
  return separator.value.show !== false;
});
const separatorBg = computed(() => {
  return !separator.value ||
    isBoolean(separator.value) ||
    !separator.value.backgroundColor
    ? undefined
    : separator.value.backgroundColor;
});
const slots: SetupContext['slots'] = useSlots();

const userSettingId = ref<number>();
const initializedColumns = ref(false);
const isApplyingColumnConfig = ref(false);
const persistTimer = ref<number>();
const columnUniqueKeyField = '_columnUniqueKey';
const columnDefaultVisibleField = '_columnDefaultVisible';
const columnDefaultFixedField = '_columnDefaultFixed';
const originalColumns = ref<any[]>([]);
const debugPrefix = '[vxe-column-persist]';
const debugStorageKey = '__debug_vxe_persist';

type ColumnPersistConfig = {
  visibleColumnKeys: string[];
  columnVisibility: Record<string, boolean>;
  columnFixed?: Record<string, '' | 'left' | 'right'>;
};

const resolvedTableId = computed(() => {
  const idFromProp = String(columnPersist.value?.tableId ?? '').trim();
  if (idFromProp) {
    return idFromProp;
  }
  const idFromGrid = String(gridOptions.value?.id ?? '').trim();
  if (idFromGrid) {
    return idFromGrid;
  }
  return '';
});

const userSettingKey = computed(() => `table_config_${resolvedTableId.value}`);
const legacyStorageKey = computed(
  () => `draggable_table_config_${resolvedTableId.value}`,
);
const fallbackStorageKey = computed(
  () => `fallback_table_config_${resolvedTableId.value}`,
);

function debugLog(message: string, payload?: Record<string, any>) {
  let enabled = false;
  try {
    enabled =
      typeof window !== 'undefined' &&
      ['1', 'true'].includes(
        String(
          window.localStorage?.getItem(debugStorageKey) ?? '',
        ).toLowerCase(),
      );
  } catch {
    enabled = false;
  }
  if (!enabled) {
    return;
  }
  if (payload) {
    console.log(`${debugPrefix} ${message}`, payload);
    return;
  }
  console.log(`${debugPrefix} ${message}`);
}

function summarizeColumns(columns: any[]) {
  return getLeafColumns(columns).map((column, index) => {
    const uniqueKey = column?.[columnUniqueKeyField] ?? column?.id ?? '';
    return {
      field: column?.field,
      fixed: normalizeFixedValue(column?.fixed),
      index,
      title: column?.title,
      uniqueKey,
      visible: column?.visible !== false,
    };
  });
}

function getColumnSignature(column: any) {
  const field = String(column?.field ?? '');
  const title = String(column?.title ?? '');
  const type = String(column?.type ?? '');
  return `${field}__${title}__${type}`;
}

function createStableKeyLookup(columns: any[]) {
  const lookup = new Map<string, string>();
  getLeafColumns(columns).forEach((column) => {
    const key = String(
      column?.[columnUniqueKeyField] ?? column?.id ?? '',
    ).trim();
    if (!key) {
      return;
    }
    lookup.set(getColumnSignature(column), key);
  });
  return lookup;
}

function normalizeFixedValue(value: unknown): '' | 'left' | 'right' {
  if (value === 'left' || value === 'right') {
    return value;
  }
  return '';
}

function buildColumnConfigFromColumns(columns: any[]): ColumnPersistConfig {
  const visibleColumnKeys: string[] = [];
  const columnVisibility: Record<string, boolean> = {};
  const columnFixed: Record<string, '' | 'left' | 'right'> = {};
  getLeafColumns(columns).forEach((column, index) => {
    const uniqueKey =
      column?.[columnUniqueKeyField] ??
      column?.id ??
      `col_${index}_${String(column?.field ?? column?.title ?? column?.type ?? 'column')}`;
    columnVisibility[uniqueKey] = column?.visible !== false;
    columnFixed[uniqueKey] = normalizeFixedValue(column?.fixed);
    if (column?.visible !== false) {
      visibleColumnKeys.push(uniqueKey);
    }
  });
  return { visibleColumnKeys, columnVisibility, columnFixed };
}

function isColumnPersistEnabled() {
  const enabled = columnPersist.value?.enabled;
  if (enabled === false) {
    return false;
  }
  if (enabled === true) {
    return true;
  }
  return !!gridOptions.value?.toolbarConfig?.custom;
}

function getLeafColumns(columns: any[] = [], result: any[] = []): any[] {
  for (const column of columns) {
    if (Array.isArray(column?.children) && column.children.length > 0) {
      getLeafColumns(column.children, result);
      continue;
    }
    result.push(column);
  }
  return result;
}

function normalizeColumns(columns: any[]) {
  const leafColumns = getLeafColumns(columns);
  leafColumns.forEach((column, index) => {
    const keyBase = column.field ?? column.title ?? column.type ?? 'column';
    const uniqueKey = `col_${index}_${String(keyBase)}`;
    column[columnUniqueKeyField] = uniqueKey;
    // 强制使用稳定 id，避免运行时随机 id 导致配置保存/加载 key 不一致
    column.id = uniqueKey;
    column[columnDefaultVisibleField] = column.visible !== false;
    column[columnDefaultFixedField] = normalizeFixedValue(column.fixed);
    if (column.visible === undefined) {
      column.visible = true;
    }
  });
}

function normalizeParsedConfig(config: any): ColumnPersistConfig | null {
  if (!config || typeof config !== 'object') {
    return null;
  }
  const visibleColumnKeys = Array.isArray(config.visibleColumnKeys)
    ? config.visibleColumnKeys.filter((key: unknown) => typeof key === 'string')
    : [];
  const columnVisibility: Record<string, boolean> = {};
  const columnFixed: Record<string, '' | 'left' | 'right'> = {};
  if (config.columnVisibility && typeof config.columnVisibility === 'object') {
    Object.entries(config.columnVisibility).forEach(([key, value]) => {
      if (typeof key === 'string') {
        columnVisibility[key] = value !== false;
      }
    });
  }
  if (config.columnFixed && typeof config.columnFixed === 'object') {
    Object.entries(config.columnFixed).forEach(([key, value]) => {
      if (typeof key === 'string') {
        columnFixed[key] = normalizeFixedValue(value);
      }
    });
  }
  return { visibleColumnKeys, columnVisibility, columnFixed };
}

function parseColumnConfig(rawSetting: string): ColumnPersistConfig | null {
  if (!rawSetting) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawSetting);
    return normalizeParsedConfig(parsed);
  } catch {
    return null;
  }
}

function applyColumnConfig(config: ColumnPersistConfig, columns: any[]) {
  debugLog('开始应用列配置', {
    config,
    columnsBeforeApply: summarizeColumns(columns),
  });
  const leafColumns = getLeafColumns(columns);
  const columnMap = new Map<string, any>();
  const visibleKeySet = new Set(config.visibleColumnKeys);
  const visibilityValues = Object.values(config.columnVisibility);
  const useVisibleKeysAsCompactVisibility =
    visibilityValues.length > 0 &&
    visibilityValues.every((val) => val === true);
  let matchedVisibilityCount = 0;
  let matchedOrderCount = 0;
  for (const column of leafColumns) {
    const key = column[columnUniqueKeyField] ?? column.id;
    if (!key) {
      continue;
    }
    columnMap.set(key, column);
  }

  for (const column of leafColumns) {
    const key = column[columnUniqueKeyField] ?? column.id;
    if (!key) {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(config.columnVisibility, key)) {
      column.visible = config.columnVisibility[key];
      matchedVisibilityCount++;
    } else if (useVisibleKeysAsCompactVisibility) {
      column.visible = visibleKeySet.has(String(key));
    } else {
      column.visible = column[columnDefaultVisibleField] !== false;
    }
    if (
      config.columnFixed &&
      Object.prototype.hasOwnProperty.call(config.columnFixed, key)
    ) {
      const fixed = normalizeFixedValue(config.columnFixed[key]);
      column.fixed = fixed || undefined;
    } else {
      const defaultFixed = normalizeFixedValue(column[columnDefaultFixedField]);
      column.fixed = defaultFixed || undefined;
    }
  }

  const orderedVisibleColumns: any[] = [];
  const orderedKeys = new Set<string>();
  for (const key of config.visibleColumnKeys) {
    const column = columnMap.get(key);
    if (column && column.visible !== false) {
      orderedVisibleColumns.push(column);
      orderedKeys.add(key);
      matchedOrderCount++;
    }
  }

  const appendedVisibleColumns = leafColumns.filter((column) => {
    const key = column[columnUniqueKeyField] ?? column.id;
    return column.visible !== false && key && !orderedKeys.has(key);
  });
  const hiddenColumns = leafColumns.filter(
    (column) => column.visible === false,
  );

  const finalColumns = [
    ...orderedVisibleColumns,
    ...appendedVisibleColumns,
    ...hiddenColumns,
  ];
  const topLevelColumns = columns.filter(
    (column) =>
      !Array.isArray(column?.children) || column.children.length === 0,
  );
  if (topLevelColumns.length === columns.length) {
    columns.splice(0, columns.length, ...finalColumns);
  }
  debugLog('列配置应用完成', {
    columnsAfterApply: summarizeColumns(columns),
    matchedOrderCount,
    matchedVisibilityCount,
  });
  return { matchedOrderCount, matchedVisibilityCount };
}

function collectColumnConfigFromGrid(): null | ColumnPersistConfig {
  const runtimeColumns = props.api.grid?.getColumns?.();
  if (!Array.isArray(runtimeColumns) || runtimeColumns.length === 0) {
    return null;
  }
  const stableSourceColumns =
    originalColumns.value.length > 0
      ? originalColumns.value
      : toRaw(gridOptions.value?.columns ?? []);
  const stableKeyLookup = createStableKeyLookup(stableSourceColumns);
  const runtimeVisibleKeys: string[] = [];
  const runtimeFixedMap = new Map<string, '' | 'left' | 'right'>();
  runtimeColumns.forEach((column: any, index: number) => {
    const uniqueKey =
      stableKeyLookup.get(getColumnSignature(column)) ??
      column?.[columnUniqueKeyField] ??
      column?.id ??
      `col_${index}_${String(column?.field ?? column?.title ?? column?.type ?? 'column')}`;
    runtimeFixedMap.set(uniqueKey, normalizeFixedValue(column?.fixed));
    if (column?.visible !== false) {
      runtimeVisibleKeys.push(uniqueKey);
    }
  });
  const visibleKeySet = new Set(runtimeVisibleKeys);
  const allColumns = getLeafColumns(stableSourceColumns);
  const columnVisibility: Record<string, boolean> = {};
  const columnFixed: Record<string, '' | 'left' | 'right'> = {};
  allColumns.forEach((column, index) => {
    const uniqueKey =
      column?.[columnUniqueKeyField] ??
      column?.id ??
      `col_${index}_${String(column?.field ?? column?.title ?? column?.type ?? 'column')}`;
    columnVisibility[uniqueKey] = visibleKeySet.has(uniqueKey);
    const fallbackFixed = normalizeFixedValue(column?.fixed);
    columnFixed[uniqueKey] = runtimeFixedMap.get(uniqueKey) ?? fallbackFixed;
  });
  return {
    visibleColumnKeys: runtimeVisibleKeys,
    columnVisibility,
    columnFixed,
  };
}

function buildResetDefaultColumns(columns: any[]) {
  const resetColumns = cloneDeep(columns);
  const leafColumns = getLeafColumns(resetColumns);
  leafColumns.forEach((column) => {
    column.visible = true;
    column.fixed = undefined;
  });
  return resetColumns;
}

function clearLocalStorageCache() {
  if (!resolvedTableId.value) {
    return;
  }
  localStorage.removeItem(legacyStorageKey.value);
  localStorage.removeItem(fallbackStorageKey.value);
  localStorage.removeItem(`fallback_${userSettingKey.value}`);
}

function saveFallbackConfig(rawSetting: string) {
  localStorage.setItem(fallbackStorageKey.value, rawSetting);
  localStorage.setItem(`fallback_${userSettingKey.value}`, rawSetting);
}

async function saveColumnConfig(config: ColumnPersistConfig) {
  if (!isColumnPersistEnabled() || !resolvedTableId.value) {
    debugLog('跳过保存：未启用或 tableId 为空', {
      enabled: isColumnPersistEnabled(),
      resolvedTableId: resolvedTableId.value,
    });
    return;
  }
  const rawSetting = JSON.stringify(config);
  const addApi = columnPersist.value?.add;
  const editApi = columnPersist.value?.edit;
  if (!addApi || !editApi) {
    debugLog('缺少远端保存接口，写入本地兜底', {
      userSettingKey: userSettingKey.value,
      rawSetting,
    });
    saveFallbackConfig(rawSetting);
    return;
  }
  try {
    debugLog('准备保存列配置', {
      hasUserSettingId: !!userSettingId.value,
      rawSetting,
      userSettingId: userSettingId.value,
      userSettingKey: userSettingKey.value,
    });
    if (userSettingId.value) {
      await editApi({
        id: userSettingId.value,
        name: userSettingKey.value,
        setting: rawSetting,
      });
    } else {
      userSettingId.value = await addApi({
        name: userSettingKey.value,
        setting: rawSetting,
      });
    }
    clearLocalStorageCache();
    debugLog('列配置保存成功', {
      userSettingId: userSettingId.value,
      userSettingKey: userSettingKey.value,
    });
  } catch (error) {
    debugLog('列配置保存失败，转本地兜底', {
      error,
      userSettingId: userSettingId.value,
      userSettingKey: userSettingKey.value,
    });
    columnPersist.value?.onError?.(error);
    saveFallbackConfig(rawSetting);
  }
}

function scheduleSaveColumnConfig() {
  if (!isColumnPersistEnabled() || isApplyingColumnConfig.value) {
    return;
  }
  if (persistTimer.value) {
    window.clearTimeout(persistTimer.value);
  }
  persistTimer.value = window.setTimeout(async () => {
    const config = collectColumnConfigFromGrid();
    if (!config) {
      debugLog('采集运行时列配置为空，跳过保存');
      return;
    }
    debugLog('采集运行时列配置', {
      config,
      runtimeColumns: summarizeColumns(props.api.grid?.getColumns?.() ?? []),
    });
    await saveColumnConfig(config);
  }, 120);
}

async function resetColumnConfig() {
  if (!isColumnPersistEnabled()) {
    return;
  }
  const removeApi = columnPersist.value?.remove;
  if (userSettingId.value && removeApi) {
    try {
      await removeApi({ id: userSettingId.value });
    } catch (error) {
      columnPersist.value?.onError?.(error);
    }
  }
  userSettingId.value = undefined;
  clearLocalStorageCache();
  if (originalColumns.value.length > 0) {
    const resetColumns = buildResetDefaultColumns(originalColumns.value);
    isApplyingColumnConfig.value = true;
    props.api.setGridOptions({
      columns: resetColumns,
    } as any);
    await nextTick();
    props.api.grid?.refreshColumn?.();
    isApplyingColumnConfig.value = false;
    debugLog('恢复默认列配置完成', {
      columnsAfterReset: summarizeColumns(resetColumns),
    });
  }
}

async function loadColumnConfig() {
  if (
    !isColumnPersistEnabled() ||
    !resolvedTableId.value ||
    initializedColumns.value
  ) {
    debugLog('跳过加载列配置', {
      enabled: isColumnPersistEnabled(),
      initializedColumns: initializedColumns.value,
      resolvedTableId: resolvedTableId.value,
    });
    return;
  }
  const rawColumns = toRaw(gridOptions.value?.columns ?? []);
  if (!Array.isArray(rawColumns) || rawColumns.length === 0) {
    debugLog('加载列配置失败：初始 columns 为空');
    return;
  }
  debugLog('准备加载列配置', {
    resolvedTableId: resolvedTableId.value,
    userSettingKey: userSettingKey.value,
    legacyStorageKey: legacyStorageKey.value,
    fallbackStorageKey: fallbackStorageKey.value,
    rawColumns: summarizeColumns(rawColumns),
  });
  normalizeColumns(rawColumns);
  debugLog('初始列归一化完成', {
    normalizedColumns: summarizeColumns(rawColumns),
  });
  originalColumns.value = cloneDeep(rawColumns);
  let hasApplied = false;
  const loadApi = columnPersist.value?.load;
  if (loadApi) {
    try {
      const remoteSetting = await loadApi({
        keyword: userSettingKey.value,
      });
      if (remoteSetting?.id) {
        userSettingId.value = remoteSetting.id;
      }
      debugLog('远端配置加载返回', {
        remoteSetting,
        userSettingId: userSettingId.value,
      });
      const remoteConfig = parseColumnConfig(remoteSetting?.setting ?? '');
      if (remoteConfig) {
        const applyResult = applyColumnConfig(remoteConfig, rawColumns);
        const hasRemoteKeys =
          remoteConfig.visibleColumnKeys.length > 0 ||
          Object.keys(remoteConfig.columnVisibility).length > 0;
        const isInvalidRemoteConfig =
          hasRemoteKeys &&
          applyResult.matchedOrderCount === 0 &&
          applyResult.matchedVisibilityCount === 0;
        if (isInvalidRemoteConfig) {
          debugLog('远端配置键与当前列全部不匹配，判定为历史脏配置，触发自愈', {
            remoteConfig,
            normalizedColumns: summarizeColumns(rawColumns),
          });
          const healedConfig = buildColumnConfigFromColumns(rawColumns);
          await saveColumnConfig(healedConfig);
          debugLog('已自愈覆盖远端配置', {
            healedConfig,
            userSettingId: userSettingId.value,
          });
        } else {
          hasApplied = true;
        }
      } else {
        debugLog('远端配置解析失败或为空', {
          remoteSetting: remoteSetting?.setting,
        });
      }
    } catch (error) {
      debugLog('远端配置加载异常', {
        error,
        userSettingKey: userSettingKey.value,
      });
      columnPersist.value?.onError?.(error);
    }
  }

  if (!hasApplied) {
    const localRaw =
      localStorage.getItem(legacyStorageKey.value) ??
      localStorage.getItem(fallbackStorageKey.value) ??
      localStorage.getItem(`fallback_${userSettingKey.value}`);
    const localConfig = parseColumnConfig(localRaw ?? '');
    if (localConfig) {
      debugLog('命中本地兜底配置', { localRaw, localConfig });
      applyColumnConfig(localConfig, rawColumns);
      hasApplied = true;
      if (columnPersist.value?.add) {
        try {
          userSettingId.value = await columnPersist.value.add({
            name: userSettingKey.value,
            setting: JSON.stringify(localConfig),
          });
          localStorage.removeItem(legacyStorageKey.value);
        } catch (error) {
          debugLog('本地配置回写远端失败', { error });
          columnPersist.value?.onError?.(error);
        }
      }
    } else {
      debugLog('未命中本地兜底配置', { localRaw });
    }
  }

  isApplyingColumnConfig.value = true;
  props.api.setGridOptions({
    columns: cloneDeep(rawColumns),
  } as any);
  await nextTick();
  props.api.grid?.refreshColumn?.();
  isApplyingColumnConfig.value = false;
  initializedColumns.value = true;
  debugLog('列配置加载流程结束', {
    hasApplied,
    userSettingId: userSettingId.value,
    finalColumns: summarizeColumns(rawColumns),
  });
}

const [Form, formApi] = useTableForm({
  compact: true,
  handleSubmit: async () => {
    const formValues = await formApi.getValues();
    formApi.setLatestSubmissionValues(toRaw(formValues));
    props.api.reload(formValues);
  },
  handleReset: async () => {
    const prevValues = await formApi.getValues();
    await formApi.resetForm();
    const formValues = await formApi.getValues();
    formApi.setLatestSubmissionValues(formValues);
    // 如果值发生了变化，submitOnChange会触发刷新。所以只在submitOnChange为false或者值没有发生变化时，手动刷新
    if (isEqual(prevValues, formValues) || !formOptions.value?.submitOnChange) {
      props.api.reload(formValues);
    }
  },
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  showCollapseButton: true,
  submitButtonOptions: {
    content: computed(() => $t('common.search')),
  },
  wrapperClass: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
});

const showTableTitle = computed(() => {
  return !!slots[TABLE_TITLE]?.() || tableTitle.value;
});

const showToolbar = computed(() => {
  return (
    !!slots[TOOLBAR_ACTIONS]?.() ||
    !!slots[TOOLBAR_TOOLS]?.() ||
    showTableTitle.value
  );
});

const toolbarOptions = computed(() => {
  const slotActions = slots[TOOLBAR_ACTIONS]?.();
  const slotTools = slots[TOOLBAR_TOOLS]?.();
  const searchBtn: VxeToolbarPropTypes.ToolConfig = {
    code: 'search',
    icon: 'vxe-icon-search',
    circle: true,
    status: showSearchForm.value ? 'primary' : undefined,
    title: showSearchForm.value
      ? $t('common.hideSearchPanel')
      : $t('common.showSearchPanel'),
  };
  // 将搜索按钮合并到用户配置的toolbarConfig.tools中
  const toolbarConfig: VxeGridPropTypes.ToolbarConfig = {
    tools: (gridOptions.value?.toolbarConfig?.tools ??
      []) as VxeToolbarPropTypes.ToolConfig[],
  };
  if (gridOptions.value?.toolbarConfig?.search && !!formOptions.value) {
    toolbarConfig.tools = Array.isArray(toolbarConfig.tools)
      ? [...toolbarConfig.tools, searchBtn]
      : [searchBtn];
  }

  if (!showToolbar.value) {
    return { toolbarConfig };
  }

  // 强制使用固定的toolbar配置，不允许用户自定义
  // 减少配置的复杂度，以及后续维护的成本
  toolbarConfig.slots = {
    ...(slotActions || showTableTitle.value
      ? { buttons: TOOLBAR_ACTIONS }
      : {}),
    ...(slotTools ? { tools: TOOLBAR_TOOLS } : {}),
  };
  return { toolbarConfig };
});

const options = computed(() => {
  const globalGridConfig = VxeUI?.getConfig()?.grid ?? {};

  const mergedOptions: VxeTableGridProps = cloneDeep(
    mergeWithArrayOverride(
      {},
      toRaw(toolbarOptions.value),
      toRaw(gridOptions.value),
      globalGridConfig,
    ),
  );

  if (mergedOptions.proxyConfig) {
    const { ajax } = mergedOptions.proxyConfig;
    mergedOptions.proxyConfig.enabled = !!ajax;
    // 不自动加载数据, 由组件控制
    mergedOptions.proxyConfig.autoLoad = false;
  }

  if (mergedOptions.pagerConfig) {
    const mobileLayouts = [
      'PrevJump',
      'PrevPage',
      'Number',
      'NextPage',
      'NextJump',
    ] as any;
    const layouts = [
      'Total',
      'Sizes',
      'Home',
      ...mobileLayouts,
      'End',
    ] as readonly string[];
    mergedOptions.pagerConfig = mergeWithArrayOverride(
      {},
      mergedOptions.pagerConfig,
      {
        pageSize: 20,
        background: true,
        pageSizes: [10, 20, 30, 50, 100, 200],
        className: 'mt-2 w-full',
        layouts: isMobile.value ? mobileLayouts : layouts,
        size: 'mini' as const,
      },
    );
  }
  if (mergedOptions.formConfig) {
    mergedOptions.formConfig.enabled = false;
  }
  return mergedOptions;
});

function onToolbarToolClick(event: VxeGridDefines.ToolbarToolClickEventParams) {
  if (event.code === 'search') {
    onSearchBtnClick();
  }
  (
    gridEvents.value?.toolbarToolClick as VxeGridListeners['toolbarToolClick']
  )?.(event);
}

function onSearchBtnClick() {
  props.api?.toggleSearchForm?.();
}

function onCustom(event: any) {
  scheduleSaveColumnConfig();
  (gridEvents.value as any)?.custom?.(event);
}

function onCustomChange(event: any) {
  scheduleSaveColumnConfig();
  (gridEvents.value as any)?.customChange?.(event);
}

async function onCustomReset(event: any) {
  await resetColumnConfig();
  (gridEvents.value as any)?.customReset?.(event);
}

function onColumnDropEnd(event: any) {
  scheduleSaveColumnConfig();
  (gridEvents.value as any)?.columnDropEnd?.(event);
}

const events = computed(() => {
  return {
    ...gridEvents.value,
    toolbarToolClick: onToolbarToolClick,
    custom: onCustom,
    customChange: onCustomChange,
    customReset: onCustomReset,
    columnDropEnd: onColumnDropEnd,
  };
});

const delegatedSlots = computed(() => {
  const resultSlots: string[] = [];

  for (const key of Object.keys(slots)) {
    if (
      !['empty', 'form', 'loading', TOOLBAR_ACTIONS, TOOLBAR_TOOLS].includes(
        key,
      )
    ) {
      resultSlots.push(key);
    }
  }
  return resultSlots;
});

const delegatedFormSlots = computed(() => {
  const resultSlots: string[] = [];

  for (const key of Object.keys(slots)) {
    if (key.startsWith(FORM_SLOT_PREFIX)) {
      resultSlots.push(key);
    }
  }
  return resultSlots.map((key) => key.replace(FORM_SLOT_PREFIX, ''));
});

const showDefaultEmpty = computed(() => {
  // 检查是否有原生的 VXE Table 空状态配置
  const hasEmptyText = options.value.emptyText !== undefined;
  const hasEmptyRender = options.value.emptyRender !== undefined;

  // 如果有原生配置，就不显示默认的空状态
  return !hasEmptyText && !hasEmptyRender;
});

async function init() {
  await loadColumnConfig();
  await nextTick();
  const globalGridConfig = VxeUI?.getConfig()?.grid ?? {};
  const defaultGridOptions: VxeTableGridProps = mergeWithArrayOverride(
    {},
    toRaw(gridOptions.value),
    toRaw(globalGridConfig),
  );
  // 内部主动加载数据，防止form的默认值影响
  const autoLoad = defaultGridOptions.proxyConfig?.autoLoad;
  const enableProxyConfig = options.value.proxyConfig?.enabled;
  if (enableProxyConfig && autoLoad) {
    props.api.grid.commitProxy?.(
      'query',
      formOptions.value ? ((await formApi.getValues()) ?? {}) : {},
    );
    // props.api.reload(formApi.form?.values ?? {});
  }

  // form 由 vben-form代替，所以不适配formConfig，这里给出警告
  const formConfig = gridOptions.value?.formConfig;
  // 处理某个页面加载多个Table时，第2个之后的Table初始化报出警告
  // 因为第一次初始化之后会把defaultGridOptions和gridOptions合并后缓存进State
  if (formConfig && formConfig.enabled) {
    console.warn(
      '[Vben Vxe Table]: The formConfig in the grid is not supported, please use the `formOptions` props',
    );
  }
  props.api?.setState?.({ gridOptions: defaultGridOptions as any });
  // form 由 vben-form 代替，所以需要保证query相关事件可以拿到参数
  extendProxyOptions(props.api, defaultGridOptions, () =>
    formApi.getLatestSubmissionValues(),
  );
}

// formOptions支持响应式
watch(
  formOptions,
  () => {
    formApi.setState((prev) => {
      const finalFormOptions: VbenFormProps = mergeWithArrayOverride(
        {},
        formOptions.value,
        prev,
      );
      return {
        ...finalFormOptions,
        collapseTriggerResize: !!finalFormOptions.showCollapseButton,
      };
    });
  },
  {
    immediate: true,
  },
);

const isCompactForm = computed(() => {
  return formApi.getState()?.compact;
});

onMounted(() => {
  props.api?.mount?.(gridRef.value, formApi);
  void init();
});

onUnmounted(() => {
  if (persistTimer.value) {
    window.clearTimeout(persistTimer.value);
    persistTimer.value = undefined;
  }
  formApi?.unmount?.();
  props.api?.unmount?.();
});
</script>

<template>
  <div :class="cn('bg-card h-full rounded-md', className)">
    <VxeGrid
      ref="gridRef"
      :class="
        cn(
          'p-2',
          {
            'pt-0': showToolbar && !formOptions,
          },
          gridClass,
        )
      "
      v-bind="options"
      v-on="events"
    >
      <!-- 左侧操作区域或者title -->
      <template v-if="showToolbar" #toolbar-actions="slotProps">
        <slot v-if="showTableTitle" name="table-title">
          <div class="mr-1 pl-1 text-[1rem]">
            {{ tableTitle }}
            <VbenHelpTooltip v-if="tableTitleHelp" trigger-class="pb-1">
              {{ tableTitleHelp }}
            </VbenHelpTooltip>
          </div>
        </slot>
        <slot name="toolbar-actions" v-bind="slotProps"> </slot>
      </template>

      <!-- 继承默认的slot -->
      <template
        v-for="slotName in delegatedSlots"
        :key="slotName"
        #[slotName]="slotProps"
      >
        <slot :name="slotName" v-bind="slotProps"></slot>
      </template>
      <template #toolbar-tools="slotProps">
        <slot name="toolbar-tools" v-bind="slotProps"></slot>
        <VxeButton
          icon="vxe-icon-search"
          circle
          class="ml-2"
          v-if="gridOptions?.toolbarConfig?.search && !!formOptions"
          :status="showSearchForm ? 'primary' : undefined"
          :title="$t('common.search')"
          @click="onSearchBtnClick"
        />
      </template>

      <!-- form表单 -->
      <template #form>
        <div
          v-if="formOptions"
          v-show="showSearchForm !== false"
          :class="
            cn(
              'relative rounded py-3',
              isCompactForm
                ? isSeparator
                  ? 'pb-8'
                  : 'pb-4'
                : isSeparator
                  ? 'pb-4'
                  : 'pb-0',
            )
          "
        >
          <slot name="form">
            <Form>
              <template
                v-for="slotName in delegatedFormSlots"
                :key="slotName"
                #[slotName]="slotProps"
              >
                <slot
                  :name="`${FORM_SLOT_PREFIX}${slotName}`"
                  v-bind="slotProps"
                ></slot>
              </template>
              <template #reset-before="slotProps">
                <slot name="reset-before" v-bind="slotProps"></slot>
              </template>
              <template #submit-before="slotProps">
                <slot name="submit-before" v-bind="slotProps"></slot>
              </template>
              <template #expand-before="slotProps">
                <slot name="expand-before" v-bind="slotProps"></slot>
              </template>
              <template #expand-after="slotProps">
                <slot name="expand-after" v-bind="slotProps"></slot>
              </template>
            </Form>
          </slot>
          <div
            v-if="isSeparator"
            :style="{
              ...(separatorBg ? { backgroundColor: separatorBg } : undefined),
            }"
            class="bg-background-deep z-100 absolute -left-2 bottom-1 h-2 w-[calc(100%+1rem)] overflow-hidden md:bottom-2 md:h-3"
          ></div>
        </div>
      </template>
      <!-- loading -->
      <template #loading>
        <slot name="loading">
          <VbenLoading :spinning="true" />
        </slot>
      </template>
      <!-- 统一控状态 -->
      <template v-if="showDefaultEmpty" #empty>
        <slot name="empty">
          <EmptyIcon class="mx-auto" />
          <div class="mt-2">{{ $t('common.noData') }}</div>
        </slot>
      </template>
    </VxeGrid>
  </div>
</template>
