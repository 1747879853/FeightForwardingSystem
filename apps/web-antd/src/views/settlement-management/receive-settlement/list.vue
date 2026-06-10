<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import dayjs from 'dayjs';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space, Tag } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getBankStatementDetail } from '#/api/settlement-management/bank-statement-admin';
import {
  deleteReceiveSettlement,
  getReceiveSettlementPagedList,
} from '#/api/settlement-management/receive-settlement-admin';
import { createAbpPermission } from '#/utils/abp-permission';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';

import BankStatementPicker from './bank-statement-picker/index.vue';
import { useColumns, useGridFormSchema } from './data';
import {
  getReceiveSettlementStatusColor,
  getReceiveSettlementStatusLabel,
} from './form-data';

const route = useRoute();
const router = useRouter();
const perm = createAbpPermission('Admin.ReceiveSettlement');

const actionLoading = ref(false);
const bankPickerRef = ref<InstanceType<typeof BankStatementPicker>>();
const selectedBankStatementId = ref<string>();
const selectedBankStatementNo = ref('');

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
    bankStatementId: selectedBankStatementId.value,
    settlementTimeStart: toIsoString(settlementTimeStart),
    settlementTimeEnd: toIsoString(settlementTimeEnd),
    settlementTimeRange: undefined,
  };
};

const [Grid, gridApi] =
  useVbenVxeGrid<ReceiveSettlementAdminApi.ReceiveSettlementListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: true,
      collapsed: true,
      compact: true,
      wrapperClass: 'grid-cols-4',
    },
    gridOptions: {
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
          query: async (
            { page }: { page: { currentPage: number; pageSize: number } },
            formValues: Record<string, unknown>,
          ) => {
            return await getReceiveSettlementPagedList({
              pageIndex: page.currentPage,
              pageSize: page.pageSize,
              ...normalizeQuery(formValues),
            });
          },
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
  router.push(`/settlement-management/receive-settlement/edit/${row.id}`);
}

function handleCreate() {
  router.push({
    path: '/settlement-management/receive-settlement/add',
    query: selectedBankStatementId.value
      ? { bankStatementId: selectedBankStatementId.value }
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
    message.warning('选中的记录中有已锁定的收费结算，无法删除');
    return;
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${rows.length} 条收费结算吗？`,
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

function handleSelectBankStatement(
  row: BankStatementAdminApi.BankStatementListDto,
) {
  selectedBankStatementId.value = row.id;
  selectedBankStatementNo.value = row.bankStatementNo || row.id;
  gridApi.query();
}

function clearBankStatementFilter() {
  selectedBankStatementId.value = undefined;
  selectedBankStatementNo.value = '';
  gridApi.query();
}

function handleRefresh() {
  gridApi.query();
}

async function initQueryBankStatement() {
  const rawId = route.query.bankStatementId;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return;

  selectedBankStatementId.value = String(id);
  try {
    const detail = await getBankStatementDetail(String(id));
    selectedBankStatementNo.value = detail.bankStatementNo || String(id);
  } catch {
    selectedBankStatementNo.value = String(id);
  } finally {
    gridApi.query();
  }
}

useRefreshListOnFormReturn('ReceiveSettlementList', handleRefresh);

onMounted(() => {
  initQueryBankStatement();
});
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="收费结算列表">
      <template #toolbar-tools>
        <Space wrap>
          <Button v-access:code="perm.add" type="primary" @click="handleCreate">
            新建
          </Button>
          <Button
            v-access:code="perm.delete"
            :loading="actionLoading"
            @click="handleBatchDelete"
          >
            批量删除
          </Button>
          <Button @click="bankPickerRef?.open()">选择银行流水</Button>
          <Tag
            v-if="selectedBankStatementId"
            closable
            @close.prevent="clearBankStatementFilter"
          >
            {{ selectedBankStatementNo }}
          </Tag>
        </Space>
      </template>

      <template #status="{ row }">
        <Tag :color="getReceiveSettlementStatusColor(row.status)">
          {{ getReceiveSettlementStatusLabel(row.status) }}
        </Tag>
      </template>

      <template #locked="{ row }">
        <Tag :color="row.locked ? 'red' : 'green'">
          {{ row.locked ? '已锁定' : '未锁定' }}
        </Tag>
      </template>
    </Grid>

    <BankStatementPicker
      ref="bankPickerRef"
      @select="handleSelectBankStatement"
    />
  </Page>
</template>
