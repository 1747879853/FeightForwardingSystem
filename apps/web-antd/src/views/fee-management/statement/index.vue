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
  router.push(`/fee-management/statement/${row.id}/edit`);
};

const [Grid, gridApi] = useVbenVxeGrid<StatementAdminApi.StatementDto>({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: true,
    collapsed: true,
    compact: true,
    wrapperClass: 'grid-cols-5',
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

const getSelectedRows = (): StatementAdminApi.StatementDto[] | undefined => {
  const grid = gridApi.grid as any;
  return grid?.getCheckboxRecords?.() ?? undefined;
};

const handleCreate = () => {
  router.push('/fee-management/statement/add');
};

const handleDelete = () => {
  const rows = getSelectedRows();
  if (!rows || rows.length === 0) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }

  const name = rows[0]?.clientName ?? `${rows[0]?.id}`;

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
        await deleteStatement({
          ids: rows.map((r) => r.id),
        });
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
        <Button class="mr-2" type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{
            $t('ui.actionTitle.create', [
              $t('seaExport.export.statement.title'),
            ])
          }}
        </Button>

        <Button danger @click="handleDelete">
          {{ $t('common.delete') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
