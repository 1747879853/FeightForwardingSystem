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
  searchPersist,
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
const searchPersistTimer = ref<number>();
const persistSaveTrigger = ref('unknown');
const columnUniqueKeyField = '_columnUniqueKey';
const columnDefaultVisibleField = '_columnDefaultVisible';
const columnDefaultFixedField = '_columnDefaultFixed';
const columnDefaultWidthField = '_columnDefaultWidth';
const columnBaselineWidthField = '_columnBaselineWidth';
const COLUMN_WIDTH_DIFF_THRESHOLD = 1;
const originalColumns = ref<any[]>([]);
const baselineWidthsCaptured = ref(false);
/** 保持下发 columns 引用稳定的缓存（签名一致时复用同一数组引用，避免 vxe 重载列） */
let stableBoundColumnsSignature: string | undefined;
let stableBoundColumns: any[] | undefined;
const searchFieldOptions = ref<SearchFieldOption[]>([]);
const initializedSearchFields = ref(false);
const isApplyingSearchFieldConfig = ref(false);
const showSearchFieldPopover = ref(false);
const draggingSearchFieldName = ref('');
const searchFieldPopoverContainerRef = useTemplateRef<HTMLElement>(
  'searchFieldPopoverContainerRef',
);
const debugPrefix = '[vxe-column-persist]';
const debugStorageKey = '__debug_vxe_persist';

type ColumnPersistDebugInfo = {
  savedAt: string;
  tableId: string;
  userSettingKey: string;
  trigger: string;
  totals: {
    stableColumnCount: number;
    getColumnsCount: number;
    getFullColumnsCount: number;
    visibleInConfig: number;
    hiddenInConfig: number;
  };
  keyMapping: {
    fullColumnsSignatureMatched: number;
    fullColumnsColumnKeyMatched: number;
    fullColumnsFallbackMatched: number;
    visibleKeysNotInStableColumns: number;
  };
  flags: {
    suspicious: boolean;
    isApplyingColumnConfig: boolean;
    initializedColumns: boolean;
  };
  /** localStorage.__debug_vxe_persist=1 时附带完整快照 */
  verbose?: Record<string, unknown>;
};

type ColumnPersistConfig = {
  visibleColumnKeys: string[];
  columnVisibility: Record<string, boolean>;
  columnFixed?: Record<string, '' | 'left' | 'right'>;
  columnWidths?: Record<string, number>;
  _debug?: ColumnPersistDebugInfo;
};

type SearchFieldPersistConfig = {
  fieldVisibility: Record<string, boolean>;
  fieldOrder: string[];
  visibleFieldNames: string[];
};

type SearchFieldOption = {
  defaultVisible: boolean;
  fieldName: string;
  label: string;
  visible: boolean;
};

const resolvedTableId = computed(() => {
  const idFromColumnPersist = String(columnPersist.value?.tableId ?? '').trim();
  if (idFromColumnPersist) {
    return idFromColumnPersist;
  }
  const idFromSearchPersist = String(searchPersist.value?.tableId ?? '').trim();
  if (idFromSearchPersist) {
    return idFromSearchPersist;
  }
  const idFromGrid = String(gridOptions.value?.id ?? '').trim();
  if (idFromGrid) {
    return idFromGrid;
  }
  return '';
});

const userSettingKey = computed(() => `table_config_${resolvedTableId.value}`);
const searchUserSettingKey = computed(
  () => `search_form_config_${resolvedTableId.value}`,
);
const legacyStorageKey = computed(
  () => `draggable_table_config_${resolvedTableId.value}`,
);
const fallbackStorageKey = computed(
  () => `fallback_table_config_${resolvedTableId.value}`,
);
const searchFallbackStorageKey = computed(
  () => `fallback_${searchUserSettingKey.value}`,
);
const searchUserSettingId = ref<number>();

function isDebugPersistEnabled() {
  try {
    return (
      typeof window !== 'undefined' &&
      ['1', 'true'].includes(
        String(
          window.localStorage?.getItem(debugStorageKey) ?? '',
        ).toLowerCase(),
      )
    );
  } catch {
    return false;
  }
}

function debugLog(message: string, payload?: Record<string, any>) {
  if (!isDebugPersistEnabled()) {
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

function resolveStableColumnKeyMeta(
  column: any,
  stableKeyLookup: Map<string, string>,
  index = 0,
) {
  const signature = getColumnSignature(column);
  const fromLookup = stableKeyLookup.get(signature);
  if (fromLookup) {
    return {
      key: fromLookup,
      match: 'signature' as const,
      signature,
    };
  }
  const fromColumn = String(
    column?.[columnUniqueKeyField] ?? column?.id ?? '',
  ).trim();
  if (fromColumn) {
    return {
      key: fromColumn,
      match: 'columnKey' as const,
      signature,
    };
  }
  return {
    key: `col_${index}_${String(column?.field ?? column?.title ?? column?.type ?? 'column')}`,
    match: 'fallback' as const,
    signature,
  };
}

function resolveStableColumnKey(
  column: any,
  stableKeyLookup: Map<string, string>,
  index = 0,
): string {
  return resolveStableColumnKeyMeta(column, stableKeyLookup, index).key;
}

function buildColumnPersistDebug(
  config: ColumnPersistConfig,
  trigger: string,
  context: {
    getColumnsCount: number;
    getFullColumnsCount: number;
    keyMapping: ColumnPersistDebugInfo['keyMapping'];
    suspicious?: boolean;
    verbose?: Record<string, unknown>;
  },
): ColumnPersistDebugInfo {
  const hiddenInConfig = Object.values(config.columnVisibility).filter(
    (visible) => visible === false,
  ).length;
  const debugInfo: ColumnPersistDebugInfo = {
    savedAt: new Date().toISOString(),
    tableId: resolvedTableId.value,
    userSettingKey: userSettingKey.value,
    trigger,
    totals: {
      stableColumnCount: Object.keys(config.columnVisibility).length,
      getColumnsCount: context.getColumnsCount,
      getFullColumnsCount: context.getFullColumnsCount,
      visibleInConfig: config.visibleColumnKeys.length,
      hiddenInConfig,
    },
    keyMapping: context.keyMapping,
    flags: {
      suspicious: context.suspicious === true,
      isApplyingColumnConfig: isApplyingColumnConfig.value,
      initializedColumns: initializedColumns.value,
    },
  };
  if (context.verbose) {
    debugInfo.verbose = context.verbose;
  }
  return debugInfo;
}

function saveBlockedColumnPersistDebug(
  trigger: string,
  reason: string,
  config: ColumnPersistConfig,
  debugInfo: ColumnPersistDebugInfo,
) {
  if (!resolvedTableId.value) {
    return;
  }
  try {
    const payload = JSON.stringify({
      blockedAt: debugInfo.savedAt,
      reason,
      trigger,
      tableId: resolvedTableId.value,
      userSettingKey: userSettingKey.value,
      config,
      _debug: debugInfo,
    });
    localStorage.setItem(`fallback_debug_${userSettingKey.value}`, payload);
  } catch {
    // ignore quota errors
  }
}

/** vxe 4.17+：getColumns() 仅返回 visibleColumn，显隐采集须用 getFullColumns */
function getRuntimeFullColumns(): any[] {
  const grid = props.api.grid as any;
  if (!grid) {
    return [];
  }
  const fullColumns = grid.getFullColumns?.();
  if (Array.isArray(fullColumns) && fullColumns.length > 0) {
    return fullColumns;
  }
  const tableColumn = grid.getTableColumn?.();
  if (
    Array.isArray(tableColumn?.fullColumn) &&
    tableColumn.fullColumn.length > 0
  ) {
    return tableColumn.fullColumn;
  }
  const visibleColumns = grid.getColumns?.();
  return Array.isArray(visibleColumns) ? visibleColumns : [];
}

function isSuspiciousColumnPersistConfig(
  config: ColumnPersistConfig,
  totalColumnCount: number,
): boolean {
  const visibleCount = config.visibleColumnKeys.length;
  if (totalColumnCount < 3 || visibleCount === 0) {
    return visibleCount === 0;
  }
  const onlyKey = String(config.visibleColumnKeys[0] ?? '');
  const onlyCheckboxVisible =
    visibleCount === 1 &&
    totalColumnCount > 5 &&
    (onlyKey.includes('checkbox') || onlyKey.endsWith('_checkbox'));
  if (onlyCheckboxVisible) {
    return true;
  }
  const hiddenCount = Object.values(config.columnVisibility).filter(
    (visible) => visible === false,
  ).length;
  return (
    totalColumnCount > 5 &&
    visibleCount <= 1 &&
    hiddenCount >= totalColumnCount - 1
  );
}

function normalizeFixedValue(value: unknown): '' | 'left' | 'right' {
  if (value === 'left' || value === 'right') {
    return value;
  }
  return '';
}

function resolveNumericWidth(value: unknown): number | undefined {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return undefined;
  }
  return Math.round(num);
}

function resolveRuntimeColumnWidth(column: any): number | undefined {
  const resizeWidth = resolveNumericWidth(column?.resizeWidth);
  if (resizeWidth !== undefined) {
    return resizeWidth;
  }
  return resolveNumericWidth(column?.renderWidth ?? column?.width);
}

function resolveBaselineColumnWidth(column: any): number | undefined {
  return resolveNumericWidth(
    column?.[columnDefaultWidthField] ?? column?.[columnBaselineWidthField],
  );
}

function applyColumnWidthValue(column: any, width: number) {
  column.width = width;
}

function isColumnWidthChanged(
  currentWidth: number | undefined,
  baselineWidth: number | undefined,
): boolean {
  if (currentWidth === undefined || baselineWidth === undefined) {
    return false;
  }
  return Math.abs(currentWidth - baselineWidth) > COLUMN_WIDTH_DIFF_THRESHOLD;
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

/**
 * 计算「用于下发给 vxe 的 columns」的定义签名。
 * 只纳入列定义与显隐/固定/列宽等会影响列渲染的字段——
 * 用于在与列无关的重算（如工具栏插槽读取分组等响应式状态）时保持 columns 引用稳定，
 * 避免 vxe 因 columns 引用变化而 reloadColumn，冲掉用户运行时的显隐/顺序/列宽。
 */
function getBoundColumnsSignature(columns: any[]): string {
  return getLeafColumns(columns)
    .map((column) =>
      [
        column?.field ?? '',
        column?.title ?? '',
        column?.type ?? '',
        column?.visible === false ? 0 : 1,
        normalizeFixedValue(column?.fixed),
        resolveNumericWidth(column?.width) ?? '',
      ].join('~'),
    )
    .join('|');
}

function prepareColumnResize(column: any) {
  const minWidth = resolveNumericWidth(column.minWidth);
  const width = resolveNumericWidth(column.width);
  if (width === undefined && minWidth !== undefined) {
    column.width = minWidth;
  }
  if (column.minWidth !== undefined) {
    delete column.minWidth;
  }
}

function normalizeColumns(columns: any[]) {
  const leafColumns = getLeafColumns(columns);
  leafColumns.forEach((column, index) => {
    prepareColumnResize(column);
    const keyBase = column.field ?? column.title ?? column.type ?? 'column';
    const uniqueKey = `col_${index}_${String(keyBase)}`;
    column[columnUniqueKeyField] = uniqueKey;
    // 强制使用稳定 id，避免运行时随机 id 导致配置保存/加载 key 不一致
    column.id = uniqueKey;
    column[columnDefaultVisibleField] = column.visible !== false;
    column[columnDefaultFixedField] = normalizeFixedValue(column.fixed);
    column[columnDefaultWidthField] = resolveNumericWidth(column.width);
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
  const columnWidths: Record<string, number> = {};
  if (config.columnWidths && typeof config.columnWidths === 'object') {
    Object.entries(config.columnWidths).forEach(([key, value]) => {
      if (typeof key === 'string') {
        const width = resolveNumericWidth(value);
        if (width !== undefined) {
          columnWidths[key] = width;
        }
      }
    });
  }
  return {
    visibleColumnKeys,
    columnVisibility,
    columnFixed,
    ...(Object.keys(columnWidths).length > 0 ? { columnWidths } : {}),
    ...(config._debug ? { _debug: config._debug } : {}),
  };
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
    if (
      config.columnWidths &&
      Object.prototype.hasOwnProperty.call(config.columnWidths, key)
    ) {
      const savedWidth = resolveNumericWidth(config.columnWidths[key]);
      if (savedWidth !== undefined) {
        applyColumnWidthValue(column, savedWidth);
      }
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

function collectColumnConfigFromGrid(
  trigger = persistSaveTrigger.value,
): null | ColumnPersistConfig {
  const grid = props.api.grid;
  if (!grid) {
    return null;
  }
  const stableSourceColumns =
    originalColumns.value.length > 0
      ? originalColumns.value
      : toRaw(gridOptions.value?.columns ?? []);
  const allColumns = getLeafColumns(stableSourceColumns);
  if (allColumns.length === 0) {
    return null;
  }
  const stableKeyLookup = createStableKeyLookup(stableSourceColumns);
  const stableKeySet = new Set(
    allColumns.map(
      (column, index) =>
        column?.[columnUniqueKeyField] ??
        column?.id ??
        `col_${index}_${String(column?.field ?? column?.title ?? column?.type ?? 'column')}`,
    ),
  );
  const runtimeFullLeafColumns = getLeafColumns(getRuntimeFullColumns());
  const runtimeVisibleColumns = grid.getColumns?.() ?? [];
  const getColumnsCount = Array.isArray(runtimeVisibleColumns)
    ? runtimeVisibleColumns.length
    : 0;
  const getFullColumnsCount = runtimeFullLeafColumns.length;
  if (getFullColumnsCount === 0 && getColumnsCount === 0) {
    return null;
  }

  const keyMapping = {
    fullColumnsSignatureMatched: 0,
    fullColumnsColumnKeyMatched: 0,
    fullColumnsFallbackMatched: 0,
    visibleKeysNotInStableColumns: 0,
  };
  const unmappedFullColumns: Array<Record<string, unknown>> = [];

  const runtimeVisibilityMap = new Map<string, boolean>();
  const runtimeFixedMap = new Map<string, '' | 'left' | 'right'>();
  const runtimeWidthMap = new Map<string, number>();
  runtimeFullLeafColumns.forEach((column: any, index: number) => {
    const meta = resolveStableColumnKeyMeta(column, stableKeyLookup, index);
    if (meta.match === 'signature') {
      keyMapping.fullColumnsSignatureMatched++;
    } else if (meta.match === 'columnKey') {
      keyMapping.fullColumnsColumnKeyMatched++;
    } else {
      keyMapping.fullColumnsFallbackMatched++;
      unmappedFullColumns.push({
        resolvedKey: meta.key,
        runtimeId: column?.id,
        signature: meta.signature,
        field: column?.field,
        title: column?.title,
        type: column?.type,
        visible: column?.visible !== false,
      });
    }
    runtimeVisibilityMap.set(meta.key, column?.visible !== false);
    runtimeFixedMap.set(meta.key, normalizeFixedValue(column?.fixed));
    const runtimeWidth = resolveRuntimeColumnWidth(column);
    if (runtimeWidth !== undefined) {
      runtimeWidthMap.set(meta.key, runtimeWidth);
    }
  });

  const runtimeVisibleKeys: string[] = [];
  if (Array.isArray(runtimeVisibleColumns)) {
    runtimeVisibleColumns.forEach((column: any, index: number) => {
      const meta = resolveStableColumnKeyMeta(column, stableKeyLookup, index);
      if (!stableKeySet.has(meta.key)) {
        keyMapping.visibleKeysNotInStableColumns++;
      }
      if (column?.visible !== false) {
        runtimeVisibleKeys.push(meta.key);
      }
    });
  }

  const columnVisibility: Record<string, boolean> = {};
  const columnFixed: Record<string, '' | 'left' | 'right'> = {};
  const columnWidths: Record<string, number> = {};
  allColumns.forEach((column, index) => {
    const uniqueKey =
      column?.[columnUniqueKeyField] ??
      column?.id ??
      `col_${index}_${String(column?.field ?? column?.title ?? column?.type ?? 'column')}`;
    columnVisibility[uniqueKey] = runtimeVisibilityMap.has(uniqueKey)
      ? runtimeVisibilityMap.get(uniqueKey)!
      : runtimeVisibleKeys.includes(uniqueKey);
    const fallbackFixed = normalizeFixedValue(column?.fixed);
    columnFixed[uniqueKey] = runtimeFixedMap.get(uniqueKey) ?? fallbackFixed;
    const baselineWidth = resolveBaselineColumnWidth(column);
    const runtimeWidth = runtimeWidthMap.get(uniqueKey);
    if (isColumnWidthChanged(runtimeWidth, baselineWidth) && runtimeWidth) {
      columnWidths[uniqueKey] = runtimeWidth;
    }
  });

  const visibleColumnKeys =
    runtimeVisibleKeys.length > 0
      ? runtimeVisibleKeys
      : allColumns
          .filter((column, index) => {
            const uniqueKey =
              column?.[columnUniqueKeyField] ??
              column?.id ??
              `col_${index}_${String(column?.field ?? column?.title ?? column?.type ?? 'column')}`;
            return columnVisibility[uniqueKey] !== false;
          })
          .map(
            (column, index) =>
              column?.[columnUniqueKeyField] ??
              column?.id ??
              `col_${index}_${String(column?.field ?? column?.title ?? column?.type ?? 'column')}`,
          );

  const config: ColumnPersistConfig = {
    visibleColumnKeys,
    columnVisibility,
    columnFixed,
    ...(Object.keys(columnWidths).length > 0 ? { columnWidths } : {}),
  };

  const suspicious = isSuspiciousColumnPersistConfig(config, allColumns.length);
  const visibleKeySet = new Set(config.visibleColumnKeys);
  const visibilityMismatch = Object.entries(config.columnVisibility)
    .filter(([key, visible]) => visible !== visibleKeySet.has(key))
    .map(([key, visible]) => ({
      key,
      columnVisibility: visible,
      inVisibleColumnKeys: visibleKeySet.has(key),
    }));

  const debugInfo = buildColumnPersistDebug(config, trigger, {
    getColumnsCount,
    getFullColumnsCount,
    keyMapping,
    suspicious,
    verbose: isDebugPersistEnabled()
      ? {
          stableColumns: summarizeColumns(stableSourceColumns),
          runtimeFullColumns: summarizeColumns(runtimeFullLeafColumns),
          runtimeVisibleColumns: summarizeColumns(
            Array.isArray(runtimeVisibleColumns) ? runtimeVisibleColumns : [],
          ),
          unmappedFullColumns,
          visibilityMismatch,
        }
      : undefined,
  });
  config._debug = debugInfo;

  if (suspicious) {
    debugLog('检测到疑似残缺列配置，跳过保存以免污染远端', {
      config,
      totalColumnCount: allColumns.length,
      _debug: debugInfo,
    });
    saveBlockedColumnPersistDebug(
      trigger,
      'suspicious_column_config',
      config,
      debugInfo,
    );
    return null;
  }

  return config;
}

function buildResetDefaultColumns(columns: any[]) {
  const resetColumns = cloneDeep(columns);
  const leafColumns = getLeafColumns(resetColumns);
  leafColumns.forEach((column) => {
    column.visible = true;
    column.fixed = undefined;
    const defaultWidth = resolveNumericWidth(column[columnDefaultWidthField]);
    if (defaultWidth !== undefined) {
      column.width = defaultWidth;
    } else {
      delete column.width;
    }
  });
  return resetColumns;
}

async function captureColumnBaselineWidths() {
  if (baselineWidthsCaptured.value || !isColumnPersistEnabled()) {
    return;
  }
  const runtimeColumns = props.api.grid?.getColumns?.();
  if (!Array.isArray(runtimeColumns) || runtimeColumns.length === 0) {
    return;
  }
  const stableKeyLookup = createStableKeyLookup(originalColumns.value);
  const originalLeafMap = new Map<string, any>();
  getLeafColumns(originalColumns.value).forEach((column) => {
    const key = String(column[columnUniqueKeyField] ?? column.id ?? '').trim();
    if (key) {
      originalLeafMap.set(key, column);
    }
  });
  runtimeColumns.forEach((column: any, index: number) => {
    const uniqueKey = String(
      resolveStableColumnKey(column, stableKeyLookup, index),
    ).trim();
    if (!uniqueKey) {
      return;
    }
    const originalColumn = originalLeafMap.get(uniqueKey);
    if (!originalColumn) {
      return;
    }
    if (
      resolveNumericWidth(originalColumn[columnDefaultWidthField]) !== undefined
    ) {
      return;
    }
    const runtimeWidth = resolveRuntimeColumnWidth(column);
    if (runtimeWidth !== undefined) {
      originalColumn[columnBaselineWidthField] = runtimeWidth;
    }
  });
  baselineWidthsCaptured.value = true;
  debugLog('列宽基线采集完成', {
    baselineColumns: getLeafColumns(originalColumns.value).map((column) => ({
      uniqueKey: column[columnUniqueKeyField] ?? column.id,
      baselineWidth: column[columnBaselineWidthField],
      defaultWidth: column[columnDefaultWidthField],
    })),
  });
}

async function captureColumnBaselineWidthsWithRetry() {
  await captureColumnBaselineWidths();
  if (baselineWidthsCaptured.value) {
    return;
  }
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  await captureColumnBaselineWidths();
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

function scheduleSaveColumnConfig(trigger = 'unknown') {
  if (!isColumnPersistEnabled() || isApplyingColumnConfig.value) {
    return;
  }
  persistSaveTrigger.value = trigger;
  if (persistTimer.value) {
    window.clearTimeout(persistTimer.value);
  }
  persistTimer.value = window.setTimeout(async () => {
    const config = collectColumnConfigFromGrid(trigger);
    if (!config) {
      debugLog('采集运行时列配置为空或已拦截，跳过保存', { trigger });
      return;
    }
    debugLog('采集运行时列配置', {
      config,
      trigger,
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
  baselineWidthsCaptured.value = false;
  if (originalColumns.value.length > 0) {
    const resetColumns = buildResetDefaultColumns(originalColumns.value);
    isApplyingColumnConfig.value = true;
    props.api.setGridOptions({
      columns: resetColumns,
    } as any);
    await nextTick();
    props.api.grid?.refreshColumn?.();
    isApplyingColumnConfig.value = false;
    await captureColumnBaselineWidthsWithRetry();
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
        if (remoteConfig._debug) {
          debugLog('加载远端列配置调试信息', {
            _debug: remoteConfig._debug,
            userSettingKey: userSettingKey.value,
          });
        }
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
          healedConfig._debug = buildColumnPersistDebug(healedConfig, 'heal', {
            getColumnsCount: getLeafColumns(
              props.api.grid?.getColumns?.() ?? [],
            ).length,
            getFullColumnsCount: getLeafColumns(getRuntimeFullColumns()).length,
            keyMapping: {
              fullColumnsSignatureMatched: 0,
              fullColumnsColumnKeyMatched: 0,
              fullColumnsFallbackMatched: 0,
              visibleKeysNotInStableColumns: 0,
            },
            suspicious: false,
          });
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
  await captureColumnBaselineWidthsWithRetry();
  initializedColumns.value = true;
  debugLog('列配置加载流程结束', {
    hasApplied,
    userSettingId: userSettingId.value,
    finalColumns: summarizeColumns(rawColumns),
  });
}

function isSearchPersistEnabled() {
  if (!formOptions.value) {
    return false;
  }
  const enabled = searchPersist.value?.enabled;
  if (enabled === false) {
    return false;
  }
  if (enabled === true) {
    return true;
  }
  return true;
}

function resolveSearchFieldLabel(schema: any) {
  if (typeof schema?.label === 'string') {
    const label = schema.label.trim();
    if (label) {
      return label;
    }
  }
  return String(schema?.fieldName ?? '');
}

function isSearchFieldConfigurable(schema: any) {
  if (!schema || typeof schema !== 'object') {
    return false;
  }
  const fieldName = String(schema.fieldName ?? '').trim();
  if (!fieldName) {
    return false;
  }
  if (schema.hide === true) {
    return false;
  }
  const formItemClass = String(schema.formItemClass ?? '');
  if (formItemClass.split(/\s+/).includes('hidden')) {
    return false;
  }
  return true;
}

function buildSearchFieldOptions(schemas: any[] = []): SearchFieldOption[] {
  const options: SearchFieldOption[] = [];
  const fieldNameSet = new Set<string>();
  schemas.forEach((schema) => {
    if (!isSearchFieldConfigurable(schema)) {
      return;
    }
    const fieldName = String(schema.fieldName ?? '').trim();
    if (!fieldName || fieldNameSet.has(fieldName)) {
      return;
    }
    fieldNameSet.add(fieldName);
    const visible = schema.hide !== true;
    options.push({
      defaultVisible: visible,
      fieldName,
      label: resolveSearchFieldLabel(schema),
      visible,
    });
  });
  return options;
}

function buildSearchFieldConfigFromOptions(
  options: SearchFieldOption[],
): SearchFieldPersistConfig {
  const fieldVisibility: Record<string, boolean> = {};
  const fieldOrder: string[] = [];
  const visibleFieldNames: string[] = [];
  options.forEach((option) => {
    fieldOrder.push(option.fieldName);
    fieldVisibility[option.fieldName] = option.visible;
    if (option.visible) {
      visibleFieldNames.push(option.fieldName);
    }
  });
  return {
    fieldVisibility,
    fieldOrder,
    visibleFieldNames,
  };
}

function normalizeParsedSearchConfig(
  config: any,
): SearchFieldPersistConfig | null {
  if (!config || typeof config !== 'object') {
    return null;
  }
  const visibleFieldNames = Array.isArray(config.visibleFieldNames)
    ? config.visibleFieldNames.filter(
        (fieldName: unknown) => typeof fieldName === 'string',
      )
    : [];
  const fieldOrder = Array.isArray(config.fieldOrder)
    ? config.fieldOrder.filter(
        (fieldName: unknown) => typeof fieldName === 'string',
      )
    : [];
  const fieldVisibility: Record<string, boolean> = {};
  if (config.fieldVisibility && typeof config.fieldVisibility === 'object') {
    Object.entries(config.fieldVisibility).forEach(([fieldName, visible]) => {
      if (typeof fieldName === 'string') {
        fieldVisibility[fieldName] = visible !== false;
      }
    });
  }
  return {
    fieldVisibility,
    fieldOrder,
    visibleFieldNames,
  };
}

function buildOrderedSearchFieldOptions(
  options: SearchFieldOption[],
  fieldOrder: string[],
) {
  if (fieldOrder.length === 0 || options.length === 0) {
    return options;
  }
  const optionMap = new Map(options.map((item) => [item.fieldName, item]));
  const ordered: SearchFieldOption[] = [];
  const used = new Set<string>();
  fieldOrder.forEach((fieldName) => {
    const option = optionMap.get(fieldName);
    if (!option || used.has(fieldName)) {
      return;
    }
    used.add(fieldName);
    ordered.push(option);
  });
  options.forEach((option) => {
    if (!used.has(option.fieldName)) {
      ordered.push(option);
    }
  });
  return ordered;
}

function applySearchFieldOrderToSchema(options: SearchFieldOption[]) {
  const schema = formApi.getState()?.schema ?? [];
  if (!Array.isArray(schema) || schema.length === 0) {
    return;
  }
  const order = options.map((item) => item.fieldName);
  if (order.length === 0) {
    return;
  }
  const orderSet = new Set(order);
  const schemaMap = new Map<string, any>();
  schema.forEach((item) => {
    const fieldName = String(item?.fieldName ?? '').trim();
    if (fieldName && orderSet.has(fieldName)) {
      schemaMap.set(fieldName, item);
    }
  });
  const orderedSchemaItems = order
    .map((fieldName) => schemaMap.get(fieldName))
    .filter(Boolean);
  if (orderedSchemaItems.length === 0) {
    return;
  }
  let index = 0;
  const nextSchema = schema.map((item) => {
    const fieldName = String(item?.fieldName ?? '').trim();
    if (!fieldName || !orderSet.has(fieldName)) {
      return item;
    }
    const nextItem = orderedSchemaItems[index];
    index += 1;
    return nextItem ?? item;
  });
  formApi.setState({
    schema: nextSchema,
  });
}

function parseSearchFieldConfig(
  rawSetting: string,
): SearchFieldPersistConfig | null {
  if (!rawSetting) {
    return null;
  }
  try {
    const parsed = JSON.parse(rawSetting);
    return normalizeParsedSearchConfig(parsed);
  } catch {
    return null;
  }
}

function applySearchFieldConfig(config: SearchFieldPersistConfig) {
  const orderedOptions = buildOrderedSearchFieldOptions(
    searchFieldOptions.value,
    config.fieldOrder,
  );
  const visibleFieldSet = new Set(config.visibleFieldNames);
  const useVisibleNamesAsCompactVisibility =
    Object.keys(config.fieldVisibility).length === 0 &&
    visibleFieldSet.size > 0;
  const updates = orderedOptions.map((option) => {
    const hasVisibility = Object.prototype.hasOwnProperty.call(
      config.fieldVisibility,
      option.fieldName,
    );
    const visible = hasVisibility
      ? config.fieldVisibility[option.fieldName]
      : useVisibleNamesAsCompactVisibility
        ? visibleFieldSet.has(option.fieldName)
        : option.defaultVisible;
    return {
      ...option,
      visible,
    };
  });
  searchFieldOptions.value = updates;
  if (updates.length === 0) {
    return;
  }
  applySearchFieldOrderToSchema(updates);
  isApplyingSearchFieldConfig.value = true;
  formApi.updateSchema(
    updates.map((option) => ({
      fieldName: option.fieldName,
      hide: !option.visible,
    })),
  );
  isApplyingSearchFieldConfig.value = false;
}

function clearSearchLocalStorageCache() {
  if (!resolvedTableId.value) {
    return;
  }
  localStorage.removeItem(searchFallbackStorageKey.value);
}

function saveFallbackSearchFieldConfig(rawSetting: string) {
  localStorage.setItem(searchFallbackStorageKey.value, rawSetting);
}

async function saveSearchFieldConfig(config: SearchFieldPersistConfig) {
  if (!isSearchPersistEnabled() || !resolvedTableId.value) {
    return;
  }
  const rawSetting = JSON.stringify(config);
  const addApi = searchPersist.value?.add;
  const editApi = searchPersist.value?.edit;
  if (!addApi || !editApi) {
    saveFallbackSearchFieldConfig(rawSetting);
    return;
  }
  try {
    if (searchUserSettingId.value) {
      await editApi({
        id: searchUserSettingId.value,
        name: searchUserSettingKey.value,
        setting: rawSetting,
      });
    } else {
      searchUserSettingId.value = await addApi({
        name: searchUserSettingKey.value,
        setting: rawSetting,
      });
    }
    clearSearchLocalStorageCache();
  } catch (error) {
    searchPersist.value?.onError?.(error);
    saveFallbackSearchFieldConfig(rawSetting);
  }
}

function scheduleSaveSearchFieldConfig() {
  if (!isSearchPersistEnabled() || isApplyingSearchFieldConfig.value) {
    return;
  }
  if (searchPersistTimer.value) {
    window.clearTimeout(searchPersistTimer.value);
  }
  searchPersistTimer.value = window.setTimeout(async () => {
    const config = buildSearchFieldConfigFromOptions(searchFieldOptions.value);
    await saveSearchFieldConfig(config);
  }, 120);
}

async function loadSearchFieldConfig() {
  if (
    !formOptions.value ||
    !resolvedTableId.value ||
    initializedSearchFields.value
  ) {
    return;
  }
  const runtimeSchema =
    formApi.getState()?.schema ?? formOptions.value?.schema ?? [];
  const options = buildSearchFieldOptions(runtimeSchema as any[]);
  searchFieldOptions.value = options;
  initializedSearchFields.value = true;
  if (!isSearchPersistEnabled() || options.length === 0) {
    return;
  }

  let hasApplied = false;
  const loadApi = searchPersist.value?.load;
  if (loadApi) {
    try {
      const remoteSetting = await loadApi({
        keyword: searchUserSettingKey.value,
      });
      if (remoteSetting?.id) {
        searchUserSettingId.value = remoteSetting.id;
      }
      const remoteConfig = parseSearchFieldConfig(remoteSetting?.setting ?? '');
      if (remoteConfig) {
        applySearchFieldConfig(remoteConfig);
        hasApplied = true;
      }
    } catch (error) {
      searchPersist.value?.onError?.(error);
    }
  }

  if (!hasApplied) {
    const localRaw = localStorage.getItem(searchFallbackStorageKey.value);
    const localConfig = parseSearchFieldConfig(localRaw ?? '');
    if (localConfig) {
      applySearchFieldConfig(localConfig);
      hasApplied = true;
      if (searchPersist.value?.add) {
        try {
          searchUserSettingId.value = await searchPersist.value.add({
            name: searchUserSettingKey.value,
            setting: JSON.stringify(localConfig),
          });
          clearSearchLocalStorageCache();
        } catch (error) {
          searchPersist.value?.onError?.(error);
        }
      }
    }
  }

  if (!hasApplied) {
    applySearchFieldConfig(buildSearchFieldConfigFromOptions(options));
  }
}

function setSearchFieldVisibility(fieldName: string, visible: boolean) {
  const updates = searchFieldOptions.value.map((option) => {
    if (option.fieldName === fieldName) {
      return {
        ...option,
        visible,
      };
    }
    return option;
  });
  searchFieldOptions.value = updates;
  isApplyingSearchFieldConfig.value = true;
  formApi.updateSchema([{ fieldName, hide: !visible }]);
  isApplyingSearchFieldConfig.value = false;
  scheduleSaveSearchFieldConfig();
}

function setAllSearchFieldsVisible(visible: boolean) {
  if (searchFieldOptions.value.length === 0) {
    return;
  }
  searchFieldOptions.value = searchFieldOptions.value.map((option) => ({
    ...option,
    visible,
  }));
  applySearchFieldOrderToSchema(searchFieldOptions.value);
  isApplyingSearchFieldConfig.value = true;
  formApi.updateSchema(
    searchFieldOptions.value.map((option) => ({
      fieldName: option.fieldName,
      hide: !option.visible,
    })),
  );
  isApplyingSearchFieldConfig.value = false;
  scheduleSaveSearchFieldConfig();
}

function resetSearchFieldVisibility() {
  searchFieldOptions.value = searchFieldOptions.value.map((option) => ({
    ...option,
    visible: option.defaultVisible,
  }));
  applySearchFieldOrderToSchema(searchFieldOptions.value);
  isApplyingSearchFieldConfig.value = true;
  formApi.updateSchema(
    searchFieldOptions.value.map((option) => ({
      fieldName: option.fieldName,
      hide: !option.visible,
    })),
  );
  isApplyingSearchFieldConfig.value = false;
  scheduleSaveSearchFieldConfig();
}

function onSearchFieldInputChange(fieldName: string, event: Event) {
  const target = event.target as HTMLInputElement | null;
  setSearchFieldVisibility(fieldName, target?.checked === true);
}

function reorderSearchField(sourceFieldName: string, targetFieldName: string) {
  if (
    !sourceFieldName ||
    !targetFieldName ||
    sourceFieldName === targetFieldName
  ) {
    return;
  }
  const sourceIndex = searchFieldOptions.value.findIndex(
    (item) => item.fieldName === sourceFieldName,
  );
  const targetIndex = searchFieldOptions.value.findIndex(
    (item) => item.fieldName === targetFieldName,
  );
  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }
  const next = [...searchFieldOptions.value];
  const [current] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, current);
  searchFieldOptions.value = next;
  applySearchFieldOrderToSchema(next);
  scheduleSaveSearchFieldConfig();
}

function onSearchFieldDragStart(fieldName: string, event: DragEvent) {
  draggingSearchFieldName.value = fieldName;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.dropEffect = 'move';
    event.dataTransfer.setData('text/plain', fieldName);
  }
}

function onSearchFieldDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}

function onSearchFieldDrop(targetFieldName: string, event: DragEvent) {
  event.preventDefault();
  const sourceFieldName =
    draggingSearchFieldName.value ||
    event.dataTransfer?.getData('text/plain') ||
    '';
  reorderSearchField(sourceFieldName, targetFieldName);
  draggingSearchFieldName.value = '';
}

function onSearchFieldDragEnd() {
  draggingSearchFieldName.value = '';
}

function toggleSearchFieldPopover() {
  showSearchFieldPopover.value = !showSearchFieldPopover.value;
}

function closeSearchFieldPopover() {
  showSearchFieldPopover.value = false;
}

function onDocumentClick(event: MouseEvent) {
  if (!showSearchFieldPopover.value) {
    return;
  }
  const target = event.target as Node | null;
  const container = searchFieldPopoverContainerRef.value;
  if (!target || !container?.contains(target)) {
    closeSearchFieldPopover();
  }
}

const hasSearchFieldOptions = computed(
  () => searchFieldOptions.value.length > 0,
);
const allSearchFieldsVisible = computed(() => {
  if (!hasSearchFieldOptions.value) {
    return false;
  }
  return searchFieldOptions.value.every((item) => item.visible);
});

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
  if (mergedOptions.toolbarConfig) {
    mergedOptions.toolbarConfig.refresh = false;
    mergedOptions.toolbarConfig.zoom = false;
  }

  // 列定义/显隐/固定/列宽未变化时，复用同一 columns 数组引用。
  // 否则工具栏等与列无关的响应式重算（如分组 Tab 的 loading/items 变化）会
  // 生成新的 columns 引用触发 vxe reloadColumn，把用户运行时的列设置重置掉。
  if (Array.isArray(mergedOptions.columns)) {
    const signature = getBoundColumnsSignature(mergedOptions.columns);
    if (stableBoundColumns && stableBoundColumnsSignature === signature) {
      mergedOptions.columns = stableBoundColumns;
    } else {
      stableBoundColumnsSignature = signature;
      stableBoundColumns = mergedOptions.columns;
    }
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
  scheduleSaveColumnConfig('custom');
  (gridEvents.value as any)?.custom?.(event);
}

function onCustomChange(event: any) {
  scheduleSaveColumnConfig('customChange');
  (gridEvents.value as any)?.customChange?.(event);
}

async function onCustomReset(event: any) {
  await resetColumnConfig();
  (gridEvents.value as any)?.customReset?.(event);
}

function onColumnDropEnd(event: any) {
  scheduleSaveColumnConfig('columnDropEnd');
  (gridEvents.value as any)?.columnDropEnd?.(event);
}

function onColumnResizableChange(event: any) {
  scheduleSaveColumnConfig('columnResizableChange');
  (gridEvents.value as any)?.columnResizableChange?.(event);
}

const events = computed(() => {
  return {
    ...gridEvents.value,
    toolbarToolClick: onToolbarToolClick,
    custom: onCustom,
    customChange: onCustomChange,
    customReset: onCustomReset,
    columnDropEnd: onColumnDropEnd,
    columnResizableChange: onColumnResizableChange,
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
  if (!isColumnPersistEnabled()) {
    const rawColumns = toRaw(gridOptions.value?.columns ?? []);
    if (Array.isArray(rawColumns) && rawColumns.length > 0) {
      normalizeColumns(rawColumns);
      props.api.setGridOptions({
        columns: cloneDeep(rawColumns),
      } as any);
      await nextTick();
      props.api.grid?.refreshColumn?.();
    }
  }
  await loadColumnConfig();
  await loadSearchFieldConfig();
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
  window.addEventListener('click', onDocumentClick);
  void init();
});

onUnmounted(() => {
  if (persistTimer.value) {
    window.clearTimeout(persistTimer.value);
    persistTimer.value = undefined;
  }
  if (searchPersistTimer.value) {
    window.clearTimeout(searchPersistTimer.value);
    searchPersistTimer.value = undefined;
  }
  window.removeEventListener('click', onDocumentClick);
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
        <div
          v-if="formOptions"
          ref="searchFieldPopoverContainerRef"
          class="relative ml-2 inline-flex items-center"
        >
          <VxeButton
            icon="vxe-icon-search-zoom-in"
            circle
            :status="showSearchFieldPopover ? 'primary' : undefined"
            title="搜索项设置"
            @click.stop="toggleSearchFieldPopover"
          />
          <div
            v-if="showSearchFieldPopover"
            class="bg-card absolute right-0 top-[calc(100%+8px)] z-30 w-64 rounded-md border p-3 shadow-lg"
            @click.stop
          >
            <div class="mb-2 flex items-center justify-between text-xs">
              <button
                class="text-primary disabled:text-muted-foreground"
                type="button"
                :disabled="!hasSearchFieldOptions || allSearchFieldsVisible"
                @click="setAllSearchFieldsVisible(true)"
              >
                全选
              </button>
              <button
                class="text-primary disabled:text-muted-foreground"
                type="button"
                :disabled="!hasSearchFieldOptions"
                @click="resetSearchFieldVisibility"
              >
                恢复默认
              </button>
            </div>
            <div
              v-if="hasSearchFieldOptions"
              class="max-h-60 space-y-2 overflow-y-auto pr-1 text-xs"
            >
              <div
                v-for="item in searchFieldOptions"
                :key="item.fieldName"
                class="hover:bg-accent flex cursor-move items-center justify-between rounded px-2 py-1"
                draggable="true"
                @dragstart="onSearchFieldDragStart(item.fieldName, $event)"
                @dragover="onSearchFieldDragOver($event)"
                @drop="onSearchFieldDrop(item.fieldName, $event)"
                @dragend="onSearchFieldDragEnd"
              >
                <span class="truncate pr-2">
                  <span class="text-muted-foreground mr-1">::</span>
                  {{ item.label }}
                </span>
                <div class="flex items-center gap-1">
                  <input
                    type="checkbox"
                    :checked="item.visible"
                    @change="onSearchFieldInputChange(item.fieldName, $event)"
                  />
                </div>
              </div>
            </div>
            <div v-else class="text-muted-foreground py-2 text-center text-xs">
              暂无可配置搜索项
            </div>
          </div>
        </div>
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
