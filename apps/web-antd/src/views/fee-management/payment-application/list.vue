<script lang="ts" setup>
import type { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { h, nextTick, ref, watch } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Checkbox, message, Modal, Space } from 'ant-design-vue';

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
  isAppliedTotalChildField,
  useColumns,
  useGridFormSchema,
} from './data';

const t = (key: string) => $t(`seaExport.export.paymentApplication.${key}`);

const router = useRouter();
const actionLoading = ref(false);
const { open: openWorkflowTimeline } = useWorkflowTimeline();

const tableData = ref<PaymentApplicationAdminApi.PaymentApplicationDto[]>([]);
/** 列配置面板中的「申请合计」总开关，统一控制各币别平铺列的显隐 */
const appliedTotalVisible = ref(true);

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
    },
    gridOptions: {
      columns: useColumns(),
      height: 'auto',
      keepSource: true,
      // 列配置面板隐藏各币别平铺列，改由顶部单个「申请合计」开关统一控制显隐
      customConfig: {
        visibleMethod: ({ column }: { column: { field?: string } }) =>
          !isAppliedTotalChildField(column?.field),
        slots: {
          top: () =>
            h(
              'div',
              { class: 'applied-total-custom-toggle' },
              h(
                Checkbox,
                {
                  checked: appliedTotalVisible.value,
                  onChange: (e: any) => {
                    appliedTotalVisible.value = !!e?.target?.checked;
                  },
                },
                () => t('appliedTotal'),
              ),
            ),
        },
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

// 每页数据或「申请合计」开关变化时，按当前页币别平铺重建列
watch(
  [tableData, appliedTotalVisible],
  async () => {
    await nextTick();
    gridApi.setGridOptions({
      columns: applyDefaultSortable(
        useColumns(tableData.value, appliedTotalVisible.value),
      ),
    });
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
:deep(.applied-total-custom-toggle) {
  padding: 6px 12px;
  border-bottom: 1px solid #f0f0f0;
}
</style>
