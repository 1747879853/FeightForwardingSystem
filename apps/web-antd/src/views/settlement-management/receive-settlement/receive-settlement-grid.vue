<script lang="ts" setup>
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import { IconifyIcon } from '@vben/icons';
import dayjs from 'dayjs';

import {
  Button,
  Dropdown,
  Menu,
  message,
  Modal,
  Space,
  Tag,
} from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteReceiveSettlement,
  getReceiveSettlementPagedList,
} from '#/api/settlement-management/receive-settlement-admin';
import { createAbpPermission } from '#/utils/abp-permission';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './data';
import ListTitleTabs, { type ListTabKey } from './list-title-tabs.vue';

const activeTab = defineModel<ListTabKey>('activeTab', { required: true });

const route = useRoute();
const router = useRouter();
const perm = createAbpPermission('Admin.ReceiveSettlement');

const actionLoading = ref(false);

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
  const [settlementTimeStart, settlementTimeEnd] = getRangeValue(
    formValues.settlementTimeRange,
  );

  return {
    ...formValues,
    settlementTimeStart: toIsoString(settlementTimeStart),
    settlementTimeEnd: toIsoString(settlementTimeEnd),
    settlementTimeRange: undefined,
  };
};

const [Grid, gridApi] =
  useVbenVxeGrid<ReceiveSettlementAdminApi.ReceiveSettlementListDto>({
    columnPersist: { tableId: 'ReceiveSettlementList' },
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      commonConfig: {
        labelWidth: 64,
      },
      wrapperClass: 'grid-cols-6',
    },
    gridOptions: {
      id: 'settlementReceiveSettlementList',
      columns: useColumns(),
      height: 'auto',
      keepSource: true,
      checkboxConfig: {
        highlight: true,
      },
      rowConfig: {
        keyField: 'id',
        isHover: true,
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(getReceiveSettlementPagedList, {
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
    gridEvents: {
      cellDblclick: handleRowDblClick,
    },
  });

function getSelectedRows(): ReceiveSettlementAdminApi.ReceiveSettlementListDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as ReceiveSettlementAdminApi.ReceiveSettlementListDto[];
}

function handleRowDblClick({
  row,
}: {
  row: ReceiveSettlementAdminApi.ReceiveSettlementListDto;
}) {
  if (!row) return;
  const basePath =
    row.type === 1
      ? '/settlement-management/receive-settlement/edit-by-invoice'
      : '/settlement-management/receive-settlement/edit';
  router.push(`${basePath}/${row.id}`);
}

async function handleCreate() {
  const formValues = await gridApi.formApi.getValues();
  router.push({
    path: '/settlement-management/receive-settlement/add',
    query: formValues.bankStatementId
      ? { bankStatementId: String(formValues.bankStatementId) }
      : undefined,
  });
}

async function handleCreateByInvoice() {
  const formValues = await gridApi.formApi.getValues();
  router.push({
    path: '/settlement-management/receive-settlement/add-by-invoice',
    query: formValues.bankStatementId
      ? { bankStatementId: String(formValues.bankStatementId) }
      : undefined,
  });
}

function handleBatchDelete() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要删除的记录');
    return;
  }

  const lockedItems = rows.filter((row) => row.locked);
  if (lockedItems.length > 0) {
    message.warning('选中的记录中有已锁定的收费核销，无法删除');
    return;
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${rows.length} 条收费核销吗？`,
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        await Promise.all(
          rows.map((row) => deleteReceiveSettlement({ id: row.id })),
        );
        message.success('删除成功');
        gridApi.query();
      } catch (error: any) {
        message.error(error.message || '删除失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

function handleRefresh() {
  gridApi.query();
}

async function initQueryBankStatement() {
  const rawId = route.query.bankStatementId;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return;

  await gridApi.formApi.setValues({ bankStatementId: String(id) });
  gridApi.query();
}

onMounted(() => {
  initQueryBankStatement();
});

defineExpose({
  refresh: handleRefresh,
});
</script>

<template>
  <Grid>
    <template #table-title>
      <ListTitleTabs v-model:active-key="activeTab" />
    </template>

    <template #toolbar-tools>
      <Space wrap>
        <Dropdown v-access:code="perm.add" :trigger="['hover']">
          <Button type="primary" @click="handleCreate">
            新建
            <IconifyIcon icon="mdi:chevron-down" class="ml-1" />
          </Button>
          <template #overlay>
            <Menu>
              <Menu.Item key="fee" @click="handleCreate"> 费用结算 </Menu.Item>
              <Menu.Item key="invoice" @click="handleCreateByInvoice">
                发票结算
              </Menu.Item>
            </Menu>
          </template>
        </Dropdown>
        <Button
          v-access:code="perm.delete"
          :loading="actionLoading"
          @click="handleBatchDelete"
        >
          批量删除
        </Button>
      </Space>
    </template>

    <template #locked="{ row }">
      <Tag :color="row.locked ? 'red' : 'green'">
        {{ row.locked ? '已锁定' : '未锁定' }}
      </Tag>
    </template>
  </Grid>
</template>
