<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';

import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Button, message, Modal, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteBankStatement,
  getBankStatementPagedListByPermission,
} from '#/api/settlement-management/bank-statement-admin';
import { useColumns, useGridFormSchema } from '#/views/bank-statement/data';
import { enrichBankStatementListItems } from '#/views/bank-statement/utils';
import { createAbpPermission } from '#/utils/abp-permission';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';

import ListTitleTabs, { type ListTabKey } from './list-title-tabs.vue';

const activeTab = defineModel<ListTabKey>('activeTab', { required: true });

const perm = createAbpPermission('Admin.BankStatement');
const receiveSettlementPerm = createAbpPermission('Admin.ReceiveSettlement');
const router = useRouter();

/** 将时间范围拆分为起止参数 */
function splitTimeRange(
  formValues: Record<string, unknown>,
): Record<string, unknown> {
  const result = { ...formValues };
  const range = formValues.statementTimeRange as [unknown, unknown] | undefined;
  if (Array.isArray(range) && range.length === 2) {
    const [start, end] = range;
    result.statementTimeStart = start
      ? dayjs(start as string | Date)
          .startOf('day')
          .toISOString()
      : undefined;
    result.statementTimeEnd = end
      ? dayjs(end as string | Date)
          .endOf('day')
          .toISOString()
      : undefined;
  }
  delete result.statementTimeRange;
  return result;
}

const [Grid, gridApi] =
  useVbenVxeGrid<BankStatementAdminApi.BankStatementListDto>({
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
            const result = await getBankStatementPagedListByPermission({
              pageIndex: page.currentPage,
              pageSize: page.pageSize,
              sorting: 'statementTime desc',
              ...splitTimeRange(formValues),
            } as BankStatementAdminApi.BankStatementQueryDto);
            return {
              ...result,
              items: await enrichBankStatementListItems(result.items || []),
            };
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

function getSelectedRows(): BankStatementAdminApi.BankStatementListDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as BankStatementAdminApi.BankStatementListDto[];
}

function navigateToCreateReceiveSettlement(
  row: BankStatementAdminApi.BankStatementListDto,
) {
  router.push({
    path: '/settlement-management/receive-settlement/add',
    query: { bankStatementId: row.id },
  });
}

function handleRowDblClick({
  row,
}: {
  row: BankStatementAdminApi.BankStatementListDto;
}) {
  if (!row) return;
  navigateToCreateReceiveSettlement(row);
}

function handleCreate() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择银行流水');
    return;
  }
  if (rows.length > 1) {
    message.warning('每次只能针对一条银行流水新建收费结算，请只选择一条');
    return;
  }

  navigateToCreateReceiveSettlement(rows[0]!);
}

function handleRefresh() {
  gridApi.query();
}

useRefreshListOnFormReturn('BankStatementList', handleRefresh);

async function handleDelete() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要删除的记录');
    return;
  }
  if (rows.length > 1) {
    message.warning('每次只能删除一条记录，请只选择一条');
    return;
  }

  const row = rows[0]!;
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除流水"${row.bankStatementNo || row.id}"吗？`,
    okType: 'danger',
    onOk: async () => {
      try {
        await deleteBankStatement({ id: row.id });
        message.success('删除成功');
        gridApi.query();
      } catch (error: any) {
        message.error(error.message || '删除失败');
      }
    },
  });
}
</script>

<template>
  <Grid>
    <template #table-title>
      <ListTitleTabs v-model:active-key="activeTab" />
    </template>

    <template #toolbar-tools>
      <Space>
        <Button
          v-access:code="receiveSettlementPerm.add"
          type="primary"
          @click="handleCreate"
        >
          新建
        </Button>
        <Button v-access:code="perm.delete" danger @click="handleDelete">
          删除
        </Button>
      </Space>
    </template>
  </Grid>
</template>
