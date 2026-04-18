<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteClient,
  getClientPagedList,
} from '#/api/sea-export/client-admin';
import { $t } from '#/locales';

import { useColumns, useGridFormSchema } from './base/data';

const router = useRouter();

const handleCreate = () => {
  router.push('/clients/create');
};

const handleEdit = (row: ClientAdminApi.ClientDto) => {
  router.push(`/clients/${row.id}/edit`);
};

const getRowName = (row: ClientAdminApi.ClientDto) => {
  return row.name || row.fullName || row.code || `${row.id}`;
};

const handleDelete = async (row: ClientAdminApi.ClientDto) => {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [getRowName(row)]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteClient(row.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [getRowName(row)]),
      key: 'action_process_msg',
    });
    handleRefresh();
  } catch {
    hideLoading();
  }
};

const handleActionClick = ({
  code,
  row,
}: OnActionClickParams<ClientAdminApi.ClientDto>) => {
  switch (code) {
    case 'delete': {
      handleDelete(row);
      break;
    }
    case 'edit': {
      handleEdit(row);
      break;
    }
  }
};

const [Grid, gridApi] = useVbenVxeGrid<ClientAdminApi.ClientDto>({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useColumns(handleActionClick),
    height: 'auto',
    keepSource: true,
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) => {
          return await getClientPagedList({
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

const handleRefresh = () => {
  gridApi.query();
};
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('seaExport.client.list')">
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
