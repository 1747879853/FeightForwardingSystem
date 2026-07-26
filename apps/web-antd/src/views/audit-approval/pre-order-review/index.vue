<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { TaskType } from '#/api/audit-approval/payment-review-admin';
import { getPreOrderTaskList } from '#/api/pre-order/pre-order-admin';
import { useWorkflowTimeline } from '#/components/workflow-timeline';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { usePreOrderReviewColumns, usePreOrderReviewFormSchema } from './data';

defineOptions({ name: 'PreOrderReview' });

const auditCode = 'Admin.PreOrder.Audit';

const router = useRouter();
const { open: openWorkflowTimeline } = useWorkflowTimeline();

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
};

const normalizeQuery = (formValues: Record<string, unknown>) => {
  const range = Array.isArray(formValues.AuditTimeRange)
    ? formValues.AuditTimeRange
    : [];
  return {
    ...formValues,
    AuditTimeStart: toIsoString(range[0]),
    AuditTimeEnd: toIsoString(range[1]),
    AuditTimeRange: undefined,
  };
};

/** 审核动作在业务联系单详情页完成，此处只做定位与跳转 */
function openPreOrder(row: PreOrderAdminApi.PreOrderTaskItemDto) {
  const id = row.preOrderId ?? row.entityId;
  if (!id) return;
  router.push(`/pre-order/${id}/detail`);
}

const [Grid, gridApi] = useVbenVxeGrid<PreOrderAdminApi.PreOrderTaskItemDto>({
  formOptions: {
    schema: usePreOrderReviewFormSchema(),
    submitOnChange: true,
    showCollapseButton: true,
    collapsed: true,
    compact: true,
    wrapperClass: 'grid-cols-4',
  },
  gridEvents: {
    cellDblclick: ({ row }: { row: PreOrderAdminApi.PreOrderTaskItemDto }) =>
      openPreOrder(row),
  },
  gridOptions: {
    columns: usePreOrderReviewColumns(),
    height: 'auto',
    keepSource: true,
    checkboxConfig: { highlight: true },
    rowConfig: { keyField: 'id', isCurrent: true, isHover: true },
    pagerConfig: { enabled: true },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(getPreOrderTaskList, {
          mapParams: normalizeQuery,
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

function getSelectedRow(): PreOrderAdminApi.PreOrderTaskItemDto | undefined {
  const rows = (gridApi.grid?.getCheckboxRecords?.() ??
    []) as PreOrderAdminApi.PreOrderTaskItemDto[];
  return rows[0] ?? (gridApi.grid as any)?.getCurrentRecord?.();
}

function handleOpen() {
  const row = getSelectedRow();
  if (row) openPreOrder(row);
}

function handleViewWorkflow() {
  const row = getSelectedRow();
  const id = row?.preOrderId ?? row?.entityId;
  if (!id) return;
  openWorkflowTimeline({ entityId: id, taskType: TaskType.PreOrder });
}
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="业务联系单审核">
      <template #toolbar-tools>
        <Space>
          <Button v-access:code="auditCode" type="primary" @click="handleOpen">
            打开单据
          </Button>
          <Button @click="handleViewWorkflow">审核流程</Button>
        </Space>
      </template>
    </Grid>
  </Page>
</template>
