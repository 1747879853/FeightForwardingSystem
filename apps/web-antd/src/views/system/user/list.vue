<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api';

import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteUser, getUserPagedList } from '#/api';
import { $t } from '#/locales';
import { useRefreshListOnFormReturn } from '#/utils/list-refresh-flag';
import { createPagedListQuery } from '#/utils/paged-list-query';

import { combineUserAttribute, useColumns, useGridFormSchema } from './data';

const router = useRouter();

/**
 * 新建用户：打开独立的用户新建页签
 */
const handleCreate = () => {
  router.push('/system/user/create');
};

/**
 * 编辑用户：打开用户编辑页签
 */
const handleEdit = (row: SystemUserAdminApi.SystemUser) => {
  router.push(`/system/user/edit/${row.id}`);
};

/**
 * 双击行打开用户编辑页签（复选框列不触发）
 */
const handleRowDblclick = ({
  row,
  column,
}: {
  row: SystemUserAdminApi.SystemUser;
  column?: { type?: string };
}) => {
  if (column?.type === 'checkbox') {
    return;
  }
  handleEdit(row);
};

const selectedRows = ref<SystemUserAdminApi.SystemUser[]>([]);
const canDelete = computed(() => selectedRows.value.length > 0);

const syncSelectedRows = () => {
  selectedRows.value =
    (gridApi.grid?.getCheckboxRecords?.() as SystemUserAdminApi.SystemUser[]) ??
    [];
};

const clearSelection = () => {
  selectedRows.value = [];
  gridApi.grid?.clearCheckboxRow?.();
  gridApi.grid?.clearCheckboxReserve?.();
};

const getRowName = (row: SystemUserAdminApi.SystemUser) => {
  return row.nickName || row.userName || `${row.id}`;
};

/**
 * 删除选中的用户
 */
const handleDeleteSelected = () => {
  if (!canDelete.value) {
    message.warning($t('system.user.pleaseSelectUser'));
    return;
  }

  const rows = selectedRows.value;
  const names = rows.map((row) => getRowName(row));
  const displayName =
    names.length === 1
      ? names[0]!
      : `${names.length}${$t('system.user.selectedUsers')}`;

  Modal.confirm({
    title: $t('ui.actionTitle.delete', [$t('system.user.name')]),
    content: $t('ui.actionMessage.deleteConfirm', [displayName]),
    okType: 'danger',
    async onOk() {
      const hideLoading = message.loading({
        content: $t('ui.actionMessage.deleting', [displayName]),
        duration: 0,
        key: 'action_process_msg',
      });

      try {
        await Promise.all(rows.map((row) => deleteUser(row.id)));
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

// 表格配置
const [Grid, gridApi] = useVbenVxeGrid<SystemUserAdminApi.SystemUser>({
  gridEvents: {
    checkboxAll: syncSelectedRows,
    checkboxChange: syncSelectedRows,
    cellDblclick: handleRowDblclick,
  },
  formOptions: {
    schema: useGridFormSchema(),
    showCollapseButton: true,
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(),
    height: 'auto',
    keepSource: true,
    checkboxConfig: {
      highlight: true,
      reserve: true,
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(getUserPagedList, {
          // 与后端 GetUserPagedListAsync 默认排序一致
          defaultSort: 'CreationTime DESC',
          mapParams: (formValues) => {
            const userAttributeFlags = Array.isArray(
              formValues.UserAttributeFlags,
            )
              ? formValues.UserAttributeFlags
              : [];
            const userAttribute =
              userAttributeFlags.length > 0
                ? combineUserAttribute(userAttributeFlags)
                : undefined;
            const { UserAttributeFlags: _ignore, ...restFormValues } =
              formValues;
            return { ...restFormValues, userAttribute };
          },
        }),
      },
    },
    rowConfig: {
      keyField: 'id',
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: true,
      search: true,
      zoom: true,
    },
  },
});

/**
 * 刷新列表
 */
const handleRefresh = () => {
  clearSelection();
  gridApi.query();
};

useRefreshListOnFormReturn('SystemUser', handleRefresh);
</script>

<template>
  <Page auto-content-height>
    <Grid :table-title="$t('system.user.list')">
      <template #toolbar-tools>
        <Button
          class="mr-2"
          :disabled="!canDelete"
          danger
          @click="handleDeleteSelected"
        >
          {{ $t('common.delete') }}
        </Button>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.user.name')]) }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
