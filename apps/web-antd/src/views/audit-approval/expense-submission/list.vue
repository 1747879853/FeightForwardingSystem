<script lang="ts" setup>
import type { ExpenseSubmissionAdminApi } from '#/api/audit-approval/expense-admin';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteSeaExport } from '#/api/sea-export/sea-export-admin';
import { getSubmitOrderFeeList } from '#/api/audit-approval/expense-admin';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from '../data';

const router = useRouter();

const handleRowDblclick = ({
  row,
}: {
  row: ExpenseSubmissionAdminApi.OrderFeeAuditListDto;
}) => {
  // 设置当前行为选中状态，显示选中色
  const grid = gridApi.grid as any;
  if (grid && grid.setRadioRow) {
    grid.setRadioRow(row);
  }
  router.push(
    `/audit-approval/expense-review/${row.id}/expense-submission-detail/${row.entityId}`,
  );
};

const [Grid, gridApi] =
  useVbenVxeGrid<ExpenseSubmissionAdminApi.OrderFeeAuditListDto>({
    formOptions: {
      schema: useGridFormSchema(),
      submitOnChange: true,
      showCollapseButton: false,
    },
    gridEvents: {
      cellDblclick: handleRowDblclick,
    },
    gridOptions: {
      columns: useColumns(),
      height: 'auto',
      keepSource: true,
      radioConfig: {
        highlight: true,
        trigger: 'row',
      },
      rowConfig: {
        keyField: 'id',
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
            return await getSubmitOrderFeeList({
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
  | ExpenseSubmissionAdminApi.OrderFeeAuditListDto
  | undefined => {
  const grid = gridApi.grid as any;
  return grid?.getRadioRecord?.() ?? undefined;
};

const batchPassed = () => {};

const handleEdit = () => {
  const row = getSelectedRow();
  if (!row) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }
  router.push(`/sea-exports/${row.id}/edit`);
};

const handleDelete = () => {
  const row = getSelectedRow();
  if (!row) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }

  const name =
    row.transportOrder?.commissionNum ||
    row.transportOrder?.mblNum ||
    `${row.id}`;

  Modal.confirm({
    title: $t('ui.actionTitle.delete', [$t('seaExport.export.name')]),
    content: $t('ui.actionMessage.deleteConfirm', [name]),
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting', [name]),
        duration: 0,
        key: 'action_process_msg',
      });
      try {
        await deleteSeaExport(row.id);
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [name]),
          key: 'action_process_msg',
        });
        handleRefresh();
      } catch {
        hideLoading();
      }
    },
  });
};

const handleRefresh = () => {
  gridApi.query();
};
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('auditApproval.expenseSubmission.title')"> </Grid>
  </Page>
</template>
