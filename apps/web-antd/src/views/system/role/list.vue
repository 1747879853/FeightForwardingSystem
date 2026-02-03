<script lang="ts" setup>
import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemRoleApi } from '#/api';

import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { deleteRole, getRoleList, updateRole } from '#/api';
import { $t } from '#/locales';
import { createAbpPermission } from '#/utils/abp-permission';

import { useColumns, useGridFormSchema } from './data';
import Form from './modules/form.vue';

// 创建角色管理的 ABP 权限对象
// 包含：perm.get, perm.add, perm.edit, perm.delete
const perm = createAbpPermission('Admin.Team.Role');

const router = useRouter();

const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onActionClick(e: OnActionClickParams<SystemRoleApi.SystemRole>) {
  switch (e.code) {
    case 'delete': {
      onDelete(e.row);
      break;
    }
    case 'edit': {
      onEdit(e.row);
      break;
    }
    case 'permission': {
      onPermission(e.row);
      break;
    }
  }
}

/**
 * 状态开关即将改变
 * @param newStatus 期望改变的状态值
 * @param row 行数据
 * @returns 返回false则中止改变，返回其他值（undefined、true）则允许改变
 */
async function onStatusChange(
  newStatus: boolean,
  row: SystemRoleApi.SystemRole,
) {
  const roleName = row.displayName || row.name;
  const confirmMessage = newStatus
    ? $t('system.role.confirmSetDefault', { name: roleName })
    : $t('system.role.confirmCancelDefault', { name: roleName });
  try {
    await confirm(confirmMessage, $t('system.role.changeDefaultTitle'));
    await updateRole(row.id, { isDefault: newStatus });
    return true;
  } catch {
    return false;
  }
}

const [Grid, gridApi] = useVbenVxeGrid<SystemRoleApi.SystemRole>({
  formOptions: {
    schema: useGridFormSchema(),
    showCollapseButton: false,
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(onActionClick, onStatusChange),
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
          return await getRoleList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...formValues,
          });
        },
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
 * 将Antd的Modal.confirm封装为promise，方便在异步函数中调用。
 * @param content 提示内容
 * @param title 提示标题
 */
function confirm(content: string, title: string) {
  return new Promise((reslove, reject) => {
    Modal.confirm({
      content,
      onCancel() {
        reject(new Error('已取消'));
      },
      onOk() {
        reslove(true);
      },
      title,
    });
  });
}

function onEdit(row: SystemRoleApi.SystemRole) {
  formModalApi.setData(row).open();
}

/**
 * 权限配置
 */
function onPermission(row: SystemRoleApi.SystemRole) {
  router.push({
    path: '/system/permission',
    query: {
      targetType: 'role',
      roleId: String(row.id),
      tab: 'module',
    },
  });
}

function onDelete(row: SystemRoleApi.SystemRole) {
  const roleNameDisplay = row.displayName || row.name;
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [roleNameDisplay]),
    duration: 0,
    key: 'action_process_msg',
  });
  deleteRole(row.id)
    .then(() => {
      message.success({
        content: $t('ui.actionMessage.deleteSuccess', [roleNameDisplay]),
        key: 'action_process_msg',
      });
      onRefresh();
    })
    .catch(() => {
      hideLoading();
    });
}

function onRefresh() {
  gridApi.query();
}

function onCreate() {
  formModalApi.setData({}).open();
}
</script>
<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <Grid :table-title="$t('system.role.list')">
      <template #toolbar-tools>
        <!-- 新增按钮：需要 Admin.Team.Role.Add 权限 -->
        <Button v-access:code="perm.add" type="primary" @click="onCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.role.name')]) }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
