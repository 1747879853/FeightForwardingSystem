<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

import { ref } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deletePreOrder,
  getPreOrderPagedList,
  PreOrderStatus,
} from '#/api/pre-order/pre-order-admin';
import { createAbpPermission } from '#/utils/abp-permission';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import {
  applyDefaultSortable,
  createPagedListQuery,
} from '#/utils/paged-list-query';

import {
  buildColumns,
  getPreOrderFormPath,
  PRE_ORDER_LIST_TABLE_ID,
  useGridFormSchema,
} from './data';

const perm = createAbpPermission('Admin.PreOrder');
const router = useRouter();
const actionLoading = ref(false);

const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
};

const normalizeQuery = (formValues: Record<string, unknown>) => {
  const range = Array.isArray(formValues.ETDRange) ? formValues.ETDRange : [];
  return {
    ...formValues,
    ETDStart: toIsoString(range[0]),
    ETDEnd: toIsoString(range[1]),
    ETDRange: undefined,
  };
};

const handleRowDblclick = ({ row }: { row: PreOrderAdminApi.PreOrderDto }) => {
  const grid = gridApi.grid as any;
  grid?.setRadioRow?.(row);
  // 待审核 / 通过打开详情页，录入 / 驳回打开编辑页
  router.push(getPreOrderFormPath(row.id, row.status));
};

const [Grid, gridApi] = useVbenVxeGrid<PreOrderAdminApi.PreOrderDto>({
  columnPersist: { tableId: PRE_ORDER_LIST_TABLE_ID },
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
    columns: applyDefaultSortable(buildColumns()),
    height: 'auto',
    keepSource: true,
    checkboxConfig: { highlight: true },
    rowConfig: { keyField: 'id' },
    pagerConfig: { enabled: true },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(getPreOrderPagedList, {
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

function getSelectedRows(): PreOrderAdminApi.PreOrderDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as PreOrderAdminApi.PreOrderDto[];
}

function handleRefresh() {
  gridApi.query();
}

function handleCreate() {
  router.push('/pre-order/add');
}

/** 复制：把选中单据 id 带到新建页，由新建页拉详情预填 */
function handleCopy() {
  const rows = getSelectedRows();
  if (rows.length !== 1) {
    message.warning('请选择一条业务联系单进行复制');
    return;
  }
  router.push({ path: '/pre-order/add', query: { copyFrom: rows[0]?.id } });
}

function handleDelete() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要删除的业务联系单');
    return;
  }
  const invalid = rows.filter(
    (row) =>
      row.status !== PreOrderStatus.Entering &&
      row.status !== PreOrderStatus.Rejected,
  );
  if (invalid.length > 0) {
    message.warning('仅「录入状态」或「驳回」的业务联系单可删除');
    return;
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${rows.length} 条业务联系单吗？`,
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        for (const row of rows) {
          await deletePreOrder(row.id);
        }
        message.success('删除成功');
        handleRefresh();
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

useRefreshListOnFormReturn('PreOrderList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="业务联系单">
      <template #toolbar-tools>
        <Space>
          <Button v-access:code="perm.add" type="primary" @click="handleCreate">
            新建
          </Button>
          <Button v-access:code="perm.add" @click="handleCopy">复制</Button>
          <Button
            v-access:code="perm.delete"
            danger
            :loading="actionLoading"
            @click="handleDelete"
          >
            删除
          </Button>
        </Space>
      </template>
    </Grid>
  </Page>
</template>
