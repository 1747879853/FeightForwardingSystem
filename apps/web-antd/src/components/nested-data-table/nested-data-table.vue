<script setup lang="ts">
import { computed, reactive, watch } from 'vue';

defineOptions({ name: 'NestedDataTable' });

type RowKey = number | string;
type RowKeyGetter = ((record: any) => RowKey) | string;

interface Column {
  align?: 'center' | 'left' | 'right';
  className?: string;
  dataIndex?: string;
  field?: string;
  key?: string;
  title?: string;
  type?: string;
  width?: number | string;
}

interface Props {
  columns: Column[];
  dataSource: any[];
  expandedRowKeys?: RowKey[];
  /** 为 true 时占满父容器高度，由父级分配剩余空间；与 maxHeight 互斥优先 */
  fillHeight?: boolean;
  innerColumns: Column[];
  innerDataKey?: string;
  innerRowKey?: RowKeyGetter;
  loading?: boolean;
  maxHeight?: number;
  /** 表头拖拽调列宽，默认开启 */
  resizable?: boolean;
  rowKey?: RowKeyGetter;
}

const props = withDefaults(defineProps<Props>(), {
  expandedRowKeys: () => [],
  fillHeight: false,
  innerDataKey: 'children',
  innerRowKey: 'id',
  loading: false,
  maxHeight: 500,
  resizable: true,
  rowKey: 'id',
});

const emit = defineEmits<{
  'update:expandedRowKeys': [keys: RowKey[]];
}>();

const MIN_COL_WIDTH = 60;

/** 用户拖拽后的外层列宽（px），按列 key 存 */
const outerWidths = reactive<Record<string, number>>({});
/** 用户拖拽后的内层列宽（px） */
const innerWidths = reactive<Record<string, number>>({});

const scrollStyle = computed(() => {
  if (props.fillHeight) return undefined;
  return {
    maxHeight: `${props.maxHeight}px`,
  };
});

function getRowKey(record: any, index: number, getter: RowKeyGetter): RowKey {
  if (typeof getter === 'function') return getter(record);
  return record?.[getter] ?? index;
}

function getOuterRowKey(record: any, index: number) {
  return getRowKey(record, index, props.rowKey);
}

function getInnerRowKey(record: any, index: number) {
  return getRowKey(record, index, props.innerRowKey);
}

function getInnerRows(record: any) {
  const rows = record?.[props.innerDataKey];
  return Array.isArray(rows) ? rows : [];
}

function isExpanded(record: any, index: number) {
  return props.expandedRowKeys.includes(getOuterRowKey(record, index));
}

function toggleExpanded(record: any, index: number, event?: Event) {
  event?.stopPropagation();
  const key = getOuterRowKey(record, index);
  const keys = isExpanded(record, index)
    ? props.expandedRowKeys.filter((item) => item !== key)
    : [...props.expandedRowKeys, key];
  emit('update:expandedRowKeys', keys);
}

function columnKey(column: Column, index: number) {
  return String(column.key || column.dataIndex || index);
}

function parseWidth(width?: number | string): number | undefined {
  if (typeof width === 'number' && Number.isFinite(width)) return width;
  if (typeof width === 'string') {
    const n = Number.parseFloat(width);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function columnWidth(width?: number | string) {
  if (typeof width === 'number') return `${width}px`;
  return width;
}

/**
 * 最后一列不写死宽度：table width:100% + fixed 时，剩余宽度只进这一列，
 * 展开列才能保持 32px（否则会按比例被撑开）。
 * 用户拖过该列后写入 outerWidths，则固定为拖拽宽度。
 */
function outerColStyle(column: Column, index: number) {
  const key = columnKey(column, index);
  const dragged = outerWidths[key];
  if (dragged != null) return { width: `${dragged}px` };
  if (index === props.columns.length - 1) return undefined;
  return { width: columnWidth(column.width) };
}

function innerColStyle(column: Column, index: number) {
  const key = columnKey(column, index);
  const dragged = innerWidths[key];
  if (dragged != null) return { width: `${dragged}px` };
  return { width: columnWidth(column.width) };
}

function resolveStartWidth(
  column: Column,
  index: number,
  widths: Record<string, number>,
  th: HTMLElement,
) {
  const key = columnKey(column, index);
  return widths[key] ?? parseWidth(column.width) ?? th.offsetWidth;
}

function startColumnResize(
  event: MouseEvent,
  column: Column,
  index: number,
  widths: Record<string, number>,
) {
  if (!props.resizable) return;
  event.preventDefault();
  event.stopPropagation();

  const th = event.currentTarget as HTMLElement | null;
  const header = th?.closest('th') as HTMLElement | null;
  if (!header) return;

  const key = columnKey(column, index);
  const startX = event.clientX;
  const startWidth = resolveStartWidth(column, index, widths, header);

  const onMove = (e: MouseEvent) => {
    widths[key] = Math.max(MIN_COL_WIDTH, startWidth + (e.clientX - startX));
  };
  const onUp = () => {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
  };
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function cellValue(record: any, column: Column) {
  return column.dataIndex ? record?.[column.dataIndex] : '';
}

function columnClass(column: Column) {
  return [`is-${column.align || 'left'}`, column.className];
}

/** 列定义变更时清掉已不存在的拖拽宽度，避免 key 泄漏 */
watch(
  () => props.columns.map((c, i) => columnKey(c, i)).join('|'),
  (keys) => {
    const set = new Set(keys.split('|'));
    for (const key of Object.keys(outerWidths)) {
      if (!set.has(key)) delete outerWidths[key];
    }
  },
);

watch(
  () => props.innerColumns.map((c, i) => columnKey(c, i)).join('|'),
  (keys) => {
    const set = new Set(keys.split('|'));
    for (const key of Object.keys(innerWidths)) {
      if (!set.has(key)) delete innerWidths[key];
    }
  },
);
</script>

<template>
  <div
    class="nested-data-table"
    :class="{
      'nested-data-table--fill': fillHeight,
      'nested-data-table--resizable': resizable,
    }"
  >
    <div class="nested-data-table__scroll" :style="scrollStyle">
      <table class="nested-data-table__outer">
        <colgroup>
          <col class="nested-data-table__expand-col" />
          <col
            v-for="(column, colIndex) in columns"
            :key="column.key || column.dataIndex"
            :style="outerColStyle(column, colIndex)"
          />
        </colgroup>
        <thead>
          <tr>
            <th class="nested-data-table__expand-cell">
              <slot name="expandColumnTitle" />
            </th>
            <th
              v-for="(column, colIndex) in columns"
              :key="column.key || column.dataIndex"
              :class="columnClass(column)"
            >
              <slot name="outerHeaderCell" :column="column">
                {{ column.title }}
              </slot>
              <span
                v-if="resizable"
                class="nested-data-table__resizer"
                @mousedown="
                  startColumnResize($event, column, colIndex, outerWidths)
                "
              />
            </th>
          </tr>
        </thead>

        <tbody v-if="loading">
          <tr>
            <td :colspan="columns.length + 1" class="nested-data-table__state">
              <span class="nested-data-table__spinner"></span>
              加载中
            </td>
          </tr>
        </tbody>

        <tbody v-else-if="dataSource.length === 0">
          <tr>
            <td :colspan="columns.length + 1" class="nested-data-table__state">
              暂无费用明细
            </td>
          </tr>
        </tbody>

        <tbody v-else>
          <template
            v-for="(record, index) in dataSource"
            :key="getOuterRowKey(record, index)"
          >
            <tr class="nested-data-table__outer-row">
              <td class="nested-data-table__expand-cell">
                <slot
                  name="expandIcon"
                  :expanded="isExpanded(record, index)"
                  :record="record"
                  :on-expand="
                    (row: any, event?: Event) =>
                      toggleExpanded(row, index, event)
                  "
                >
                  <button
                    type="button"
                    class="nested-data-table__expand-button"
                    :aria-expanded="isExpanded(record, index)"
                    @click="toggleExpanded(record, index, $event)"
                  >
                    {{ isExpanded(record, index) ? '▼' : '▶' }}
                  </button>
                </slot>
              </td>
              <td
                v-for="column in columns"
                :key="column.key || column.dataIndex"
                :class="columnClass(column)"
              >
                <slot
                  name="outerBodyCell"
                  :column="column"
                  :record="record"
                  :index="index"
                  :text="cellValue(record, column)"
                >
                  {{ cellValue(record, column) }}
                </slot>
              </td>
            </tr>

            <tr
              v-if="isExpanded(record, index)"
              class="nested-data-table__expanded-row"
            >
              <td :colspan="columns.length + 1">
                <div class="nested-data-table__expanded">
                  <table class="nested-data-table__inner">
                    <colgroup>
                      <col
                        v-for="(column, colIndex) in innerColumns"
                        :key="column.key || column.dataIndex"
                        :style="innerColStyle(column, colIndex)"
                      />
                    </colgroup>
                    <thead>
                      <tr>
                        <th
                          v-for="(column, colIndex) in innerColumns"
                          :key="column.key || column.dataIndex"
                          :class="columnClass(column)"
                        >
                          <slot
                            name="innerHeaderCell"
                            :column="column"
                            :parent-record="record"
                          >
                            {{ column.title }}
                          </slot>
                          <span
                            v-if="resizable"
                            class="nested-data-table__resizer"
                            @mousedown="
                              startColumnResize(
                                $event,
                                column,
                                colIndex,
                                innerWidths,
                              )
                            "
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody v-if="getInnerRows(record).length > 0">
                      <tr
                        v-for="(innerRecord, innerIndex) in getInnerRows(
                          record,
                        )"
                        :key="getInnerRowKey(innerRecord, innerIndex)"
                      >
                        <td
                          v-for="column in innerColumns"
                          :key="column.key || column.dataIndex"
                          :class="columnClass(column)"
                        >
                          <slot
                            name="innerBodyCell"
                            :column="column"
                            :record="innerRecord"
                            :index="innerIndex"
                            :parent-record="record"
                            :text="cellValue(innerRecord, column)"
                          >
                            {{ cellValue(innerRecord, column) }}
                          </slot>
                        </td>
                      </tr>
                    </tbody>
                    <tbody v-else>
                      <tr>
                        <td
                          :colspan="innerColumns.length"
                          class="nested-data-table__state nested-data-table__state--inner"
                        >
                          暂无明细
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
@keyframes nested-table-spin {
  to {
    transform: rotate(360deg);
  }
}

.nested-data-table {
  --table-border: #d4e4f4;
  --table-head: #f9fafb;
  --table-inner-head: #f9fafb;

  width: 100%;
  overflow: hidden;
  font-size: 12px;
  line-height: 18px;
  color: #1f2937;
  background: #fff;
}

.nested-data-table--fill,
.nested-data-table--fill .nested-data-table__scroll {
  height: 100%;
  min-height: 0;
}

.nested-data-table__scroll {
  width: 100%;
  overflow: auto;
  scrollbar-gutter: stable;
}

.nested-data-table__outer {
  width: 100%;
  table-layout: fixed;
  border-spacing: 0;
  border-collapse: separate;
}

.nested-data-table__inner {
  width: max-content;
  min-width: 0;
  max-width: 100%;
  table-layout: fixed;
  border-spacing: 0;
  border-collapse: separate;
}

.nested-data-table th,
.nested-data-table td {
  padding: 0 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  border: 0;
  border-bottom: 1px solid var(--table-border);
}

.nested-data-table th {
  position: relative;
  height: 35px;
  font-size: 11px;
  font-weight: 700;
  color: #6b7280;
  background: var(--table-head);
}

.nested-data-table__resizer {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  user-select: none;
  background: transparent;
}

.nested-data-table__resizer:hover,
.nested-data-table__resizer:active {
  background: #91caff;
}

.nested-data-table__outer-row > td {
  height: 46px;
  background: #fff;
}

.nested-data-table__outer > thead > tr > th,
.nested-data-table__outer > tbody > .nested-data-table__outer-row > td,
.nested-data-table__outer > tbody > .nested-data-table__expanded-row > td {
  border-bottom: 0;
}

.nested-data-table__outer-row:hover > td {
  background: #f8fbff;
}

/* 展开列固定 32px；多余宽度由最后一列（无 width 的 col）吸收 */
.nested-data-table__expand-col {
  width: 32px;
}

.nested-data-table__expand-cell {
  width: 32px;
  min-width: 32px;
  max-width: 32px;
  padding: 0 !important;
  vertical-align: middle;
  text-align: center;
}

.nested-data-table__expand-button {
  padding: 0;
  font: inherit;
  font-size: 10px;
  color: #4b5563;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.nested-data-table__expanded-row > td {
  height: auto;
  padding: 0;
  background: #fff;
}

.nested-data-table__expanded {
  padding-left: 32px;
  overflow-x: auto;
}

.nested-data-table__inner th {
  height: 32px;
  color: #657286;
  background: var(--table-inner-head);
}

.nested-data-table__inner td {
  height: 32px;
  background: #fff;
}

/* 内层行高紧凑，small 输入框对齐 32px 单元格 */
.nested-data-table__inner :deep(.ant-input-number-sm) {
  height: 24px;
}

.nested-data-table__inner :deep(.ant-input-number-sm input) {
  height: 22px;
}

.nested-data-table__inner tbody tr:last-child td {
  border-bottom: 1px solid var(--table-border);
}

.nested-data-table__state {
  height: 86px;
  color: #9ca3af;
  text-align: center;
  background: #fff;
}

.nested-data-table__state--inner {
  height: 52px;
}

.nested-data-table__spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  margin-right: 6px;
  vertical-align: -2px;
  border: 2px solid #dbeafe;
  border-top-color: #1677ff;
  border-radius: 50%;
  animation: nested-table-spin 0.8s linear infinite;
}

.is-center {
  text-align: center;
}

.is-right {
  text-align: right;
}

.is-left {
  text-align: left;
}
</style>
