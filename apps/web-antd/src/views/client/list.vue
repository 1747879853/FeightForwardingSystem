<script lang="ts" setup>
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

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

const handleRowDblclick = ({
  row,
  column,
}: {
  row: ClientAdminApi.ClientDto;
  column?: { type?: string };
}) => {
  if (column?.type === 'checkbox') {
    return;
  }
  handleEdit(row);
};

const selectedRows = ref<ClientAdminApi.ClientDto[]>([]);

const canEdit = computed(() => selectedRows.value.length === 1);
const canDelete = computed(() => selectedRows.value.length > 0);

const syncSelectedRows = () => {
  selectedRows.value =
    (gridApi.grid?.getCheckboxRecords?.() as ClientAdminApi.ClientDto[]) ?? [];
};

const clearSelection = () => {
  selectedRows.value = [];
  gridApi.grid?.clearCheckboxRow?.();
  gridApi.grid?.clearCheckboxReserve?.();
};

const getRowName = (row: ClientAdminApi.ClientDto) => {
  return row.name || row.fullName || row.code || `${row.id}`;
};

const handleEditSelected = () => {
  if (!canEdit.value) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }
  handleEdit(selectedRows.value[0]!);
};

const handleDeleteSelected = () => {
  if (!canDelete.value) {
    message.warning($t('seaExport.export.orderFee.pleaseSelectRecords'));
    return;
  }

  const names = selectedRows.value.map((row) => getRowName(row));
  const displayName = names.length === 1 ? names[0]! : `${names.length}条记录`;

  Modal.confirm({
    title: $t('ui.actionTitle.delete', [$t('seaExport.client.name')]),
    content: $t('ui.actionMessage.deleteConfirm', [displayName]),
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting', [displayName]),
        duration: 0,
        key: 'action_process_msg',
      });

      try {
        await deleteClient({
          ids: selectedRows.value.map((row) => row.id),
        });
        message.success({
          content: $t('ui.actionMessage.deleteSuccess', [displayName]),
          key: 'action_process_msg',
        });
        handleRefresh();
      } catch {
        hideLoading();
      }
    },
  });
};

const [Grid, gridApi] = useVbenVxeGrid<ClientAdminApi.ClientDto>({
  gridEvents: {
    checkboxAll: syncSelectedRows,
    checkboxChange: syncSelectedRows,
    cellDblclick: handleRowDblclick,
  },
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    checkboxConfig: {
      highlight: true,
      reserve: false,
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
          clearSelection();
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
  clearSelection();
  gridApi.query();
};
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('seaExport.client.list')">
      <template #toolbar-tools>
        <Button
          class="mr-2"
          :disabled="!canDelete"
          danger
          @click="handleDeleteSelected"
        >
          {{ $t('common.delete') }}
        </Button>
        <Button class="mr-2" :disabled="!canEdit" @click="handleEditSelected">
          {{ $t('common.edit') }}
        </Button>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
