<script lang="ts" setup>
import type { GroupFieldDef } from '#/components/list-grouping';

import { nextTick, onActivated, onMounted, onUnmounted, ref } from 'vue';

import { Page } from '@vben/common-ui';
import { IconifyIcon } from '@vben/icons';

import { DropdownButton, Menu, MenuItem, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  ExpenseSubmissionAdminApi,
  getOrderFeeTaskGroupedList,
  getOrderFeeTaskList,
  OrderFeeTaskBatchAudit,
} from '#/api/audit-approval/expense-admin';
import {
  GroupingSettings,
  GroupingTabs,
  useListGrouping,
} from '#/components/list-grouping';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';
import { toIsoEndOfDay, toIsoStartOfDay } from '#/utils/date-range-iso';

import { openAuditRemarkConfirm } from '../composables/use-audit-remark-confirm';
import { useExpenseAllColumns, useGridFormSchema } from '../data';
import Detail from './modules/detail.vue';

defineOptions({ name: 'ExpenseAll' });

function getRangeValue(
  value: unknown,
): [unknown | undefined, unknown | undefined] {
  return Array.isArray(value)
    ? [value[0] as unknown, value[1] as unknown]
    : [undefined, undefined];
}

// ==================== 分组统计配置 ====================

/**
 * 费用任务分组字段配置。
 * paramKey 既是「点击分组项后追加到列表查询」的参数名，
 * 也是与之互斥的搜索表单字段名。
 */
const ORDER_FEE_TASK_GROUP_FIELDS: GroupFieldDef[] = [
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.BLType,
    label: '装运方式',
    paramKey: 'BLType',
    emptyParamKey: 'BLTypeEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.BillType,
    label: '订单类型',
    paramKey: 'BillType',
    emptyParamKey: 'BillTypeEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Client,
    label: '委托单位',
    paramKey: 'ClientId',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Carrier,
    label: '船公司',
    paramKey: 'CarrierId',
    emptyParamKey: 'CarrierIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.POL,
    label: '起运港',
    paramKey: 'POLId',
    emptyParamKey: 'POLIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.POD,
    label: '目的港',
    paramKey: 'PODId',
    emptyParamKey: 'PODIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Vessel,
    label: '船名',
    paramKey: 'Vessel',
    emptyParamKey: 'VesselEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.CodeFrt,
    label: '付费方式',
    paramKey: 'CodeFrtId',
    emptyParamKey: 'CodeFrtIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.CodeIssueType,
    label: '签单方式',
    paramKey: 'CodeIssueTypeId',
    emptyParamKey: 'CodeIssueTypeIdEmpty',
  },
  {
    value: ExpenseSubmissionAdminApi.SeaExportGroupField.Yard,
    label: '场站',
    paramKey: 'YardId',
    emptyParamKey: 'YardIdEmpty',
  },
];

// 分组统计状态
const grouping = useListGrouping({
  fields: ORDER_FEE_TASK_GROUP_FIELDS,
  getGridApi: () => gridApi,
  fetchGroups: async (baseParams, field) => {
    const groupParams: any = {
      ...baseParams,
      groupField: field as ExpenseSubmissionAdminApi.SeaExportGroupField,
    };

    const items = await getOrderFeeTaskGroupedList(groupParams);

    // 港口分组用 isSea_id 组合 key，避免海港/空港 ID 冲突
    return (items ?? []).map((item) => ({
      ...item,
      id:
        (field === ExpenseSubmissionAdminApi.SeaExportGroupField.POL ||
          field === ExpenseSubmissionAdminApi.SeaExportGroupField.POD) &&
        item.isSea !== null &&
        item.isSea !== undefined
          ? `${item.isSea}_${item.id}`
          : item.id,
    }));
  },
});

/**
 * 费用审核状态默认「未处理」(Processed=false)。
 * 仅在默认值尚未写入「最近提交值」的早期查询里兜底；用户改成「全部」(null) 或清空后不再回填。
 */
let processedDefaultApplied = false;

const transportOrderId = ref<string>('');
const orderName = ref<string>('');
const entityId = ref<string>('');
const changeOrderId = ref<string | null>(null);
/** 提交审核时的负利润备注；展示在费用明细「提醒」右侧 */
const negativeProfitRemark = ref('');

/**
 * 清空选中的订单信息
 */
const clearSelectedOrder = () => {
  transportOrderId.value = '';
  entityId.value = '';
  orderName.value = '';
  changeOrderId.value = null;
  negativeProfitRemark.value = '';
};

const handleRowDblclick = ({
  row,
}: {
  row: ExpenseSubmissionAdminApi.OrderFeeTaskListDto;
}) => {
  const grid = gridApi.grid as any;
  if (grid && grid.setRadioRow) {
    grid.setRadioRow(row);
  }
  transportOrderId.value = row.transportOrder.id || '';
  entityId.value = row.entityId || '';
  changeOrderId.value = row.changeOrderId || null;
  negativeProfitRemark.value = String(row.remark ?? '').trim();
  const mblNum = row.transportOrder.mblNum || '--';
  orderName.value = `当前选中: ${mblNum}(${row.transportOrder.client?.name ?? ''})`;

  // 点行进详情时，必须把该行的 changeOrderId 原样回传
  if (detailRef.value) {
    detailRef.value.getTableDate(row.changeOrderId || null);
  }
};

const [Grid, gridApi] =
  useVbenVxeGrid<ExpenseSubmissionAdminApi.OrderFeeTaskListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      collapsedRows: 1,
      compact: true,
      // 标签略收窄，折叠态一行尽量塞下常用条件
      labelWidth: 72,
      wrapperClass: 'grid-cols-5',
    },
    gridEvents: {
      cellClick: handleRowDblclick,
    },
    gridOptions: {
      id: 'orderFeeTaskList',
      columns: useExpenseAllColumns(),
      height: 'auto',
      // 分页改大时只绘制视口内行列，避免整表插槽一次挂载
      virtualXConfig: { enabled: true, gt: 0 },
      virtualYConfig: { enabled: true, gt: 0 },
      radioConfig: {
        highlight: true,
        trigger: 'default',
      },
      rowConfig: {
        // ✅ 接口变更：行 key 从 entityId 改为 entityId + changeOrderId 组合
        // 同一票会出现多行（主单 + 各更改单），只用 entityId 会导致选中态串行、详情打开错行
        keyField: 'entityId + changeOrderId',
        isCurrent: true,
        // 虚拟滚动按这个高度算总高；不写会用约 21px，滚不到后面的行
        height: 40,
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        // 关闭自动加载：挂载后先默认分组再 submitForm 首查，
        // 保证「费用审核状态」默认值写入最近提交值，避免首查漏 Processed=false
        autoLoad: false,
        ajax: {
          query: createPagedListQuery(getOrderFeeTaskList, {
            mapParams: (formValues) => {
              // 每次查询前清空选中，避免费用明细残留旧数据
              clearSelectedOrder();

              const nextValues = { ...formValues };
              if (
                !processedDefaultApplied &&
                nextValues.Processed === undefined
              ) {
                nextValues.Processed = false;
              }
              processedDefaultApplied = true;

              const [etdStart, etdEnd] = getRangeValue(nextValues.ETDRange);
              const { ETDRange: _etdRange, ...restValues } = nextValues;
              let params = grouping.decorateListParams({
                ...restValues,
                ETDStart: toIsoStartOfDay(etdStart),
                ETDEnd: toIsoEndOfDay(etdEnd),
              });

              // 港口分组：把 isSea_id 拆回 IsSea + 真实港口 ID
              const field = grouping.enabledField.value;
              if (
                field &&
                (field.value ===
                  ExpenseSubmissionAdminApi.SeaExportGroupField.POL ||
                  field.value ===
                    ExpenseSubmissionAdminApi.SeaExportGroupField.POD)
              ) {
                const selectedId = grouping.selectedItemId.value;
                if (selectedId !== undefined && selectedId !== null) {
                  const parts = String(selectedId).split('_');
                  if (parts.length === 2) {
                    const isSea = parts[0] === 'true';
                    const realId = parts[1];
                    params = {
                      ...params,
                      IsSea: isSea,
                      [field.paramKey]: realId,
                    };
                    delete params[field.paramKey];
                    params[field.paramKey] = realId;
                  }
                }
              }

              return params;
            },
          }),
        },
      },
      toolbarConfig: {
        custom: true,
        export: false,
        //refresh: { code: 'query' },
        zoom: false,
      },
    },
  });

onMounted(async () => {
  // 默认按委托单位分组：只设状态不查询，再由 submitForm 统一首查
  const clientIdField = ORDER_FEE_TASK_GROUP_FIELDS.find(
    (field) => field.paramKey === 'ClientId',
  );
  if (clientIdField && !grouping.enabledField.value) {
    grouping.prepareField(clientIdField.value as number);
  }
  // submitForm 把表单默认值（含 Processed=false）写入「最近提交值」，
  // 后续分页/排序/分组切换走 query 时才能带上同一套条件
  await gridApi.formApi.submitForm();
  await nextTick();
  applyCappedDefault();
  window.addEventListener('resize', onSplitResize);
});

// 列表页 keepAlive，分组统计不做缓存：每次重新进入都拉一遍分组条数
let firstActivate = true;
onActivated(() => {
  if (firstActivate) {
    firstActivate = false;
    return;
  }
  grouping.refreshGroupData();
  nextTick(applyCappedDefault);
});

const onGroupFieldChange = (value: number | undefined) => {
  if (value === undefined) {
    grouping.disable();
  } else {
    grouping.enableField(value);
  }
};

const SubmittedOther = async (key: string) => {
  showConfirmWithRemark(true, key);
};

const detailRef = ref<any>(null);

/** 批量审核：按行精确传 items（transportOrderId + changeOrderId） */
const OrderFeeAudit = (
  approve: boolean,
  modalRemark: string,
  items: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditItemDto[],
) => {
  const dto: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditDto = {
    success: approve,
    remark: modalRemark,
    items,
  };

  OrderFeeTaskBatchAudit(dto).then(() => {
    message.success({
      content: $t('ui.actionMessage.operationSuccess'),
      key: 'action_process_msg',
    });
    gridApi.reload();
    grouping.refreshGroupData();
    if (detailRef.value) {
      detailRef.value.getTableDate();
    }
  });
};

const selectPass = (approve: boolean, modalRemark: string) => {
  const list =
    gridApi?.grid.getCheckboxRecords() as ExpenseSubmissionAdminApi.OrderFeeTaskListDto[];

  const items: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditItemDto[] =
    list.map((item) => ({
      transportOrderId: item.entityId || '',
      changeOrderId: item.changeOrderId || null,
    }));

  OrderFeeAudit(approve, modalRemark, items);
};

const allPass = (approve: boolean, modalRemark: string) => {
  const tableData = gridApi.grid.getTableData()
    .tableData as ExpenseSubmissionAdminApi.OrderFeeTaskListDto[];

  const items: ExpenseSubmissionAdminApi.OrderFeeTaskBatchAuditItemDto[] = (
    tableData ?? []
  ).map((item) => ({
    transportOrderId: item.entityId || '',
    changeOrderId: item.changeOrderId || null,
  }));

  OrderFeeAudit(approve, modalRemark, items);
};

const showConfirmWithRemark = (approve = true, type = '') => {
  openAuditRemarkConfirm({
    title: approve
      ? $t('auditApproval.task.okPass')
      : $t('auditApproval.task.noPass'),
    danger: !approve,
    onConfirm: (modalRemark) => {
      switch (type) {
        case 'all': {
          allPass(approve, modalRemark);
          break;
        }
        case 'selectPass': {
          selectPass(approve, modalRemark);
          break;
        }
      }
    },
  });
};

const feeTableType = ref('horizontal');
const changeTableType = (type: string) => {
  feeTableType.value = type;
};

// 票列表 / 费用明细上下分割。
// 未拖动过时沿用原来的高度：费用明细约 34%（矮屏 30%），并且不超过原来的 360 / 240 上限。
const SPLIT_STORAGE_KEY = 'expense-review-task-fee-split';
const splitAreaRef = ref<HTMLElement | null>(null);
const taskRatio = ref(66);
const isSplitDragging = ref(false);
const hasSavedSplit = ref(false);
let splitMove: ((event: MouseEvent) => void) | null = null;
let splitUp: (() => void) | null = null;

try {
  const saved = Number(localStorage.getItem(SPLIT_STORAGE_KEY));
  if (!Number.isNaN(saved) && saved > 0) {
    taskRatio.value = Math.min(85, Math.max(15, saved));
    hasSavedSplit.value = true;
  }
} catch {
  // 本地缓存不可用时用默认比例
}

const persistSplit = () => {
  try {
    localStorage.setItem(SPLIT_STORAGE_KEY, String(taskRatio.value));
  } catch {
    // 忽略写入失败（如隐私模式）
  }
};

const readMinHeight = (element: Element | null, fallback: number) => {
  if (!element) return fallback;
  const value = Number.parseFloat(getComputedStyle(element).minHeight);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const applyCappedDefault = () => {
  if (hasSavedSplit.value) return;
  const container = splitAreaRef.value;
  if (!container) return;
  const handleHeight =
    container.querySelector<HTMLElement>('.drag-handle-vertical')
      ?.offsetHeight ?? 10;
  const available = container.clientHeight - handleHeight;
  if (available <= 0) return;
  const short = window.matchMedia('(max-height: 820px)').matches;
  const taskMin = readMinHeight(
    container.querySelector('.expense-task-grid'),
    short ? 200 : 280,
  );
  const feeMin = readMinHeight(
    container.querySelector('.expense-fee-pane'),
    short ? 168 : 200,
  );
  const feeCap = short ? 240 : 360;
  const feeRatio = short ? 0.3 : 0.34;
  const feePx = Math.min(
    available - taskMin,
    feeCap,
    Math.max(feeMin, available * feeRatio),
  );
  if (feePx <= 0) return;
  taskRatio.value = ((available - feePx) / available) * 100;
};

const onSplitResize = () => {
  if (!hasSavedSplit.value && !isSplitDragging.value) applyCappedDefault();
};

const stopSplitDrag = () => {
  const wasDragging = isSplitDragging.value;
  isSplitDragging.value = false;
  if (splitMove) document.removeEventListener('mousemove', splitMove);
  if (splitUp) document.removeEventListener('mouseup', splitUp);
  splitMove = null;
  splitUp = null;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  if (wasDragging) {
    hasSavedSplit.value = true;
    persistSplit();
  }
};

const startSplitDrag = (event: MouseEvent) => {
  event.preventDefault();
  event.stopPropagation();
  const container = splitAreaRef.value;
  if (!container) return;

  isSplitDragging.value = true;
  const handleHeight = (event.currentTarget as HTMLElement).offsetHeight;

  splitMove = (moveEvent: MouseEvent) => {
    moveEvent.preventDefault();
    const rect = container.getBoundingClientRect();
    const available = rect.height - handleHeight;
    if (available <= 0) return;
    const taskMin = readMinHeight(
      container.querySelector('.expense-task-grid'),
      200,
    );
    const feeMin = readMinHeight(
      container.querySelector('.expense-fee-pane'),
      168,
    );
    if (available <= taskMin + feeMin) return;
    const taskPx = Math.min(
      available - feeMin,
      Math.max(taskMin, moveEvent.clientY - rect.top),
    );
    taskRatio.value = (taskPx / available) * 100;
  };
  splitUp = stopSplitDrag;
  document.addEventListener('mousemove', splitMove);
  document.addEventListener('mouseup', splitUp);
  document.body.style.cursor = 'row-resize';
  document.body.style.userSelect = 'none';
};

const resetSplit = () => {
  hasSavedSplit.value = false;
  try {
    localStorage.removeItem(SPLIT_STORAGE_KEY);
  } catch {
    // 忽略清理失败
  }
  applyCappedDefault();
};

onUnmounted(() => {
  window.removeEventListener('resize', onSplitResize);
  if (splitMove) document.removeEventListener('mousemove', splitMove);
  if (splitUp) document.removeEventListener('mouseup', splitUp);
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
});
</script>

<template>
  <!-- 票列表与费用明细按比例分高，中间拖拽条可调；默认仍是费用明细约占三分之一。 -->
  <Page
    auto-content-height
    content-class="expense-review-page flex flex-col overflow-hidden"
  >
    <div
      ref="splitAreaRef"
      class="expense-review-split flex min-h-0 min-w-0 flex-1 flex-col"
      :class="{ 'is-resizing': isSplitDragging }"
    >
      <Grid
        class="expense-task-grid min-h-[280px] min-w-0"
        :style="{ flex: `${taskRatio} 1 0%` }"
      >
        <!-- 工具栏左侧插槽始终挂载，避免开启分组时 table-title 与插槽切换导致 vxe options 重算并重置列设置 -->
        <template #toolbar-actions>
          <GroupingTabs
            v-if="grouping.isGrouping.value"
            :items="grouping.groupItems.value"
            :selected-id="grouping.selectedItemId.value"
            :loading="grouping.loading.value"
            @select="grouping.selectItem"
          />
          <div v-else class="flex text-base font-medium">
            <span>{{ $t('auditApproval.expenseReview.title') }}</span>
          </div>
        </template>
        <template #toolbar-tools>
          <DropdownButton @click="SubmittedOther('selectPass')" type="primary">
            {{ $t('auditApproval.task.selectPass') }}
            <template #overlay>
              <Menu @click="showConfirmWithRemark(true, 'all')">
                <MenuItem>
                  {{ $t('auditApproval.task.allPass') }}
                </MenuItem>
              </Menu>
            </template>
          </DropdownButton>
          <span class="split mx-2 flex">|</span>
          <div class="layout-capsule" role="group" aria-label="费用明细布局">
            <button
              type="button"
              class="layout-capsule__item"
              :class="{ 'is-active': feeTableType === 'vertical' }"
              @click="changeTableType('vertical')"
            >
              <IconifyIcon icon="boxicons:arrow-down-up" class="size-3.5" />
              {{ $t('auditApproval.tableType.vertical') }}
            </button>
            <button
              type="button"
              class="layout-capsule__item"
              :class="{ 'is-active': feeTableType === 'horizontal' }"
              @click="changeTableType('horizontal')"
            >
              <IconifyIcon icon="boxicons:arrow-left-right" class="size-3.5" />
              {{ $t('auditApproval.tableType.horizontal') }}
            </button>
          </div>
          <GroupingSettings
            :fields="grouping.fields"
            :value="grouping.enabledField.value?.value"
            @change="onGroupFieldChange"
          />
        </template>
      </Grid>
      <div
        class="drag-handle drag-handle-vertical"
        :class="{ dragging: isSplitDragging }"
        title="拖动调整票列表与费用明细高度，双击恢复默认"
        @mousedown="startSplitDrag"
        @dblclick="resetSplit"
      >
        <div class="drag-line"></div>
      </div>
      <Detail
        class="expense-fee-pane min-h-[200px] min-w-0 overflow-hidden"
        :style="{ flex: `${100 - taskRatio} 1 0%` }"
        :orderName="orderName"
        :transportOrderId="transportOrderId"
        :entityId="entityId"
        :changeOrderId="changeOrderId"
        :negative-profit-remark="negativeProfitRemark"
        ref="detailRef"
        :feeTableType="feeTableType"
      />
    </div>
  </Page>
</template>
<style scoped lang="scss">
@media (max-height: 820px) {
  .expense-task-grid {
    min-height: 200px !important;
  }

  .expense-fee-pane {
    min-height: 168px !important;
  }
}

.expense-review-split.is-resizing {
  cursor: row-resize;
  user-select: none;
}

.expense-review-split.is-resizing .expense-task-grid,
.expense-review-split.is-resizing .expense-fee-pane {
  pointer-events: none;
}

.drag-handle {
  position: relative;
  z-index: 10;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.drag-handle-vertical {
  height: 10px;
  cursor: row-resize;
}

.drag-handle .drag-line {
  width: 48px;
  height: 4px;
  background-color: #cdd5e0;
  border-radius: 999px;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.drag-handle:hover .drag-line,
.drag-handle.dragging .drag-line {
  background-color: hsl(var(--primary));
  box-shadow: 0 0 6px hsl(var(--primary) / 30%);
}

.split {
  color: #d9dee8;
}

// 页面内容区略减 padding，给表格多留纵向空间（覆盖 Page 默认 p-4）
.expense-review-page {
  padding: 8px 12px !important;
}

// 顶部任务列表：卡片化容器 + 查询区高度压缩
.expense-task-grid {
  overflow: hidden;
  border: 1px solid #e8ecf3;
  border-radius: 10px;
  box-shadow:
    0 1px 2px rgb(16 42 83 / 4%),
    0 4px 12px rgb(16 42 83 / 5%);

  // 压缩搜索表单：默认折叠一行时尽量矮，避免小屏只剩一行票表
  :deep(.vxe-grid--form-wrapper),
  :deep([class*='form-container']),
  :deep(.relative > form),
  :deep(form.vben-form) {
    margin-bottom: 0 !important;
  }

  :deep(.ant-form-item) {
    margin-bottom: 0 !important;
  }

  :deep(.ant-form-item-label) {
    padding: 0 !important;
    line-height: 1.2;
  }

  :deep(.ant-form-item-label > label) {
    height: auto;
    font-size: 12px;
  }

  :deep(.ant-form-item-control-input) {
    min-height: 28px;
  }

  :deep(
    .ant-select-single:not(.ant-select-customize-input) .ant-select-selector
  ),
  :deep(.ant-input),
  :deep(.ant-input-affix-wrapper),
  :deep(.ant-picker) {
    min-height: 28px;
  }

  :deep(.pb-2),
  :deep(.pb-4) {
    padding-bottom: 4px !important;
  }

  :deep(.pt-1),
  :deep(.pt-2) {
    padding-top: 2px !important;
  }

  // 工具栏与分页条略收紧
  :deep(.vxe-toolbar) {
    min-height: 40px;
    padding-block: 4px;
  }

  :deep(.vxe-pager) {
    min-height: 36px;
    padding-block: 2px;
  }

  :deep(.vxe-header--column) {
    font-weight: 600;
    color: #333;
    background-color: #f5f7fa;
  }

  :deep(.vxe-body--row.row--stripe) {
    background-color: #fafbfd;
  }

  :deep(.vxe-body--row:hover),
  :deep(.vxe-body--row.row--hover) {
    background-color: #e9f4ff;
  }
}

// 布局切换：胶囊分段控件，选中态跟品牌主色
.layout-capsule {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  padding: 2px;
  margin-right: 8px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 8%) 0%,
    hsl(var(--primary) / 3%) 100%
  );
  border: 1px solid hsl(var(--primary) / 14%);
  border-radius: 999px;
  box-shadow: inset 0 1px 2px rgb(16 42 83 / 4%);
}

.layout-capsule__item {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  justify-content: center;
  min-width: 64px;
  height: 28px;
  padding: 0 12px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: #64748b;
  cursor: pointer;
  outline: none;
  background: transparent;
  border: none;
  border-radius: 999px;
  transition:
    color 0.2s ease,
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.15s ease;

  &:hover:not(.is-active) {
    color: hsl(var(--primary));
    background: hsl(var(--primary) / 10%);
  }

  &:focus-visible {
    box-shadow: 0 0 0 2px hsl(var(--primary) / 25%);
  }

  &.is-active {
    color: #fff;
    background: linear-gradient(
      135deg,
      hsl(var(--primary)) 0%,
      hsl(var(--primary) / 82%) 100%
    );
    box-shadow: 0 2px 8px hsl(var(--primary) / 32%);
  }

  &.is-active:hover {
    box-shadow: 0 3px 10px hsl(var(--primary) / 38%);
    transform: translateY(-0.5px);
  }
}
</style>
