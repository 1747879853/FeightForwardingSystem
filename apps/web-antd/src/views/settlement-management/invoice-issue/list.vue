<script lang="ts" setup>
import type { InvoiceIssueApi } from '#/api/Invoice/InvoiceIssue';

import { ref } from 'vue';
import dayjs from 'dayjs';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import { Button, message, Modal, Space } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteInvoiceIssue,
  getInvoiceIssuePagedList,
} from '#/api/Invoice/InvoiceIssue';
import { $t } from '#/locales';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './data';

const router = useRouter();
const actionLoading = ref(false);

/** 处理新建 */
function handleCreate() {
  router.push('/settlement-management/invoice-issue/add');
}

/** 处理编辑 */
function handleEdit(row: InvoiceIssueApi.InvoiceIssueListDto) {
  // 设置当前行为选中状态，显示选中色
  const grid = gridApi.grid as any;
  if (grid && grid.setRadioRow) {
    grid.setRadioRow(row);
  }
  router.push(`/settlement-management/invoice-issue/${row.id}/edit`);
}

/** 双击行处理 */
const handleRowDblclick = ({
  row,
}: {
  row: InvoiceIssueApi.InvoiceIssueListDto;
}) => {
  handleEdit(row);
};

/** 转换日期为 ISO 字符串 */
const toIsoString = (value: unknown): string | undefined => {
  if (!value) return undefined;
  const parsed = dayjs(value as string | Date);
  return parsed.isValid() ? parsed.toISOString() : undefined;
};

/** 获取范围值 */
const getRangeValue = (
  value: unknown,
): [unknown | undefined, unknown | undefined] => {
  return Array.isArray(value)
    ? [value[0] as unknown, value[1] as unknown]
    : [undefined, undefined];
};

/** 标准化查询参数 */
const normalizeQuery = (formValues: Record<string, unknown>) => {
  const [invoiceIssueTimeStart, invoiceIssueTimeEnd] = getRangeValue(
    formValues.invoiceIssueTimeRange,
  );

  return {
    ...formValues,
    invoiceIssueTimeStart: toIsoString(invoiceIssueTimeStart),
    invoiceIssueTimeEnd: toIsoString(invoiceIssueTimeEnd),
    invoiceIssueTimeRange: undefined,
  };
};

/** 初始化表格 */
const [Grid, gridApi] = useVbenVxeGrid<InvoiceIssueApi.InvoiceIssueListDto>({
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
        query: createPagedListQuery(getInvoiceIssuePagedList, {
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

/** 获取选中的行 */
function getSelectedRows(): InvoiceIssueApi.InvoiceIssueListDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as InvoiceIssueApi.InvoiceIssueListDto[];
}

/** 批量删除 */
function handleBatchDelete() {
  const rows = getSelectedRows();
  if (rows.length === 0) {
    message.warning('请先选择要删除的记录');
    return;
  }
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${rows.length} 条发票开出记录吗？`,
    okType: 'danger',
    onOk: async () => {
      actionLoading.value = true;
      try {
        // 注意：后端接口只支持单个删除，需要循环调用
        for (const row of rows) {
          await deleteInvoiceIssue(row.id);
        }
        message.success('删除成功');
        handleRefresh();
      } catch (error) {
        console.error('删除失败:', error);
        message.error('删除失败');
      } finally {
        actionLoading.value = false;
      }
    },
  });
}

/** 刷新列表 */
function handleRefresh() {
  gridApi.query();
}

useRefreshListOnFormReturn('InvoiceIssueList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="发票开出列表">
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="handleCreate"> 新建 </Button>
          <Button danger :loading="actionLoading" @click="handleBatchDelete">
            删除
          </Button>
        </Space>
      </template>
      <template #settlementName="{ row }">
        {{ row.settlement?.name || '-' }}
      </template>
      <template #currencyCode="{ row }">
        {{ row.currency?.code || '-' }}
      </template>
      <template #clientInvoiceInfoHeader="{ row }">
        {{ row.clientInvoiceInfo?.header || '-' }}
      </template>
      <template #clientInvoiceInfoTaxNum="{ row }">
        {{ row.clientInvoiceInfo?.taxNum || '-' }}
      </template>
      <template #action="{ row }">
        <Space>
          <Button type="link" size="small" @click.stop="handleEdit(row)">
            编辑
          </Button>
        </Space>
      </template>
    </Grid>
  </Page>
</template>
