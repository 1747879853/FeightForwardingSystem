<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { nextTick, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deletePaymentApplication,
  getPaymentApplicationPagedList,
  PaymentApplicationStatus,
} from '#/api/settlement-management/payment-application-admin';
import { useWorkflowTimeline } from '#/components/workflow-timeline';
import { $t } from '#/locales';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import {
  applyDefaultSortable,
  createPagedListQuery,
} from '#/utils/paged-list-query';

import {
  buildColumns,
  buildColumnsWithRuntime,
  isAppliedTotalChildField,
  PAYMENT_APPLICATION_LIST_TABLE_ID,
  useGridFormSchema,
} from './data';

const t = (key: string) => $t(`seaExport.export.paymentApplication.${key}`);

const router = useRouter();
const actionLoading = ref(false);
const { open: openWorkflowTimeline } = useWorkflowTimeline();

const tableData = ref<PaymentApplicationAdminApi.PaymentApplicationDto[]>([]);
/** 防止重建过程中的重入 */
let rebuildingAppliedTotal = false;

/**
 * 重建「申请合计」相关列：以运行时锚点列状态为唯一数据源，
 * 保留静态列的显隐/固定/列宽/顺序，再按当前页数据重挂各币别列。
 */
async function rebuildAppliedTotalColumns() {
  if (rebuildingAppliedTotal) return;
  rebuildingAppliedTotal = true;
  try {
    // 双 nextTick 确保列配置面板的显隐/顺序改动已提交到运行时列
    await nextTick();
    await nextTick();
    const grid = gridApi.grid as any;
    const runtimeColumns =
      grid?.getFullColumns?.() ?? grid?.getFullColumn?.() ?? [];
    gridApi.setGridOptions({
      columns: applyDefaultSortable(
        buildColumnsWithRuntime(tableData.value, runtimeColumns),
      ),
    });
  } finally {
    rebuildingAppliedTotal = false;
  }
}

/** 恢复默认：用默认列重建（申请合计回到默认位置并全部显示），不沿用运行时顺序/显隐 */
async function rebuildDefaultColumns() {
  if (rebuildingAppliedTotal) return;
  rebuildingAppliedTotal = true;
  try {
    await nextTick();
    await nextTick();
    gridApi.setGridOptions({
      columns: applyDefaultSortable(buildColumns(tableData.value)),
    });
  } finally {
    rebuildingAppliedTotal = false;
  }
}

function handleViewWorkflow(
  row: PaymentApplicationAdminApi.PaymentApplicationDto,
) {
  openWorkflowTimeline({ entityId: row.id });
}

function handleCreate() {
  router.push('/fee-management/payment-application/add');
}

const handleRowDblclick = ({
  row,
}: {
  row: PaymentApplicationAdminApi.PaymentApplicationDto;
}) => {
  // 设置当前行为选中状态，显示选中色
  const grid = gridApi.grid as any;
  if (grid && grid.setRadioRow) {
    grid.setRadioRow(row);
  }
  router.push(`/fee-management/payment-application/${row.id}/edit`);
};

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
  const [invoiceDateStart, invoiceDateEnd] = getRangeValue(
    formValues.InvoiceDateRange,
  );

  return {
    ...formValues,
    SubmitTimeStart: toIsoString(submitTimeStart),
    SubmitTimeEnd: toIsoString(submitTimeEnd),
    EndTimeStart: toIsoString(endTimeStart),
    EndTimeEnd: toIsoString(endTimeEnd),
    InvoiceDateStart: toIsoString(invoiceDateStart),
    InvoiceDateEnd: toIsoString(invoiceDateEnd),
    SubmitTimeRange: undefined,
    EndTimeRange: undefined,
    InvoiceDateRange: undefined,
  };
};

const [Grid, gridApi] =
  useVbenVxeGrid<PaymentApplicationAdminApi.PaymentApplicationDto>({
    columnPersist: { tableId: PAYMENT_APPLICATION_LIST_TABLE_ID },
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      wrapperClass: 'grid-cols-4',
    },
    gridEvents: {
      cellDblclick: handleRowDblclick,
      // 仅在确认/重置（已提交状态）时重建，避免面板交互中途重建破坏暂存勾选
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
      columns: applyDefaultSortable(buildColumns()),
      height: 'auto',
      keepSource: true,
      // 列配置面板隐藏各币别平铺列，仅保留「申请合计」锚点列作为唯一配置项
      customConfig: {
        visibleMethod: ({ column }: { column: { field?: string } }) =>
          !isAppliedTotalChildField(column?.field),
      },
      checkboxConfig: {
        highlight: true,
      },
      rowConfig: {
        keyField: 'id',
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(getPaymentApplicationPagedList, {
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
        zoom: true,
      },
    },
  });

// 每页数据变化时重建币别列，显隐/顺序始终跟随「申请合计」锚点配置
watch(
  tableData,
  () => {
    void rebuildAppliedTotalColumns();
  },
  { deep: true },
);

function getSelectedRows(): PaymentApplicationAdminApi.PaymentApplicationDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as PaymentApplicationAdminApi.PaymentApplicationDto[];
}

function handleBatchDelete() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要删除的记录');
    return;
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${rows.length} 条付费申请吗？`,
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        await deletePaymentApplication({
          ids: rows.map((r) => r.id),
        });
        message.success('删除成功');
        handleRefresh();
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

function handleRefresh() {
  gridApi.query();
}

useRefreshListOnFormReturn('PaymentApplicationList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="t('list')">
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleCreate">
            {{ t('addTitle') }}
          </Button>
          <Button danger :loading="actionLoading" @click="handleBatchDelete">
            删除
          </Button>
        </Space>
      </template>
      <template #appliedTotalAnchorHeader="{ column }">
        {{ column.params?.anchorHeader || column.title }}
      </template>
      <template #action="{ row }">
        <Button
          v-if="row.status !== PaymentApplicationStatus.Entering"
          type="link"
          size="small"
          @click.stop="handleViewWorkflow(row)"
        >
          审批流程
        </Button>
      </template>
    </Grid>
  </Page>
</template>

<style scoped>
/* 各币别申请合计列：表头不换行，超出显示 tooltip */
:deep(.applied-total-currency-col .vxe-cell--title),
:deep(.applied-total-currency-col .vxe-cell) {
  white-space: nowrap;
}
</style>
