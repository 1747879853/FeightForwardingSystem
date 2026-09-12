<script lang="ts" setup>
import { computed, nextTick, onMounted, shallowRef, watch } from 'vue';

import { HotTable } from '@handsontable/vue3';
import { registerLanguageDictionary, zhCN } from 'handsontable/i18n';

registerLanguageDictionary(zhCN);

import { Button, Card, Empty, message, Spin, Tag } from 'ant-design-vue';

import {
  applyLocalCurrencyToAggregate,
  collectAllGroupKeys,
  fillAggregatedColumns,
  parseNumeric,
} from './aggregate';
import { useReportTableLayout } from './use-report-table-layout';

defineOptions({
  name: 'ReportHotTable',
});

/** 与 CSS 行高一致，供 Handsontable rowHeights 使用 */
const REPORT_ROW_HEIGHT = 32;
/** cells() 普通行复用，避免每次 new 对象 */
const EMPTY_CELL_PROPS = Object.freeze({});

const props = defineProps<{
  originalData: Record<string, any>[];
  groupColumns: string[];
  expandedGroups: Set<string>;
  columnConfigs: any[];
  loading: boolean;
  /** 完整列配置（基础列 + 币别动态列 + 合计列），由报表配置驱动 */
  hotColumns: Record<string, any>[];
  /** 数值列键集合（用于合计行累加、分组聚合与右对齐） */
  numericColumnKeys: string[];
  /** 报表名称（用于导出文件名与工作表名） */
  reportTitle: string;
}>();

const emit = defineEmits<{
  (e: 'update:groupColumns', value: string[]): void;
  (e: 'update:expandedGroups', value: Set<string>): void;
  (e: 'update:columnConfigs', value: any[]): void;
  (e: 'viewDetail', record: Record<string, any>): void;
}>();

const hotTableRef = shallowRef<any>(null);
const containerRef = shallowRef<HTMLElement | null>(null);
const currentColumnsRef = shallowRef<any[]>([]);
const hiddenColumnsRef = shallowRef<number[]>([]);
const hiddenColumnDataRefs = shallowRef<Set<string>>(new Set());
/** 展示行（含分组/合计）。只整体替换，不做深层代理 */
const tableData = shallowRef<any[]>([]);
const exporting = shallowRef(false);

const localGroupColumns = shallowRef<string[]>([...props.groupColumns]);
const localExpandedGroups = shallowRef<Set<string>>(
  new Set([...props.expandedGroups]),
);

/** 排序状态：作用于原始数据源，合计行不参与排序、始终保持在最后一行 */
const sortState = shallowRef<{ column: string; order: 'asc' | 'desc' } | null>(
  null,
);
/** 表格数据源：保存排序后的原始数据，分组/展开/合计行均基于它重建 */
const dataSource = shallowRef<any[]>([...props.originalData]);

const rightClickColumnIndex = shallowRef<number | null>(null);
const draggedGroupIndex = shallowRef<number | null>(null);
const dragOverGroupIndex = shallowRef<number | null>(null);
const hoverColumnData = shallowRef<string | null>(null);

const groupingCache = new Map<string, any[]>();
const treeStructureCache = new Map<string, any[]>();

const { scheduleHeightUpdate } = useReportTableLayout({
  containerRef,
  getHotInstance: () => hotTableRef.value?.hotInstance,
});

function clearCaches() {
  groupingCache.clear();
  treeStructureCache.clear();
}

const columnTitleMap = computed<Record<string, string>>(() => {
  return props.hotColumns.reduce(
    (map, col) => {
      map[col.data] = col.title;
      return map;
    },
    {} as Record<string, string>,
  );
});

const numericColumns = computed(() => new Set(props.numericColumnKeys));

const recordCount = computed(() => dataSource.value.length);

const hasGrouping = computed(() => localGroupColumns.value.length > 0);

function syncHotData(rows: any[]) {
  tableData.value = rows;
  nextTick(() => {
    const hotInstance = hotTableRef.value?.hotInstance;
    if (!hotInstance) return;
    try {
      hotInstance.loadData(rows);
      scheduleHeightUpdate(0);
    } catch (error) {
      console.error('Handsontable 更新失败:', error);
    }
  });
}

function toggleGroupExpand(groupKey: string) {
  if (localExpandedGroups.value.has(groupKey)) {
    localExpandedGroups.value.delete(groupKey);
  } else {
    localExpandedGroups.value.add(groupKey);
  }

  emit('update:expandedGroups', localExpandedGroups.value);
  clearCaches();

  if (dataSource.value.length > 0) {
    applyGrouping(dataSource.value);
  }
}

function expandAllGroups() {
  if (!hasGrouping.value || dataSource.value.length === 0) return;
  const keys = collectAllGroupKeys(dataSource.value, localGroupColumns.value);
  localExpandedGroups.value = new Set(keys);
  emit('update:expandedGroups', localExpandedGroups.value);
  clearCaches();
  applyGrouping(dataSource.value);
}

function collapseAllGroups() {
  if (!hasGrouping.value) return;
  localExpandedGroups.value = new Set();
  emit('update:expandedGroups', new Set());
  clearCaches();
  if (dataSource.value.length > 0) {
    applyGrouping(dataSource.value);
  }
}

function compareCellValues(a: any, b: any): number {
  const aEmpty = a == null || a === '' || a === '-';
  const bEmpty = b == null || b === '' || b === '-';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  const aNum = Number.parseFloat(String(a).replaceAll(',', ''));
  const bNum = Number.parseFloat(String(b).replaceAll(',', ''));
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) {
    return aNum - bNum;
  }
  return String(a).localeCompare(String(b), 'zh-CN', { numeric: true });
}

function sortRows(data: any[], column: string, order: 'asc' | 'desc'): any[] {
  return [...data].sort((rowA, rowB) => {
    const result = compareCellValues(rowA[column], rowB[column]);
    return order === 'asc' ? result : -result;
  });
}

/** 列头单击排序：升序 → 降序 → 取消，合计行始终在最后 */
function handleColumnHeaderClick(colIndex: number) {
  const colConfig = currentColumnsRef.value[colIndex];
  const columnData = colConfig?.data;
  if (!columnData || columnData === '_groupDisplay') {
    return;
  }

  const currentSort = sortState.value;
  clearCaches();

  if (
    currentSort &&
    currentSort.column === columnData &&
    currentSort.order === 'desc'
  ) {
    sortState.value = null;
    dataSource.value = [...props.originalData];
  } else {
    const order: 'asc' | 'desc' =
      currentSort &&
      currentSort.column === columnData &&
      currentSort.order === 'asc'
        ? 'desc'
        : 'asc';
    sortState.value = { column: columnData, order };
    dataSource.value = sortRows(dataSource.value, columnData, order);
  }

  if (dataSource.value.length > 0) {
    applyGrouping(dataSource.value);
  }
}

watch(
  () => props.groupColumns,
  (newVal) => {
    localGroupColumns.value = [...newVal];
  },
);

watch(
  () => props.expandedGroups,
  (newVal) => {
    localExpandedGroups.value = new Set([...newVal]);
  },
);

/**
 * 查询结果与列配置在同一次查询里会一起变，合并成一个 watch 避免 applyGrouping 跑两遍。
 */
watch(
  () => [props.originalData, props.columnConfigs] as const,
  ([newVal]) => {
    clearCaches();
    dataSource.value = [...newVal];
    if (newVal.length > 0) {
      if (sortState.value) {
        dataSource.value = sortRows(
          dataSource.value,
          sortState.value.column,
          sortState.value.order,
        );
      }
      applyGrouping(dataSource.value);
    } else {
      hiddenColumnsRef.value = [];
      hiddenColumnDataRefs.value = new Set();
      syncHotData([]);
    }
  },
);

const componentInstance = {
  localGroupColumns,
  localExpandedGroups,
  currentColumnsRef,
  emit,
  applyGrouping: (_data: any[]) => {},
  rightClickColumnIndex,
  dataSource,
};

function updateHiddenColumnData(destinationHideConfig: number[]) {
  const hotInstance = hotTableRef.value?.hotInstance;
  if (!hotInstance) return;

  const columns = hotInstance.getSettings().columns || [];
  const hiddenData = new Set<string>();
  destinationHideConfig.forEach((colIndex) => {
    const colConfig = columns[colIndex];
    if (colConfig && colConfig.data) {
      hiddenData.add(colConfig.data);
    }
  });
  hiddenColumnDataRefs.value = hiddenData;
}

/**
 * 列/排序/隐藏列变化才重算 settings。
 * 故意不把 tableData 放进 computed：行数据改走 loadData，避免每次展开分组都
 * 把整份 Handsontable 配置（含回调）重建一遍。
 */
const hotSettings = computed(() => {
  const grouped = localGroupColumns.value.length > 0;

  const visibleColumns = grouped
    ? [...currentColumnsRef.value]
    : [...props.columnConfigs]
        .filter((col) => col.visible)
        .sort((a, b) => a.order - b.order);

  const columnsForSettings = visibleColumns.map((col) => {
    const isNumeric = numericColumns.value.has(col.data);
    return {
      ...col,
      className: isNumeric ? 'htRight' : col.className || 'htLeft',
      width: col.width || 150,
    };
  });

  return {
    columns: columnsForSettings,
    rowHeaders: true,
    // 排序箭头读 sortState.value：必须在回调内取最新值。
    // Handsontable Vue 包装器用函数 toString 判断是否更新，闭包捕获会让箭头停在旧排序。
    colHeaders: (col: number) => {
      const colConfig = columnsForSettings[col];
      if (!colConfig) return '';
      const title = colConfig.title || '';
      const data = colConfig.data;
      const sort = sortState.value;
      if (data && data !== '_groupDisplay' && sort && sort.column === data) {
        return `${title} ${sort.order === 'asc' ? '▲' : '▼'}`;
      }
      return title;
    },
    width: '100%',
    stretchH: 'none',
    manualColumnResize: true,
    manualRowResize: false,
    autoColumnSize: false,
    autoRowSize: false,
    renderAllRows: false,
    viewportColumnRenderingOffset: 6,
    viewportRowRenderingOffset: 8,
    manualColumnMove: true,
    fillHandle: false,
    // 有数据时合计行钉在底部，滚动明细不必翻到最后
    fixedRowsBottom: dataSource.value.length > 0 ? 1 : 0,
    contextMenu: {
      items: {
        hidden_columns_show: {
          name: '显示隐藏的列',
        },
        hidden_columns_hide: {
          name: '隐藏列',
        },
        separator1: '---------',
        add_to_group: {
          name: '添加到分组',
          callback: function (
            _key: string,
            selection: any[],
            _clickEvent: any,
          ) {
            const instance = componentInstance;
            const col = selection[0].start.col;

            const currentColumns = instance.currentColumnsRef.value;
            if (col < 0 || col >= currentColumns.length) {
              return;
            }

            const columnData = currentColumns[col]?.data;
            const columnTitle = currentColumns[col]?.title || columnData;

            if (!columnData || columnData === '_groupDisplay') {
              message.warning('该列不能用于分组');
              return;
            }

            if (instance.localGroupColumns.value.includes(columnData)) {
              message.warning(`"${columnTitle}" 已在分组中`);
              return;
            }

            instance.localGroupColumns.value = [
              ...instance.localGroupColumns.value,
              columnData,
            ];
            instance.emit('update:groupColumns', [
              ...instance.localGroupColumns.value,
            ]);

            instance.localExpandedGroups.value = new Set();
            instance.emit('update:expandedGroups', new Set());

            if (instance.dataSource.value.length > 0) {
              instance.applyGrouping(instance.dataSource.value);
            }

            message.success(`已将 "${columnTitle}" 添加到分组`);
          },
          disabled: function () {
            const instance = componentInstance;
            const col = instance.rightClickColumnIndex.value;

            if (col === null || col < 0) {
              return false;
            }

            const currentColumns = instance.currentColumnsRef.value;
            if (col >= currentColumns.length) {
              return false;
            }

            const columnData = currentColumns[col]?.data;
            if (!columnData) {
              return false;
            }
            if (columnData === '_groupDisplay') {
              return true;
            }
            if (columnData.startsWith('total')) {
              return true;
            }
            return instance.localGroupColumns.value.includes(columnData);
          },
        },
      },
    },
    hiddenColumns: {
      columns: hiddenColumnsRef.value,
      indicators: true,
      copyPasteEnabled: false,
    },
    language: zhCN.languageCode,
    readOnly: true,
    licenseKey: 'non-commercial-and-evaluation',
    className: 'htCenter htMiddle',
    rowHeights: REPORT_ROW_HEIGHT,
    autoWrapRow: false,
    autoWrapCol: false,
    fixedColumnsLeft: 0,
    fixedColumnsRight: 0,
    cells: (row: number, col: number) => {
      if (row == null || row < 0) return EMPTY_CELL_PROPS;
      const rowData = tableData.value[row];
      if (!rowData) return EMPTY_CELL_PROPS;

      const colConfig = currentColumnsRef.value[col];
      let rowClass = '';
      if (rowData._isTotalRow) {
        rowClass = 'report-total-cell';
      } else if (rowData._isGroupRow) {
        rowClass =
          colConfig?.data === '_groupDisplay'
            ? 'report-group-cell report-group-label'
            : 'report-group-cell';
      } else if (rowData._isDetailRow) {
        rowClass = 'report-detail-cell';
      } else {
        return EMPTY_CELL_PROPS;
      }

      const base = colConfig?.className || '';
      return { className: base ? `${base} ${rowClass}` : rowClass };
    },
    afterDblClick: onAfterOnCellDblClick,
    afterOnCellMouseDown: (event: MouseEvent, coords: any) => {
      if (event?.button !== 0) return;
      if (coords?.row === -1 && coords?.col >= 0) {
        handleColumnHeaderClick(coords.col);
        return;
      }
      if (
        coords?.row >= 0 &&
        coords?.col === 0 &&
        localGroupColumns.value.length > 0
      ) {
        const rowData = tableData.value[coords.row];
        if (rowData?._isGroupRow && rowData._groupKey) {
          toggleGroupExpand(rowData._groupKey);
        }
      }
    },
    afterOnCellMouseOver: (
      _event: MouseEvent,
      coords: { row: number; col: number },
      TD: HTMLTableCellElement,
    ) => {
      if (coords.row < 0 || coords.col < 0) return;
      const value =
        tableData.value[coords.row]?.[
          currentColumnsRef.value[coords.col]?.data
        ];
      const cellValue = value == null ? '' : String(value);
      if (cellValue && cellValue !== '-' && cellValue.trim() !== '') {
        TD.title = cellValue;
      }
    },
    afterOnCellMouseOut: (
      _event: MouseEvent,
      _coords: { row: number; col: number },
      TD: HTMLTableCellElement,
    ) => {
      if (TD.title) TD.title = '';
    },
    afterOnCellContextMenu: (_event: MouseEvent, coords: any) => {
      if (coords && coords.col !== undefined) {
        rightClickColumnIndex.value = coords.col;
      }
    },
    afterOnColumnHeaderContextMenu: (_event: MouseEvent, col: number) => {
      if (col !== undefined) {
        rightClickColumnIndex.value = col;
      }
    },
    afterHideColumns: (
      _currentHideConfig: number[],
      destinationHideConfig: number[],
    ) => {
      updateHiddenColumnData(destinationHideConfig);
    },
    afterUnhideColumns: (
      _currentHideConfig: number[],
      destinationHideConfig: number[],
    ) => {
      updateHiddenColumnData(destinationHideConfig);
    },
  };
});

onMounted(() => {
  if (dataSource.value.length > 0) {
    applyGrouping(dataSource.value);
  }
});

function createGroupColumn() {
  return {
    data: '_groupDisplay',
    title: '分组',
    width: 250,
    className: 'htLeft',
    renderer: (
      _instance: any,
      td: HTMLTableCellElement,
      row: number,
      _col: number,
      _prop: string,
      _value: any,
      _cellProperties: any,
    ) => {
      const rowData = tableData.value[row];
      if (!rowData) {
        td.textContent = '';
        return td;
      }
      if (rowData._isTotalRow) {
        td.textContent = '合计';
        return td;
      }
      if (rowData._isGroupRow) {
        const level = rowData._groupLevel || 0;
        const icon = localExpandedGroups.value.has(rowData._groupKey)
          ? '▼ '
          : '▶ ';
        td.textContent = `${'  '.repeat(level)}${icon}${rowData._groupName || ''}`;
        return td;
      }
      if (rowData._isDataRow) {
        const level = (rowData._groupLevel || 0) + 1;
        td.textContent = `${'  '.repeat(level)}•`;
        return td;
      }
      td.textContent = '';
      return td;
    },
  };
}

function applyGrouping(data: any[]) {
  const expandedGroupsKey = Array.from(localExpandedGroups.value)
    .sort()
    .join('|');
  const visibleColumnConfigs = props.columnConfigs.filter((col) => col.visible);
  const cacheKey = `${localGroupColumns.value.join('|')}_${expandedGroupsKey}_${data.length}_${visibleColumnConfigs.length}`;

  if (groupingCache.has(cacheKey)) {
    const cachedResult = groupingCache.get(cacheKey);
    if (cachedResult) {
      syncHotData(cachedResult);
      return;
    }
  }

  let columnsConfig = [];

  if (localGroupColumns.value.length > 0) {
    const groupedColumnSet = new Set(localGroupColumns.value);
    const filteredColumns = visibleColumnConfigs
      .filter((col) => !groupedColumnSet.has(col.data))
      .map((col) => {
        const isNumeric = numericColumns.value.has(col.data);
        return {
          ...col,
          className: isNumeric ? 'htRight' : col.className || 'htLeft',
        };
      });

    columnsConfig = [createGroupColumn(), ...filteredColumns];
  } else {
    columnsConfig = visibleColumnConfigs.map((col) => {
      const isNumeric = numericColumns.value.has(col.data);
      return {
        ...col,
        className: isNumeric ? 'htRight' : col.className || 'htLeft',
      };
    });
  }

  const nextSignature = columnsConfig.map((col) => col.data).join('|');
  const prevSignature = currentColumnsRef.value
    .map((col) => col.data)
    .join('|');
  if (nextSignature !== prevSignature) {
    currentColumnsRef.value = columnsConfig;
  }

  const newHiddenColumnIndexes: number[] = [];
  columnsConfig.forEach((col, index) => {
    if (hiddenColumnDataRefs.value.has(col.data)) {
      newHiddenColumnIndexes.push(index);
    }
  });
  const prevHidden = hiddenColumnsRef.value;
  const hiddenUnchanged =
    prevHidden.length === newHiddenColumnIndexes.length &&
    prevHidden.every((v, i) => v === newHiddenColumnIndexes[i]);
  if (!hiddenUnchanged) {
    hiddenColumnsRef.value = newHiddenColumnIndexes;
  }

  let rows: any[];
  if (localGroupColumns.value.length === 0) {
    rows = data.map((item) => ({
      ...item,
      _isDataRow: true,
    }));
  } else {
    rows = buildTreeStructure(data, localGroupColumns.value);
  }

  if (data.length > 0) {
    rows = [...rows, calculateTotalRow()];
  }

  groupingCache.set(cacheKey, rows);
  syncHotData(rows);
}

function buildTreeStructure(
  data: any[],
  groupCols: string[],
  level: number = 0,
): any[] {
  const expandedGroupsKey = Array.from(localExpandedGroups.value)
    .sort()
    .join('|');
  const cacheKey = `${groupCols.join('|')}_${level}_${data.length}_${expandedGroupsKey}`;
  if (treeStructureCache.has(cacheKey)) {
    return treeStructureCache.get(cacheKey)!;
  }

  if (groupCols.length === 0) {
    return data.map((item) => ({
      ...item,
      _groupLevel: level,
      _isDataRow: true,
    }));
  }

  const [currentGroupCol, ...remainingGroupCols] = groupCols;
  const groups = new Map<string, any[]>();
  data.forEach((item) => {
    const groupValue = item[currentGroupCol as string] || '空值';
    if (!groups.has(groupValue)) {
      groups.set(groupValue, []);
    }
    groups.get(groupValue)?.push(item);
  });

  const columnKeys = props.columnConfigs
    .filter((col) => col.visible)
    .map((col) => col.data);
  const numericSet = numericColumns.value;
  const result: any[] = [];

  groups.forEach((items, groupName) => {
    const aggregatedRow: any = {
      [currentGroupCol as string]: groupName,
    };

    fillAggregatedColumns(aggregatedRow, {
      items,
      columnKeys,
      currentGroupCol,
      numericColumnKeys: numericSet,
    });

    aggregatedRow._isGroupRow = true;
    aggregatedRow._groupName = `${groupName}(${items.length})`;
    aggregatedRow._groupKey = `${currentGroupCol}|${groupName}|${level}`;
    aggregatedRow._groupLevel = level;
    aggregatedRow._groupItems = items;
    aggregatedRow._hasChildren =
      remainingGroupCols.length > 0 || items.length > 0;

    result.push(aggregatedRow);

    const isExpanded = localExpandedGroups.value.has(aggregatedRow._groupKey);

    if (isExpanded) {
      if (remainingGroupCols.length > 0) {
        result.push(
          ...buildTreeStructure(items, remainingGroupCols, level + 1),
        );
      } else {
        result.push(
          ...items.map((item) => ({
            ...item,
            _groupLevel: level + 1,
            _isDataRow: true,
            _originalData: item._originalData,
          })),
        );
      }
    }
  });

  treeStructureCache.set(cacheKey, result);
  return result;
}

function buildFullExportTree(
  data: any[],
  groupCols: string[],
  level: number = 0,
): any[] {
  if (groupCols.length === 0) {
    return data.map((item) => ({
      ...item,
      _groupLevel: level,
      _isDataRow: true,
    }));
  }

  const [currentGroupCol, ...remainingGroupCols] = groupCols;
  const groups = new Map<string, any[]>();
  data.forEach((item) => {
    const groupValue =
      (currentGroupCol && item[currentGroupCol as string]) || '空值';
    if (!groups.has(groupValue)) {
      groups.set(groupValue, []);
    }
    groups.get(groupValue)?.push(item);
  });

  const columnKeys = props.hotColumns.map((col) => col.data);
  const numericSet = numericColumns.value;
  const result: any[] = [];

  groups.forEach((items, groupName) => {
    const aggregatedRow: any = {
      [currentGroupCol as string]: groupName,
    };

    fillAggregatedColumns(aggregatedRow, {
      items,
      columnKeys,
      currentGroupCol,
      numericColumnKeys: numericSet,
    });

    aggregatedRow._isGroupRow = true;
    aggregatedRow._groupName = `${groupName}(${items.length})`;
    aggregatedRow._groupLevel = level;
    aggregatedRow._hasChildren =
      remainingGroupCols.length > 0 || items.length > 0;

    result.push(aggregatedRow);

    if (remainingGroupCols.length > 0) {
      result.push(...buildFullExportTree(items, remainingGroupCols, level + 1));
    } else {
      result.push(
        ...items.map((item) => ({
          ...item,
          _groupLevel: level + 1,
          _isDataRow: true,
          _originalData: item._originalData,
        })),
      );
    }
  });

  return result;
}

function calculateTotalRow(): any {
  const totalRow: any = {
    _isTotalRow: true,
  };

  const visibleColumns = props.columnConfigs.filter((col) => col.visible);
  visibleColumns.forEach((col) => {
    totalRow[col.data] = '';
  });

  if (localGroupColumns.value.length > 0) {
    totalRow._groupDisplay = '合计';
  } else if (visibleColumns.length > 0) {
    totalRow[visibleColumns[0].data] = '合计';
  }

  const originalDataArray = props.originalData;

  numericColumns.value.forEach((colName) => {
    let sum = 0;
    for (const item of originalDataArray) {
      sum += parseNumeric(item[colName]);
    }
    totalRow[colName] = originalDataArray.length > 0 ? sum.toFixed(2) : '0.00';
  });

  // 利润率单独按「利润 ÷ |应付|」重算；应付为 0 时置空
  let totalReceivableSum = 0;
  let totalPayableSum = 0;
  for (const item of originalDataArray) {
    totalReceivableSum += parseNumeric(item.totalReceivable);
    totalPayableSum += Math.abs(parseNumeric(item.totalPayable));
  }
  totalRow.totalProfitRate =
    totalPayableSum !== 0
      ? (totalReceivableSum - totalPayableSum) / totalPayableSum
      : null;

  applyLocalCurrencyToAggregate(
    totalRow,
    originalDataArray,
    props.hotColumns.map((col) => col.data),
  );

  return totalRow;
}

function removeGroupColumn(columnName: string) {
  const index = localGroupColumns.value.indexOf(columnName);
  if (index > -1) {
    const newGroupColumns = [...localGroupColumns.value];
    newGroupColumns.splice(index, 1);
    localGroupColumns.value = newGroupColumns;
    emit('update:groupColumns', newGroupColumns);

    localExpandedGroups.value = new Set();
    emit('update:expandedGroups', new Set());
    clearCaches();

    if (dataSource.value.length > 0) {
      applyGrouping(dataSource.value);
    }

    message.success(
      `已移除分组 "${columnTitleMap.value[columnName] || columnName}"`,
    );
  }
}

function clearAllGroups() {
  if (localGroupColumns.value.length === 0) return;

  localGroupColumns.value = [];
  emit('update:groupColumns', []);
  localExpandedGroups.value = new Set();
  emit('update:expandedGroups', new Set());
  clearCaches();

  if (dataSource.value.length > 0) {
    applyGrouping(dataSource.value);
  }

  message.success('已清空所有分组');
}

function handleGroupTagDragStart(
  e: DragEvent,
  columnData: string,
  index: number,
) {
  draggedGroupIndex.value = index;

  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnData);
    e.dataTransfer.setData('application/index', String(index));
  }

  setTimeout(() => {
    const target = e.target as HTMLElement;
    if (target) {
      target.style.opacity = '0.5';
    }
  }, 0);
}

function handleGroupTagDragOver(e: DragEvent, index: number) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  dragOverGroupIndex.value = index;
}

function handleGroupTagDrop(e: DragEvent, dropIndex: number) {
  e.preventDefault();

  const dragIndexStr = e.dataTransfer?.getData('application/index');
  const columnData = e.dataTransfer?.getData('text/plain');

  if (!dragIndexStr || !columnData) return;

  const dragIndex = Number.parseInt(dragIndexStr, 10);
  if (dragIndex === dropIndex) return;

  const newGroupColumns = [...localGroupColumns.value];
  const [movedItem] = newGroupColumns.splice(dragIndex, 1);
  newGroupColumns.splice(dropIndex, 0, movedItem!);

  localGroupColumns.value = newGroupColumns;
  emit('update:groupColumns', newGroupColumns);

  localExpandedGroups.value = new Set();
  emit('update:expandedGroups', new Set());

  if (dataSource.value.length > 0) {
    applyGrouping(dataSource.value);
  }

  message.success('分组顺序已调整');

  draggedGroupIndex.value = null;
  dragOverGroupIndex.value = null;
}

function handleGroupTagDragEnd(e: DragEvent) {
  draggedGroupIndex.value = null;
  dragOverGroupIndex.value = null;

  const target = e.target as HTMLElement;
  if (target) {
    target.style.opacity = '1';
  }
}

function onAfterOnCellDblClick(
  _event: any,
  coords: any,
  _TD: HTMLTableCellElement,
) {
  if (coords.row >= 0 && coords.row < tableData.value.length) {
    const rowData = tableData.value[coords.row];
    if (
      rowData &&
      rowData._isDataRow &&
      rowData._originalData &&
      !rowData._isTotalRow
    ) {
      emit('viewDetail', rowData._originalData);
    }
  }
}

function formatExportCellValue(colData: string, value: any) {
  if (colData === 'totalProfitRate' && value != null && value !== '') {
    return `${(Number.parseFloat(value) * 100).toFixed(2)}%`;
  }
  return value;
}

async function handleExport() {
  if (dataSource.value.length === 0) {
    message.warning('没有数据可导出');
    return;
  }
  if (exporting.value) return;

  exporting.value = true;
  try {
    const XLSX = await import('xlsx');

    let exportData: any[] = [];
    let headers: string[] = [];
    let headerTitles: string[] = [];

    if (localGroupColumns.value.length > 0) {
      const currentColumns = currentColumnsRef.value;
      headers = currentColumns.map((col) => col.data!).filter(Boolean);
      headerTitles = currentColumns
        .map((col) =>
          col.data === '_groupDisplay'
            ? '分组'
            : columnTitleMap.value[col.data!] || col.data!,
        )
        .filter(Boolean);

      const fullExportTree = buildFullExportTree(
        dataSource.value,
        localGroupColumns.value,
      );
      const totalRow = calculateTotalRow();

      for (const row of [...fullExportTree, totalRow]) {
        const exportRow: Record<string, any> = {};

        for (const colData of headers) {
          if (!colData) continue;
          if (colData === '_groupDisplay') {
            if (row._isGroupRow) {
              exportRow[colData] = row._groupName;
            } else if (row._isTotalRow) {
              exportRow[colData] = '合计';
            } else if (row._isDataRow) {
              const indentLevel = (row._groupLevel || 0) + 1;
              exportRow[colData] = '•'.repeat(indentLevel);
            } else {
              exportRow[colData] = '';
            }
          } else {
            exportRow[colData] = formatExportCellValue(
              colData,
              (row as any)[colData] ?? '',
            );
          }
        }

        exportData.push(exportRow);
      }
    } else {
      const currentColumns = currentColumnsRef.value;
      headers = currentColumns.map((col) => col.data!).filter(Boolean);
      headerTitles = currentColumns
        .map((col) => columnTitleMap.value[col.data!] || col.data!)
        .filter(Boolean);

      const totalRow = calculateTotalRow();
      const allData = [...dataSource.value, totalRow];

      for (const row of allData) {
        const exportRow: Record<string, any> = {};
        for (const col of currentColumns) {
          exportRow[col.data!] = formatExportCellValue(
            col.data!,
            row[col.data!] ?? '',
          );
        }
        exportData.push(exportRow);
      }
    }

    const wsData: any[][] = [];
    wsData.push(headerTitles);

    for (const row of exportData) {
      const rowData: any[] = [];
      for (const header of headers) {
        rowData.push(row[header]);
      }
      wsData.push(rowData);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const colWidths = headers.map((header, index) => {
      const title = headerTitles[index] || header;
      let maxWidth = Math.min(50, Math.max(10, title.length + 2));

      for (const row of exportData) {
        const cellValue = String(row[header] || '');
        const cellLength = cellValue.length;
        if (cellLength > maxWidth && cellLength <= 50) {
          maxWidth = cellLength + 2;
        }
      }

      return { wch: maxWidth };
    });

    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, props.reportTitle);

    const timestamp =
      new Date().toLocaleDateString('zh-CN').replaceAll('/', '') +
      '_' +
      new Date().toLocaleTimeString('zh-CN').replaceAll(':', '');
    XLSX.writeFile(wb, `${props.reportTitle}_${timestamp}.xlsx`);

    message.success('导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    message.error('导出失败，请稍后重试');
  } finally {
    exporting.value = false;
  }
}

componentInstance.applyGrouping = applyGrouping;
</script>

<template>
  <div
    class="group-area mb-2 flex items-center rounded border px-4 transition-all duration-300"
  >
    <div class="flex w-full items-center gap-2">
      <span class="flex items-center text-sm font-medium text-gray-700">
        <svg
          class="mr-1 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
        分组
      </span>

      <div
        v-if="!hasGrouping"
        class="group-area-tags flex flex-1 items-center rounded border-2 border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-500"
      >
        <span class="font-medium">右键列标题可添加分组</span>
        <span class="mx-2 text-gray-300">|</span>
        <span>单击列头排序</span>
      </div>

      <div
        v-else
        class="group-area-tags flex flex-1 flex-wrap gap-2"
        :class="{ 'sortable-over': dragOverGroupIndex !== null }"
      >
        <Tag
          v-for="(col, index) in localGroupColumns"
          :key="col"
          closable
          draggable="true"
          class="group-tag cursor-grab rounded-md border transition-all duration-200 hover:shadow-md"
          :class="{
            'scale-95 opacity-50': draggedGroupIndex === index,
            'group-tag--over': dragOverGroupIndex === index,
            'group-tag--hover': hoverColumnData === col,
            'group-tag--idle': hoverColumnData !== col,
          }"
          @dragstart="handleGroupTagDragStart($event, col, index)"
          @dragover.prevent="handleGroupTagDragOver($event, index)"
          @drop="handleGroupTagDrop($event, index)"
          @dragend="handleGroupTagDragEnd"
          @mouseenter="hoverColumnData = col"
          @mouseleave="hoverColumnData = null"
          @close="
            (e: Event) => {
              e.preventDefault();
              removeGroupColumn(col);
            }
          "
        >
          <span class="inline-flex items-center gap-1 whitespace-nowrap">
            <svg
              v-if="hoverColumnData === col || draggedGroupIndex === index"
              class="h-3 w-3 flex-shrink-0 cursor-grab active:cursor-grabbing"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 8h16M4 16h16"
              />
            </svg>
            <span class="font-medium">{{ columnTitleMap[col] || col }}</span>
            <span class="group-tag__level"> {{ index + 1 }}级 </span>
          </span>
        </Tag>
      </div>

      <div class="flex shrink-0 items-center gap-2">
        <span v-if="recordCount > 0" class="text-xs text-gray-500">
          共 {{ recordCount }} 条
        </span>
        <template v-if="hasGrouping">
          <Button size="small" type="text" @click="expandAllGroups">
            全部展开
          </Button>
          <Button size="small" type="text" @click="collapseAllGroups">
            全部收起
          </Button>
          <Button
            size="small"
            type="text"
            danger
            class="text-xs"
            @click="clearAllGroups"
          >
            清空
          </Button>
        </template>
        <Button
          type="primary"
          size="small"
          :loading="exporting"
          :disabled="recordCount === 0 || loading"
          @click="handleExport"
        >
          导出
        </Button>
      </div>
    </div>
  </div>

  <Card class="table-card" :bordered="false">
    <Spin :spinning="loading || exporting">
      <div ref="containerRef" class="handsontable-container">
        <HotTable ref="hotTableRef" :settings="hotSettings" />
        <div v-if="!loading && recordCount === 0" class="report-empty-overlay">
          <Empty description="暂无数据，请调整筛选条件后查询" />
        </div>
      </div>
    </Spin>
  </Card>
</template>

<style scoped lang="scss">
.group-area {
  flex-shrink: 0;
  width: 100%;
  min-width: 200px;
  min-height: 48px;
  padding: 8px 16px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--primary) / 3%) 70%,
    hsl(var(--background)) 100%
  );

  :deep(.ant-tag) {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    min-height: 28px;
    padding: 4px 8px;
    white-space: nowrap;
    cursor: grab;
    user-select: none;
    transition: all 0.2s ease;

    .ant-tag-close-icon {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      margin-left: 6px;
      font-size: 16px;
      line-height: 22px;
      cursor: pointer;
      border-radius: 50%;
      transition: all 0.2s ease;

      &:hover {
        color: #ff4d4f;
        background-color: rgb(0 0 0 / 15%);
        transform: scale(1.15);
      }

      &:active {
        background-color: rgb(0 0 0 / 20%);
        transform: scale(0.95);
      }
    }

    &:active {
      cursor: grabbing;
    }

    &:hover {
      box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
      transform: translateY(-1px);
    }
  }
}

.group-tag--over {
  box-shadow: 0 0 0 2px hsl(var(--primary) / 45%);
}

.group-tag--hover {
  color: #fff;
  background: hsl(var(--primary));
  border-color: hsl(var(--primary));
}

.group-tag--idle {
  background: hsl(var(--background));
  border-color: hsl(var(--border));
}

.group-tag__level {
  flex-shrink: 0;
  padding: 0 6px;
  margin-left: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: hsl(var(--primary));
  background: hsl(var(--primary) / 10%);
  border-radius: 4px;
}

.group-tag--hover .group-tag__level {
  color: #fff;
  background: rgb(255 255 255 / 20%);
}

.group-area-tags {
  min-height: 32px;
  padding: 4px;
  transition: all 0.3s;

  &.sortable-over {
    background-color: hsl(var(--primary) / 8%);
    border: 2px dashed hsl(var(--primary));
    border-radius: 6px;
  }
}

.table-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0;
    overflow: hidden;
  }

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }
}

.handsontable-container {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow: hidden;

  :deep(.handsontable) {
    font-size: 13px;

    /* Chrome 121+ 中 scrollbar-color 非 auto 时会改用标准滚动条（Windows 上约 15px）并忽略
       ::-webkit-scrollbar 样式，导致实际滚动条宽度与 Handsontable 检测的全局滚动条宽度（10px）
       不一致，横向滚动到底时表头克隆层与主表错位；恢复 auto 使 webkit 滚动条样式生效 */
    scrollbar-color: auto;

    .wtHolder {
      scrollbar-color: auto;

      &::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
    }

    .htCore {
      td {
        box-sizing: border-box;
        height: 32px;
        padding: 4px 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: middle;
        white-space: nowrap;
        cursor: pointer;
      }

      td.report-total-cell {
        font-weight: bold !important;
        background-color: #f0f0f0 !important;
      }

      td.report-group-cell {
        font-weight: bold;
        cursor: pointer;
        background-color: #fafafa29 !important;
      }

      td.report-group-label {
        background-color: hsl(var(--primary) / 12%) !important;
      }

      td.report-detail-cell {
        background-color: #fafafa29 !important;
      }

      td.report-days-early {
        color: #52c41a;
      }

      td.report-days-due {
        color: #faad14;
      }

      td.report-days-overdue {
        color: #f5222d;
      }

      th {
        box-sizing: border-box;
        height: 32px;
        padding: 4px;
        font-weight: 600;
        vertical-align: middle;
        color: #fff;
        text-align: center;
        cursor: pointer;
        background-color: hsl(var(--primary)) !important;
      }

      thead th:first-child {
        cursor: default;
      }
    }

    .ht_clone_inline_start .htCore tbody th {
      box-sizing: border-box;
      height: 32px !important;
    }

    .ht_clone_top th,
    .ht_clone_top_inline_start_corner th,
    .ht_clone_bottom th,
    .ht_clone_bottom_inline_start_corner th {
      color: #fff;
      background-color: hsl(var(--primary)) !important;
    }

    /*
     * fixedRowsBottom 会在主表下方叠一层克隆表，主表末行底边 + 克隆首行顶边
     * 叠成双线。去掉克隆层顶边，只保留主表单元格底边。
     */
    .ht_clone_bottom .htCore tbody tr:first-child td,
    .ht_clone_bottom .htCore tbody tr:first-child th,
    .ht_clone_bottom_inline_start_corner .htCore tbody tr:first-child td,
    .ht_clone_bottom_inline_start_corner .htCore tbody tr:first-child th {
      border-top: none !important;
    }
  }
}

.report-empty-overlay {
  position: absolute;
  inset: 40px 0 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  background: hsl(var(--background) / 80%);
}
</style>
