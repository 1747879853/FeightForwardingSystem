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
  addDishonest,
  cancelDishonest,
} from '#/api/sea-export/client-admin';
import { $t } from '#/locales';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import { createPagedListQuery } from '#/utils/paged-list-query';

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
const canAddDishonest = computed(() => selectedRows.value.length === 1 && !selectedRows.value[0]?.isDishonest);
const canCancelDishonest = computed(() => selectedRows.value.length === 1 && selectedRows.value[0]?.isDishonest);

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

const handleAddDishonest = async () => {
  if (!canAddDishonest.value) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }

  const row = selectedRows.value[0]!;
  const displayName = getRowName(row);

  Modal.confirm({
    title: '加入失信',
    content: `确定要将客户 "${displayName}" 加入失信名单吗？`,
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: `正在将 "${displayName}" 加入失信...`,
        duration: 0,
        key: 'action_process_msg',
      });

      try {
        await addDishonest({
          id: row.id,
        });
        message.success({
          content: `成功将 "${displayName}" 加入失信`,
          key: 'action_process_msg',
        });
        handleRefresh();
      } catch {
        hideLoading();
      }
    },
  });
};

const handleCancelDishonest = async () => {
  if (!canCancelDishonest.value) {
    message.warning($t('seaExport.export.pleaseSelectOne'));
    return;
  }

  const row = selectedRows.value[0]!;
  const displayName = getRowName(row);

  Modal.confirm({
    title: '取消失信',
    content: `确定要将客户 "${displayName}" 从失信名单中移除吗？`,
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: `正在将 "${displayName}" 移出失信...`,
        duration: 0,
        key: 'action_process_msg',
      });

      try {
        await cancelDishonest({
          id: row.id,
        });
        message.success({
          content: `成功将 "${displayName}" 移出失信`,
          key: 'action_process_msg',
        });
        handleRefresh();
      } catch {
        hideLoading();
      }
    },
  });
};

const fetchClientPagedList = (params: Record<string, any>) => {
  clearSelection();
  return getClientPagedList(params);
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
      trigger: 'default',
    },
    rowConfig: {
      keyField: 'id',
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(fetchClientPagedList),
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

useRefreshListOnFormReturn('ClientList', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('seaExport.client.list')">
      <template #toolbar-tools>
        <Button
          v-if="canAddDishonest"
          class="mr-2"
          @click="handleAddDishonest"
        >
          加入失信
        </Button>
        <Button
          v-if="canCancelDishonest"
          class="mr-2"
          @click="handleCancelDishonest"
        >
          取消失信
        </Button>
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