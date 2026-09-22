<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { TenantConfigApi } from '#/api/system/tenant-config';

import { computed } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';
import { useAccessStore } from '@vben/stores';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteTenantConfig,
  getTenantConfigPagedList,
} from '#/api/system/tenant-config';
import { $t } from '#/locales';
import { buildAbpCode } from '#/router/abp-authority';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

/**
 * 暂借「权限配置」权限点做菜单与增删改查门控。
 * 后端 TenantConfig 接口本身仍只需登录；正式权限点落地后再换成 Admin.TenantConfig.*。
 */
const PERM_BASES = [
  'Admin.UserDataPermission',
  'Admin.UserPropPermission',
  'Admin.UserTablePermission',
] as const;

function actionCodes(action: 'Add' | 'Delete' | 'Edit' | 'Get') {
  return PERM_BASES.map((base) => buildAbpCode(base, action));
}

const accessStore = useAccessStore();
const hasAction = (action: 'Add' | 'Delete' | 'Edit' | 'Get') =>
  actionCodes(action).some((code) => accessStore.accessCodes.includes(code));

const canAdd = computed(() => hasAction('Add'));
const canEdit = computed(() => hasAction('Edit'));
const canDelete = computed(() => hasAction('Delete'));

const addCodes = actionCodes('Add');
const deleteCodes = actionCodes('Delete');

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

const handleCreate = () => {
  formModalApi.setData(null).open();
};

const handleEdit = (row: TenantConfigApi.TenantConfigDto) => {
  if (!row.name || !canEdit.value) {
    return;
  }
  formModalApi.setData({ name: row.name }).open();
};

const handleDelete = async (row: TenantConfigApi.TenantConfigDto) => {
  if (!row.name || !canDelete.value) {
    return;
  }
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [row.name]),
    duration: 0,
    key: 'action_process_msg',
  });

  try {
    await deleteTenantConfig({ name: row.name });
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [row.name]),
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
}: OnActionClickParams<TenantConfigApi.TenantConfigDto>) => {
  switch (code) {
    case 'delete': {
      void handleDelete(row);
      break;
    }
    case 'edit': {
      handleEdit(row);
      break;
    }
  }
};

const [Grid, gridApi] = useVbenVxeGrid<TenantConfigApi.TenantConfigDto>({
  formOptions: {
    schema: useGridFormSchema(),
    submitOnChange: true,
    showCollapseButton: false,
  },
  gridOptions: {
    columns: useColumns(handleActionClick, {
      canEdit: canEdit.value,
      canDelete: canDelete.value,
    }),
    height: 'auto',
    keepSource: true,
    checkboxConfig: {
      highlight: true,
      reserve: true,
    },
    rowConfig: {
      keyField: 'name',
      isHover: true,
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(getTenantConfigPagedList),
      },
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: { code: 'query' },
      search: true,
      zoom: true,
    },
  },
});

const handleRefresh = () => {
  gridApi.query();
};

function getSelectedRows(): TenantConfigApi.TenantConfigDto[] {
  return (gridApi.grid?.getCheckboxRecords?.() ??
    []) as TenantConfigApi.TenantConfigDto[];
}

const handleBatchDelete = () => {
  if (!canDelete.value) {
    return;
  }
  const rows = getSelectedRows().filter((row) => row.name);
  if (rows.length === 0) {
    message.warning($t('system.tenantConfig.selectBeforeDelete'));
    return;
  }

  Modal.confirm({
    title: $t('system.tenantConfig.batchDeleteTitle'),
    content: $t('system.tenantConfig.batchDeleteConfirm', [rows.length]),
    okType: 'danger',
    onOk: async () => {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting'),
        duration: 0,
        key: 'action_process_msg',
      });
      try {
        await deleteTenantConfig({
          names: rows.map((row) => String(row.name)),
        });
        message.success({
          content: $t('system.tenantConfig.batchDeleteSuccess'),
          key: 'action_process_msg',
        });
        handleRefresh();
      } catch {
        hideLoading();
      }
    },
  });
};
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="handleRefresh" />
    <Grid :table-title="$t('system.tenantConfig.list')">
      <template #toolbar-tools>
        <Button
          v-access:code="addCodes"
          type="primary"
          class="mr-1"
          @click="handleCreate"
        >
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.tenantConfig.name')]) }}
        </Button>
        <Button
          v-access:code="deleteCodes"
          danger
          type="primary"
          @click="handleBatchDelete"
        >
          {{ $t('ui.actionTitle.batchDelete') }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
