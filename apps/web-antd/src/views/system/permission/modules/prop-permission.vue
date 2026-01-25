<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemPermissionApi } from '#/api/system/permission';

import { computed, nextTick, ref, watch } from 'vue';

import { useVbenDrawer } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  addPropPermission,
  deletePropPermission,
  editPropPermission,
  getPropPermissionList,
} from '#/api/system/permission';
import { $t } from '#/locales';

import { usePropPermissionColumns, usePropPermissionFormSchema } from '../data';

// ==================== Props ====================

const props = defineProps<{
  targetType: 'role' | 'user';
  roleId?: number;
  userId?: number;
}>();

// ==================== 响应式状态 ====================

const editingId = ref<number>();

// ==================== 计算属性 ====================

const currentTargetParams = computed(() => {
  return props.targetType === 'role'
    ? { roleId: props.roleId }
    : { userId: props.userId };
});

// ==================== 表格配置 ====================

function handleActionClick(
  e: OnActionClickParams<SystemPermissionApi.UserPropPermissionDto>,
) {
  switch (e.code) {
    case 'delete': {
      handleDelete(e.row);
      break;
    }
    case 'edit': {
      handleEdit(e.row);
      break;
    }
  }
}

const [Grid, gridApi] =
  useVbenVxeGrid<SystemPermissionApi.UserPropPermissionDto>({
    gridOptions: {
      columns: usePropPermissionColumns(handleActionClick),
      height: 'auto',
      keepSource: true,
      proxyConfig: {
        ajax: {
          query: async (
            { page }: { page: { currentPage: number; pageSize: number } },
            formValues: Record<string, any>,
          ) => {
            if (!props.roleId && !props.userId) {
              return { items: [], total: 0 };
            }
            return await getPropPermissionList({
              page: page.currentPage,
              pageSize: page.pageSize,
              ...currentTargetParams.value,
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
        search: false,
        zoom: false,
      },
    },
  });

// ==================== 表单配置 ====================

const [Form, formApi] = useVbenForm({
  schema: usePropPermissionFormSchema(),
  showDefaultActions: false,
});

// ==================== Drawer配置 ====================

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const values = (await formApi.getValues()) as Recordable<any>;
    const submitData: SystemPermissionApi.UserPropPermissionAddDto = {
      ...currentTargetParams.value,
      frightModule: values.frightModule,
      propName: values.propName,
    };

    drawerApi.lock();
    try {
      if (editingId.value) {
        await editPropPermission({
          id: editingId.value,
          ...submitData,
        } as SystemPermissionApi.UserPropPermissionEditDto);
      } else {
        await addPropPermission(submitData);
      }
      message.success($t('system.permission.saveSuccess'));
      drawerApi.close();
      gridApi.query();
    } finally {
      drawerApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      await nextTick();
      const data =
        drawerApi.getData<SystemPermissionApi.UserPropPermissionDto>();
      formApi.resetForm();

      if (data && data.id) {
        editingId.value = data.id;
        formApi.setValues({
          frightModule: data.frightModule,
          propName: data.propName,
        });
      } else {
        editingId.value = undefined;
      }
    }
  },
});

const drawerTitle = computed(() => {
  return editingId.value
    ? $t('system.permission.editPropPermission')
    : $t('system.permission.addPropPermission');
});

// ==================== 事件处理方法 ====================

function handleCreate() {
  drawerApi.setData({}).open();
}

function handleEdit(row: SystemPermissionApi.UserPropPermissionDto) {
  drawerApi.setData(row).open();
}

function handleDelete(row: SystemPermissionApi.UserPropPermissionDto) {
  Modal.confirm({
    title: $t('common.confirm'),
    content: $t('system.permission.confirmDelete'),
    onOk: async () => {
      await deletePropPermission(row.id);
      message.success($t('system.permission.deleteSuccess'));
      gridApi.query();
    },
  });
}

// ==================== 监听Props变化 ====================

watch(
  () => [props.roleId, props.userId],
  () => {
    gridApi.query();
  },
  { immediate: true },
);
</script>

<template>
  <div class="h-full">
    <Drawer :title="drawerTitle">
      <Form />
    </Drawer>

    <Grid>
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('system.permission.addPropPermission') }}
        </Button>
      </template>
    </Grid>
  </div>
</template>
