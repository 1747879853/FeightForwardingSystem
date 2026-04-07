<script lang="ts" setup>
import type { StatementAdminApi } from '#/api/settlement-management/statement-admin';

import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteStatement,
  getStatementPagedList,
} from '#/api/settlement-management/statement-admin';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './data';

const router = useRouter();

const handleRowDblclick = ({
  row,
}: {
  row: StatementAdminApi.StatementDto;
}) => {
  router.push(`/sea-exports/${row.id}/edit`);
};

const [Grid, gridApi] = useVbenVxeGrid<StatementAdminApi.StatementDto>({
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
          return await getStatementPagedList({
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

const getSelectedRow = (): StatementAdminApi.StatementDto | undefined => {
  const grid = gridApi.grid as any;
  return grid?.getRadioRecord?.() ?? undefined;
};

const handleCreate = () => {
  router.push('/fee-management/statement/create');
};

const handleEdit = () => {
  const row = getSelectedRow();
  if (!row) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }
  router.push(`/fee-management/statement/${row.id}/edit`);
};

const handleDelete = () => {
  const row = getSelectedRow();
  if (!row) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }

  const name = row.clientName ?? `${row.id}`;

  Modal.confirm({
    title: $t('ui.actionTitle.delete', [
      $t('seaExport.export.statement.title'),
    ]),
    content: $t('seaExport.export.statement.deleteConfirm', [name]),
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: $t('seaExport.export.statement.deleting', [name]),
        duration: 0,
        key: 'action_process_msg',
      });
      try {
        await deleteStatement(row.id);
        message.success({
          content: $t('seaExport.export.statement.deleteSuccess', [name]),
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
    <Grid :table-title="$t('seaExport.export.statement.list')">
      <template #toolbar-tools>
        <Button class="mr-2" danger @click="handleDelete">
          {{ $t('common.delete') }}
        </Button>
        <Button class="mr-2" @click="handleEdit">
          {{ $t('common.edit') }}
        </Button>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [
              $t('seaExport.export.statement.title'),
            ])
          }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
