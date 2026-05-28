<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { SystemPermissionApi } from '#/api/system/permission';

import { computed, nextTick, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  addDataPermission,
  deleteDataPermission,
  editDataPermission,
  getDataPermissionList,
} from '#/api/system/permission';
import { $t } from '#/locales';

import { useDataPermissionColumns, useDataPermissionFormSchema } from '../data';

// ==================== Props ====================

const props = defineProps<{
  roleId?: number;
  targetType: 'role' | 'user';
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
  e: OnActionClickParams<SystemPermissionApi.UserDataPermissionDto>,
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
  useVbenVxeGrid<SystemPermissionApi.UserDataPermissionDto>({
    gridOptions: {
      columns: useDataPermissionColumns(handleActionClick),
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
            return await getDataPermissionList({
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
  layout: 'vertical',
  schema: useDataPermissionFormSchema(),
  showDefaultActions: false,
});

// ==================== Modal 配置 ====================

const [FormModal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const values = (await formApi.getValues()) as Recordable<any>;
    const submitData: SystemPermissionApi.UserDataPermissionAddDto = {
      ...currentTargetParams.value,
      manageType: values.manageType,
      dataPermissionType: values.dataPermissionType,
    };

    modalApi.lock();
    try {
      await (editingId.value
        ? editDataPermission({
            id: editingId.value,
            ...submitData,
          } as SystemPermissionApi.UserDataPermissionEditDto)
        : addDataPermission(submitData));
      message.success($t('system.permission.saveSuccess'));
      modalApi.close();
      gridApi.query();
    } finally {
      modalApi.unlock();
    }
  },
  async onOpenChange(isOpen) {
    if (isOpen) {
      await nextTick();
      const data =
        modalApi.getData<SystemPermissionApi.UserDataPermissionDto>();
      formApi.resetForm();

      if (data && data.id) {
        editingId.value = data.id;
        formApi.setValues({
          manageType: data.manageType,
          dataPermissionType: data.dataPermissionType,
        });
      } else {
        editingId.value = undefined;
      }
    }
  },
});

const modalTitle = computed(() => {
  return editingId.value
    ? $t('system.permission.editDataPermission')
    : $t('system.permission.addDataPermission');
});

// ==================== 事件处理方法 ====================

function handleCreate() {
  modalApi.setData({}).open();
}

function handleEdit(row: SystemPermissionApi.UserDataPermissionDto) {
  modalApi.setData(row).open();
}

function handleDelete(row: SystemPermissionApi.UserDataPermissionDto) {
  Modal.confirm({
    title: $t('common.confirm'),
    content: $t('system.permission.confirmDelete'),
    onOk: async () => {
      await deleteDataPermission(row.id);
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
    <FormModal :title="modalTitle">
      <Form class="mx-4" />
    </FormModal>

    <Grid>
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('system.permission.addDataPermission') }}
        </Button>
      </template>
    </Grid>
  </div>
</template>
