<script lang="ts" setup>
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import { useRouter } from 'vue-router';
import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { Button, message, Modal } from 'ant-design-vue';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { getOrderFeeTaskList } from '#/api/audit-approval/expense-admin';
import { $t } from '#/locales';
import { useExpenseAllColumns, useGridFormSchema } from '../data';

const router = useRouter();

const handleRowDblclick = ({
  row,
}: {
  row: ExpenseSubmissionAdminApi.OrderFeeTaskListDto;
}) => {
  console.log('row', row);
  // 设置当前行为选中状态，显示选中色
  const grid = gridApi.grid as any;
  if (grid && grid.setRadioRow) {
    grid.setRadioRow(row);
  }
  router.push(
    `/audit-approval/expense-review/${row.transportOrder.id}/expense-detail/${row.entityId}`,
  );
};

const [Grid, gridApi] =
  useVbenVxeGrid<ExpenseSubmissionAdminApi.OrderFeeTaskListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: false,
    },
    gridEvents: {
      cellDblclick: handleRowDblclick,
    },
    gridOptions: {
      columns: useExpenseAllColumns(),
      height: 'auto',
      keepSource: true,
      radioConfig: {
        highlight: true,
        trigger: 'row',
      },
      rowConfig: {
        keyField: 'entityId',
      },
      pagerConfig: {
        enabled: true,
      },
      proxyConfig: {
        ajax: {
          query: async (
            { page }: { page: { currentPage: number; pageSize: number } },
            formValues: Record<string, any>,
          ) => {
            return await getOrderFeeTaskList({
              PageIndex: page.currentPage,
              PageSize: page.pageSize,
              ...formValues,
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
  });

const getSelectedRow = ():
  | ExpenseSubmissionAdminApi.OrderFeeTaskListDto
  | undefined => {
  const grid = gridApi.grid as any;
  return grid?.getRadioRecord?.() ?? undefined;
};
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('auditApproval.expenseReview.title')"> </Grid>
  </Page>
</template>
