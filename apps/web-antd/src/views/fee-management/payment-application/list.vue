<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { nextTick, onMounted, ref, watch } from 'vue';
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
  captureAppliedTotalAnchorState,
  isAppliedTotalAnchorField,
  isAppliedTotalChildField,
  useGridFormSchema,
} from './data';

const t = (key: string) => $t(`seaExport.export.paymentApplication.${key}`);

const router = useRouter();
const actionLoading = ref(false);
const { open: openWorkflowTimeline } = useWorkflowTimeline();

const tableData = ref<PaymentApplicationAdminApi.PaymentApplicationDto[]>([]);
/** 防止列同步过程中的重入 */
let syncingAppliedTotal = false;

/**
 * 「申请合计」锚点代理：让各币别列的显隐与整体位置跟随锚点列。
 * - 币别列的 visible = 锚点列 visible（列配置里控制显隐）
 * - 币别列整体紧跟在锚点列之后（列配置里拖动锚点即调整整体顺序）
 */
function syncAppliedTotalColumns() {
  if (syncingAppliedTotal) return;
  const grid = gridApi.grid as any;
  if (!grid?.getFullColumn) return;
  const fullCols: any[] = grid.getFullColumn() ?? [];
  const anchor = fullCols.find((c) => isAppliedTotalAnchorField(c?.field));
  const currencyCols = fullCols.filter((c) =>
    isAppliedTotalChildField(c?.field),
  );
  if (!anchor || currencyCols.length === 0) return;

  const anchorVisible = anchor.visible !== false;
  let changed = false;
  for (const col of currencyCols) {
    if ((col.visible !== false) !== anchorVisible) {
      col.visible = anchorVisible;
      changed = true;
    }
  }

  const rest = fullCols.filter((c) => !isAppliedTotalChildField(c?.field));
  const anchorIndex = rest.indexOf(anchor);
  const newOrder = [
    ...rest.slice(0, anchorIndex + 1),
    ...currencyCols,
    ...rest.slice(anchorIndex + 1),
  ];
  const orderChanged =
    newOrder.length === fullCols.length &&
    newOrder.some((col, index) => col !== fullCols[index]);

  if (!changed && !orderChanged) return;

  syncingAppliedTotal = true;
  Promise.resolve(grid.loadColumn?.(newOrder))
    .catch(() => {})
    .finally(() => {
      grid.refreshColumn?.();
      syncingAppliedTotal = false;
    });
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

  return {
    ...formValues,
    SubmitTimeStart: toIsoString(submitTimeStart),
    SubmitTimeEnd: toIsoString(submitTimeEnd),
    EndTimeStart: toIsoString(endTimeStart),
    EndTimeEnd: toIsoString(endTimeEnd),
    SubmitTimeRange: undefined,
    EndTimeRange: undefined,
  };
};

const [Grid, gridApi] =
  useVbenVxeGrid<PaymentApplicationAdminApi.PaymentApplicationDto>({
    columnPersist: { tableId: 'PaymentApplicationList' },
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
      custom: () => nextTick(syncAppliedTotalColumns),
      customChange: () => nextTick(syncAppliedTotalColumns),
      customReset: () => nextTick(syncAppliedTotalColumns),
      columnDropEnd: () => nextTick(syncAppliedTotalColumns),
    },
    gridOptions: {
      columns: buildColumns(),
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

// 每页数据变化时重建币别列，并保留「申请合计」锚点的显隐与整体顺序
watch(
  tableData,
  async (rows) => {
    const grid = gridApi.grid as any;
    const anchorState = captureAppliedTotalAnchorState(
      grid?.getFullColumn?.() ?? [],
    );
    await nextTick();
    gridApi.setGridOptions({
      columns: applyDefaultSortable(buildColumns(rows, anchorState)),
    });
    await nextTick();
    syncAppliedTotalColumns();
  },
  { deep: true },
);

onMounted(async () => {
  await nextTick();
  syncAppliedTotalColumns();
});

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
/* 「申请合计」锚点代理列：仅用于列配置项，不在表格中占用可见空间 */
:deep(.applied-total-anchor-col) {
  display: none !important;
}
</style>
