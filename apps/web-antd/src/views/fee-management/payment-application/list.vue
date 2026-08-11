<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { nextTick, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deletePaymentApplication,
  getPaymentApplicationPagedList,
  PaymentApplicationStatus,
} from '#/api/settlement-management/payment-application-admin';
import { useWorkflowTimeline } from '#/components/workflow-timeline';
import {
  getPaymentApplicationStatusLabel,
  resolvePaymentApplicationStatusTag,
} from '#/constants/application-status';
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
import InvoiceEditModal from './invoice-edit-modal.vue';
import SettlementDetailModal from './settlement-detail-modal.vue';

const t = (key: string) => $t(`seaExport.export.paymentApplication.${key}`);

/** 发票流程：0=先票后付，1=先付后票，2=不开票 */
const INVOICE_PROCESS_PAY_THEN_INVOICE = 1;

const INVOICE_PROCESS_LABELS: Record<number, string> = {
  0: '先票后付',
  1: '先付后票',
  2: '不开票',
};

const router = useRouter();
const actionLoading = ref(false);
const { open: openWorkflowTimeline } = useWorkflowTimeline();

const tableData = ref<PaymentApplicationAdminApi.PaymentApplicationDto[]>([]);
/** 防止重建过程中的重入 */
let rebuildingAppliedTotal = false;

const settlementModalOpen = ref(false);
const settlementModalApplicationNo = ref('');
const settlementModalItems = ref<
  PaymentApplicationAdminApi.PaymentSettlementForApplicationSimpleDto[]
>([]);

const invoiceModalOpen = ref(false);
const invoiceModalApplicationId = ref('');
const invoiceModalApplicationNo = ref('');

function canOpenSettlementDetail(status: number) {
  return (
    status === PaymentApplicationStatus.Partial ||
    status === PaymentApplicationStatus.Settlemented
  );
}

/** 仅「先付后票」可从列表点击维护发票信息（走 EditInvoiceAsync，不限 status） */
function canOpenInvoiceEdit(invoiceProcess?: number | null) {
  return invoiceProcess === INVOICE_PROCESS_PAY_THEN_INVOICE;
}

function getInvoiceProcessLabel(invoiceProcess?: number | null) {
  if (invoiceProcess == null) return '';
  return INVOICE_PROCESS_LABELS[invoiceProcess] ?? '';
}

function getStatusTagProps(status: number) {
  const {
    label: _label,
    value: _value,
    ...tagProps
  } = resolvePaymentApplicationStatusTag(status, (key) => $t(key));
  return tagProps;
}

function getStatusLabel(status: number) {
  return getPaymentApplicationStatusLabel(status, (key) => $t(key));
}

function handleStatusClick(
  row: PaymentApplicationAdminApi.PaymentApplicationDto,
) {
  if (!canOpenSettlementDetail(row.status)) return;
  settlementModalApplicationNo.value = row.applicationNo ?? '';
  settlementModalItems.value = row.paymentSettlements ?? [];
  settlementModalOpen.value = true;
}

function handleInvoiceProcessClick(
  row: PaymentApplicationAdminApi.PaymentApplicationDto,
) {
  if (!canOpenInvoiceEdit(row.invoiceProcess)) return;
  invoiceModalApplicationId.value = row.id;
  invoiceModalApplicationNo.value = row.applicationNo ?? '';
  invoiceModalOpen.value = true;
}

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
            // 与后端 PagingAndSorting 默认及对接文档一致
            defaultSort: 'CreationTime DESC',
            fieldMap: {
              applicationNo: 'ApplicationNo',
              status: 'Status',
              'settlement.name': 'Settlement.Name',
              invoiceProcess: 'InvoiceProcess',
              invoiceNo: 'InvoiceNo',
              invoiceDate: 'InvoiceDate',
              require: 'Require',
              remark: 'Remark',
              submitTime: 'SubmitTime',
              endTime: 'EndTime',
              creationTime: 'CreationTime',
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
      <template #status="{ row }">
        <Tag
          v-bind="getStatusTagProps(row.status)"
          :class="{
            'status-clickable': canOpenSettlementDetail(row.status),
          }"
          @click.stop="handleStatusClick(row)"
        >
          {{ getStatusLabel(row.status) }}
        </Tag>
      </template>
      <template #invoiceProcess="{ row }">
        <span
          v-if="canOpenInvoiceEdit(row.invoiceProcess)"
          class="invoice-process-clickable"
          title="点击维护发票信息"
          @click.stop="handleInvoiceProcessClick(row)"
        >
          {{ getInvoiceProcessLabel(row.invoiceProcess) }}
        </span>
        <span v-else>{{ getInvoiceProcessLabel(row.invoiceProcess) }}</span>
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

    <SettlementDetailModal
      v-model:open="settlementModalOpen"
      :application-no="settlementModalApplicationNo"
      :settlements="settlementModalItems"
    />

    <InvoiceEditModal
      v-model:open="invoiceModalOpen"
      :application-id="invoiceModalApplicationId"
      :application-no="invoiceModalApplicationNo"
      @success="handleRefresh"
    />
  </Page>
</template>

<style scoped>
/* 各币别申请合计列：表头不换行，超出显示 tooltip */
:deep(.applied-total-currency-col .vxe-cell--title),
:deep(.applied-total-currency-col .vxe-cell) {
  white-space: nowrap;
}

.status-clickable {
  cursor: pointer;
}

.status-clickable:hover {
  opacity: 0.85;
}

.invoice-process-clickable {
  color: #1677ff;
  cursor: pointer;
}

.invoice-process-clickable:hover {
  text-decoration: underline;
}
</style>
