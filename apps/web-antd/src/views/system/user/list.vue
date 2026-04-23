<script lang="ts" setup>
import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { SystemUserAdminApi } from '#/api';

import { useRouter } from 'vue-router';

import { Page, useVbenModal } from '@vben/common-ui';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  deleteUser,
  getUserPagedList,
  resetUserAllPermissions,
  createOrUpdateUser,
} from '#/api';
import { $t } from '#/locales';

import { combineUserAttribute, useColumns, useGridFormSchema } from './data';
import Form from './modules/user-form.vue';
import PasswordModal from './modules/password-modal.vue';
import ImportModal from './modules/import-modal.vue';
import RoleAssignModal from './modules/role-assign-modal.vue';
import BankAccountListModal from './modules/bank-account-list-modal.vue';

const router = useRouter();

// 表单弹窗
const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

// 改密弹窗
const [PasswordModalComponent, passwordModalApi] = useVbenModal({
  connectedComponent: PasswordModal,
  destroyOnClose: true,
});

// 导入弹窗
const [ImportModalComponent, importModalApi] = useVbenModal({
  connectedComponent: ImportModal,
  destroyOnClose: true,
});

// 角色分配弹窗
const [RoleAssignModalComponent, roleAssignModalApi] = useVbenModal({
  connectedComponent: RoleAssignModal,
  destroyOnClose: true,
});

// 银行账户列表弹窗
const [BankAccountListModalComponent, bankAccountListModalApi] = useVbenModal({
  connectedComponent: BankAccountListModal,
  destroyOnClose: true,
});

/**
 * 操作列点击处理
 */
function onActionClick(e: OnActionClickParams<SystemUserAdminApi.SystemUser>) {
  switch (e.code) {
    case 'delete': {
      onDelete(e.row);
      break;
    }
    case 'edit': {
      onEdit(e.row);
      break;
    }
    case 'setRoles': {
      onSetRoles(e.row);
      break;
    }
    case 'permission': {
      onPermission(e.row);
      break;
    }
    case 'resetPermission': {
      onResetPermission(e.row);
      break;
    }
    case 'changePassword': {
      onChangePassword(e.row);
      break;
    }
    case 'bankAccount': {
      onBankAccount(e.row);
      break;
    }
  }
}

/**
 * 启用/禁用状态切换
 */
async function onStatusChange(
  newStatus: boolean,
  row: SystemUserAdminApi.SystemUser,
) {
  const userName = row.nickName || row.userName;
  const confirmMessage = newStatus
    ? $t('system.user.confirmEnable', { name: userName })
    : $t('system.user.confirmDisable', { name: userName });
  try {
    await confirm(confirmMessage, $t('system.user.changeStatusTitle'));
    await createOrUpdateUser({
      id: row.id,
      userName: row.userName,
      isActive: newStatus,
    });
    message.success($t('ui.actionMessage.operationSuccess'));
    return true;
  } catch {
    return false;
  }
}

// 表格配置
const [Grid, gridApi] = useVbenVxeGrid<SystemUserAdminApi.SystemUser>({
  formOptions: {
    schema: useGridFormSchema(),
    showCollapseButton: true,
    submitOnChange: true,
  },
  gridOptions: {
    columns: useColumns(onActionClick, onStatusChange),
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
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) => {
          const userAttributeFlags = Array.isArray(
            formValues.UserAttributeFlags,
          )
            ? formValues.UserAttributeFlags
            : [];
          const userAttribute =
            userAttributeFlags.length > 0
              ? combineUserAttribute(userAttributeFlags)
              : undefined;

          const { UserAttributeFlags: _ignore, ...restFormValues } = formValues;

          return await getUserPagedList({
            page: page.currentPage,
            pageSize: page.pageSize,
            ...restFormValues,
            userAttribute,
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
 * 封装 Modal.confirm 为 Promise
 */
function confirm(content: string, title: string) {
  return new Promise((resolve, reject) => {
    Modal.confirm({
      content,
      onCancel() {
        reject(new Error('已取消'));
      },
      onOk() {
        resolve(true);
      },
      title,
    });
  });
}

/**
 * 新增用户
 */
function onCreate() {
  formModalApi.setData({}).open();
}

/**
 * 编辑用户
 */
function onEdit(row: SystemUserAdminApi.SystemUser) {
  formModalApi.setData(row).open();
}

/**
 * 删除用户
 */
async function onDelete(row: SystemUserAdminApi.SystemUser) {
  try {
    await deleteUser(row.id);
    message.success(
      $t('ui.actionMessage.deleteSuccess', [row.nickName || row.userName]),
    );
    onRefresh();
  } catch {
    return false;
  }
}

/**
 * 批量删除
 */
async function onBatchDelete() {
  const records = gridApi.grid?.getCheckboxRecords() || [];
  if (records.length === 0) {
    message.warning($t('system.user.pleaseSelectUser'));
    return;
  }

  // Modal.confirm({
  //   title: $t('common.confirmDelete'),
  //   content: $t('system.user.confirmBatchDelete', { count: records.length }),
  //   okType: 'danger',
  //   async onOk() {
  //     const ids = records.map((r: SystemUserAdminApi.SystemUser) => r.id);
  //     const hideLoading = message.loading({
  //       content: $t('ui.actionMessage.deleting', [
  //         $t('system.user.selectedUsers'),
  //       ]),
  //       duration: 0,
  //       key: 'action_process_msg',
  //     });
  //     try {
  //       await deleteUser(ids);
  //       message.success({
  //         content: $t('ui.actionMessage.deleteSuccess', [
  //           $t('system.user.selectedUsers'),
  //         ]),
  //         key: 'action_process_msg',
  //       });
  //       onRefresh();
  //     } catch {
  //       hideLoading();
  //     }
  //   },
  // });
}

/**
 * 分配角色
 */
function onSetRoles(row: SystemUserAdminApi.SystemUser) {
  roleAssignModalApi.setData(row).open();
}

/**
 * 权限配置
 */
function onPermission(row: SystemUserAdminApi.SystemUser) {
  router.push({
    path: '/system/permission',
    query: {
      targetType: 'user',
      userId: String(row.id),
      tab: 'module',
    },
  });
}

/**
 * 还原权限
 */
async function onResetPermission(row: SystemUserAdminApi.SystemUser) {
  const userName = row.nickName || row.userName;
  try {
    await confirm(
      $t('system.user.confirmResetPermission', { name: userName }),
      $t('system.user.resetPermission'),
    );
    const hideLoading = message.loading({
      content: $t('system.user.resettingPermission'),
      duration: 0,
      key: 'action_process_msg',
    });
    try {
      await resetUserAllPermissions(row.id);
      message.success({
        content: $t('system.user.resetPermissionSuccess'),
        key: 'action_process_msg',
      });
    } catch {
      hideLoading();
    }
  } catch {
    // 用户取消
  }
}

/**
 * 修改密码
 */
function onChangePassword(row: SystemUserAdminApi.SystemUser) {
  passwordModalApi.setData(row).open();
}

/**
 * 导入用户
 */
function onImport() {
  importModalApi.open();
}

/**
 * 银行账户管理
 */
function onBankAccount(row: SystemUserAdminApi.SystemUser) {
  bankAccountListModalApi
    .setData({
      userId: row.id,
      userName: row.nickName || row.userName,
    })
    .open();
}

/**
 * 刷新列表
 */
function onRefresh() {
  gridApi.query();
}
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onRefresh" />
    <PasswordModalComponent @success="onRefresh" />
    <ImportModalComponent @success="onRefresh" />
    <RoleAssignModalComponent @success="onRefresh" />
    <BankAccountListModalComponent />
    <Grid :table-title="$t('system.user.list')">
      <template #toolbar-tools>
        <!-- <Button class="mr-2" danger @click="onBatchDelete">
          {{ $t('system.user.batchDelete') }}
        </Button> -->
        <!-- <Button class="mr-2" @click="onImport">
          <IconifyIcon class="mr-1" icon="ant-design:upload-outlined" />
          {{ $t('system.user.import') }}
        </Button> -->
        <Button type="primary" @click="onCreate">
          <Plus class="size-5" />
          {{ $t('ui.actionTitle.create', [$t('system.user.name')]) }}
        </Button>
      </template>
    </Grid>
  </Page>
</template>
