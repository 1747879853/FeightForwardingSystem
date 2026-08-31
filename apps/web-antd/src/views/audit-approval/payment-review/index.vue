<script lang="ts" setup>
import type { PaymentReviewAdminApi } from '#/api/audit-approval/payment-review-admin';

import { computed, h, nextTick, ref, watch } from 'vue';

import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space, Textarea } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  getPayAppTaskList,
  payAppAudit,
  payAppReject,
  TaskStatus,
} from '#/api/audit-approval/payment-review-admin';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import DetailPanel from './detail-panel.vue';
import {
  buildColumns,
  buildColumnsWithRuntime,
  isAppliedTotalChildField,
  PAYMENT_REVIEW_LIST_TABLE_ID,
  usePaymentReviewFormSchema,
} from './data';

const t = (key: string) => $t(`auditApproval.paymentReview.${key}`);

/** 通过：仅待审任务走 AuditAsync(success: true) */
function isPendingAudit(row: PaymentReviewAdminApi.PayAppTaskItemDto) {
  return row.taskStatus === TaskStatus.Auditing;
}

/**
 * 驳回前置：仅审核中、审核通过（与 TAPD / 后端校验一致）。
 * 已驳回、部分通过不可驳。
 */
function canReject(row: PaymentReviewAdminApi.PayAppTaskItemDto) {
  return (
    row.taskStatus === TaskStatus.Auditing ||
    row.taskStatus === TaskStatus.Passed
  );
}

/**
 * 须走 RejectAsync：整单仍在审、但本人节点已过。
 * 整单已通过已并入 AuditAsync(false)；此场景仍走 RejectAsync，
 * 否则会按「当前审核人」处理并报非当前审核人。
 */
function needsRejectAsync(row: PaymentReviewAdminApi.PayAppTaskItemDto) {
  return (
    row.taskStatus === TaskStatus.Auditing && row.myStatus === TaskStatus.Passed
  );
}

/** 当前选中行对应的付费申请ID（驱动右侧详情渲染） */
const selectedPaymentApplicationId = ref<string | undefined>(undefined);
const tableData = ref<PaymentReviewAdminApi.PayAppTaskItemDto[]>([]);

const selectedSettlementReceivableGroup = computed(
  () =>
    tableData.value.find(
      (row) => row.paymentApplicationId === selectedPaymentApplicationId.value,
    )?.settlementReceivableGroup ?? [],
);
/** 防止重建过程中的重入 */
let rebuildingAppliedTotal = false;

function handleRowClick({
  row,
}: {
  row: PaymentReviewAdminApi.PayAppTaskItemDto;
}) {
  selectedPaymentApplicationId.value = row.paymentApplicationId;
  const grid = gridApi.grid as any;
  grid?.setCurrentRow?.(row);
}

/**
 * 重建「申请合计」相关列：以运行时锚点列状态为唯一数据源，
 * 保留静态列的显隐/固定/列宽/顺序，再按当前页数据重挂各币别列。
 */
async function rebuildAppliedTotalColumns() {
  if (rebuildingAppliedTotal) return;
  rebuildingAppliedTotal = true;
  try {
    await nextTick();
    await nextTick();
    const grid = gridApi.grid as any;
    const runtimeColumns =
      grid?.getFullColumns?.() ?? grid?.getFullColumn?.() ?? [];
    gridApi.setGridOptions({
      columns: buildColumnsWithRuntime(tableData.value, runtimeColumns),
    });
  } finally {
    rebuildingAppliedTotal = false;
  }
}

/** 恢复默认：用默认列重建（申请合计回到默认位置并全部显示） */
async function rebuildDefaultColumns() {
  if (rebuildingAppliedTotal) return;
  rebuildingAppliedTotal = true;
  try {
    await nextTick();
    await nextTick();
    gridApi.setGridOptions({
      columns: buildColumns(tableData.value),
    });
  } finally {
    rebuildingAppliedTotal = false;
  }
}

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
};

const getRangeValue = (
  value: unknown,
): [unknown | undefined, unknown | undefined] => {
  return Array.isArray(value)
    ? [value[0] as unknown, value[1] as unknown]
    : [undefined, undefined];
};

const normalizeQuery = (formValues: Record<string, unknown>) => {
  const [submitTimeStart, submitTimeEnd] = getRangeValue(
    formValues.SubmitTimeRange,
  );
  const [endTimeStart, endTimeEnd] = getRangeValue(formValues.EndTimeRange);
  const [auditTimeStart, auditTimeEnd] = getRangeValue(
    formValues.AuditTimeRange,
  );

  return {
    ...formValues,
    SubmitTimeStart: toIsoString(submitTimeStart),
    SubmitTimeEnd: toIsoString(submitTimeEnd),
    EndTimeStart: toIsoString(endTimeStart),
    EndTimeEnd: toIsoString(endTimeEnd),
    AuditTimeStart: toIsoString(auditTimeStart),
    AuditTimeEnd: toIsoString(auditTimeEnd),
    SubmitTimeRange: undefined,
    EndTimeRange: undefined,
    AuditTimeRange: undefined,
  };
};

const selectedRows = ref<PaymentReviewAdminApi.PayAppTaskItemDto[]>([]);

const syncSelectedRows = () => {
  selectedRows.value = getCheckboxRecords();
};

const hasPendingAuditSelection = computed(() =>
  selectedRows.value.some(isPendingAudit),
);
const hasRejectSelection = computed(() => selectedRows.value.some(canReject));

const [Grid, gridApi] = useVbenVxeGrid<PaymentReviewAdminApi.PayAppTaskItemDto>(
  {
    columnPersist: { tableId: PAYMENT_REVIEW_LIST_TABLE_ID },
    formOptions: {
      schema: usePaymentReviewFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      wrapperClass: 'grid-cols-5',
    },
    gridEvents: {
      cellClick: handleRowClick,
      checkboxAll: syncSelectedRows,
      checkboxChange: syncSelectedRows,
      custom: (params: { type?: string }) => {
        const type = params?.type;
        if (type && ['cancel', 'close', 'open'].includes(type)) return;
        if (type === 'reset') {
          void rebuildDefaultColumns();
          return;
        }
        void rebuildAppliedTotalColumns();
      },
      customReset: () => {
        void rebuildDefaultColumns();
      },
      columnDropEnd: () => {
        void rebuildAppliedTotalColumns();
      },
    },
    gridOptions: {
      columns: buildColumns(),
      height: 'auto',
      keepSource: true,
      customConfig: {
        visibleMethod: ({ column }: { column: { field?: string } }) =>
          !isAppliedTotalChildField(column?.field),
      },
      checkboxConfig: {
        highlight: true,
        // 点击整行即可勾选/取消，便于批量审核与驳回
        trigger: 'row',
      },
      rowConfig: {
        keyField: 'id',
        isCurrent: true,
        isHover: true,
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(getPayAppTaskList, {
            // 与后端任务实体可排序字段对齐；默认 CreationTime
            defaultSort: 'CreationTime DESC',
            fieldMap: {
              taskStatus: 'TaskStatus',
              auditTime: 'AuditTime',
              auditUserName: 'AuditUserId',
              creatorUserName: 'CreatorUserId',
              remark: 'Remark',
            },
            mapParams: normalizeQuery,
            afterFetch: (result: any) => {
              tableData.value = result?.items ?? [];
              return result;
            },
          }),
        },
      },
      toolbarConfig: {
        custom: true,
        export: false,
        refresh: { code: 'query' },
        zoom: false,
      },
    },
  },
);

watch(
  tableData,
  () => {
    void rebuildAppliedTotalColumns();
  },
  { deep: true },
);

function getCheckboxRecords(): PaymentReviewAdminApi.PayAppTaskItemDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as PaymentReviewAdminApi.PayAppTaskItemDto[];
}

function getSelectedRows(): PaymentReviewAdminApi.PayAppTaskItemDto[] {
  return selectedRows.value;
}

const reloadGrid = async () => {
  await gridApi.reload();
  syncSelectedRows();
};

const doAudit = async (approve: boolean, remark: string, ids: string[]) => {
  await payAppAudit({ success: approve, remark, ids });
  message.success($t('ui.actionMessage.operationSuccess'));
  await reloadGrid();
};

/** 一个【驳回】：待审与整单已通过走 AuditAsync(false)，本人节点已过走 RejectAsync */
const doUnifiedReject = async (remark: string, ids: string[]) => {
  const rows = getSelectedRows().filter((row) => ids.includes(row.id));
  const auditIds = rows
    .filter((row) => !needsRejectAsync(row))
    .map((row) => row.id);
  const rejectIds = rows.filter(needsRejectAsync).map((row) => row.id);
  if (auditIds.length > 0) {
    await payAppAudit({ success: false, remark, ids: auditIds });
  }
  if (rejectIds.length > 0) {
    await payAppReject({ remark, ids: rejectIds });
  }
  message.success($t('ui.actionMessage.operationSuccess'));
  await reloadGrid();
};

const openRemarkConfirm = (options: {
  title: string;
  danger?: boolean;
  onConfirm: (remark: string, ids: string[]) => Promise<void>;
  pickRows: () => PaymentReviewAdminApi.PayAppTaskItemDto[];
  emptyMessage: string;
}) => {
  let modalRemark = '';
  Modal.confirm({
    title: options.title,
    content: () =>
      h('div', {}, [
        h(Textarea, {
          modelValue: modalRemark,
          onChange: (val: any) => {
            modalRemark = val.target?.value || val;
          },
          rows: 3,
          placeholder: $t('auditApproval.task.remarkPlaceholder'),
          maxlength: 100,
          style: 'margin-top: 8px;',
        }),
      ]),
    icon: null,
    width: 520,
    centered: true,
    okText: $t('common.confirm'),
    cancelText: $t('common.cancel'),
    okButtonProps: options.danger ? { danger: true } : undefined,
    async onOk() {
      const rows = options.pickRows();
      if (rows.length === 0) {
        message.warning(options.emptyMessage);
        return Promise.reject(new Error(options.emptyMessage));
      }
      await options.onConfirm(
        modalRemark,
        rows.map((r) => r.id),
      );
    },
  });
};

/** 通过 → AuditAsync(success: true)，仅待审任务 */
const showAuditConfirm = () => {
  if (!hasPendingAuditSelection.value) {
    message.warning(t('noPendingAudit'));
    return;
  }
  openRemarkConfirm({
    title: $t('auditApproval.task.okPass'),
    pickRows: () => getSelectedRows().filter(isPendingAudit),
    emptyMessage: t('noPendingAudit'),
    onConfirm: (remark, ids) => doAudit(true, remark, ids),
  });
};

/** 驳回：审核中 / 审核通过合成一个按钮，按行分流接口 */
const showRejectConfirm = () => {
  if (!hasRejectSelection.value) {
    message.warning(t('noRejectable'));
    return;
  }
  openRemarkConfirm({
    title: t('rejectConfirmTitle'),
    danger: true,
    pickRows: () => getSelectedRows().filter(canReject),
    emptyMessage: t('noRejectable'),
    onConfirm: (remark, ids) => doUnifiedReject(remark, ids),
  });
};
</script>

<template>
  <Page auto-content-height>
    <DetailPanel
      :payment-application-id="selectedPaymentApplicationId"
      :settlement-receivable-group="selectedSettlementReceivableGroup"
    >
      <template #list>
        <Grid :table-title="t('title')">
          <template #toolbar-tools>
            <Space>
              <Button
                type="primary"
                :disabled="!hasPendingAuditSelection"
                @click="showAuditConfirm"
              >
                {{ t('auditPass') }}
              </Button>
              <Button
                danger
                :disabled="!hasRejectSelection"
                @click="showRejectConfirm"
              >
                {{ t('selectReject') }}
              </Button>
            </Space>
          </template>
          <template #appliedTotalAnchorHeader="{ column }">
            {{ column.params?.anchorHeader || column.title }}
          </template>
        </Grid>
      </template>
    </DetailPanel>
  </Page>
</template>

<style scoped>
/* 各币别申请合计列：表头不换行，超出显示 tooltip */
:deep(.applied-total-currency-col .vxe-cell--title),
:deep(.applied-total-currency-col .vxe-cell) {
  white-space: nowrap;
}
</style>
