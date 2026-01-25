<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type {
  OnActionClickParams,
  VxeTableGridOptions,
} from '#/adapter/vxe-table';
import type { SystemPermissionApi } from '#/api/system/permission';

import { computed, nextTick, ref, watch } from 'vue';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, message, Modal, Table } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  addTablePermission,
  addTablePermissionCondition,
  deleteTablePermission,
  deleteTablePermissionCondition,
  editTablePermission,
  getTablePermissionConditionList,
  getTablePermissionList,
} from '#/api/system/permission';
import { $t } from '#/locales';

import {
  OperatorLabels,
  useTableConditionFormSchema,
  useTablePermissionColumns,
  useTablePermissionFormSchema,
} from '../data';

// ==================== Props ====================

const props = defineProps<{
  targetType: 'role' | 'user';
  roleId?: number;
  userId?: number;
}>();

// ==================== 响应式状态 ====================

const editingId = ref<number>();
const currentPermissionId = ref<number>();
const conditions = ref<SystemPermissionApi.UserTablePermissionConditionDto[]>(
  [],
);
const loadingConditions = ref(false);

// ==================== 计算属性 ====================

const currentTargetParams = computed(() => {
  return props.targetType === 'role'
    ? { roleId: props.roleId }
    : { userId: props.userId };
});

// ==================== 表格配置 ====================

function handleActionClick(
  e: OnActionClickParams<SystemPermissionApi.UserTablePermissionDto>,
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
    case 'viewConditions': {
      handleViewConditions(e.row);
      break;
    }
  }
}

const [Grid, gridApi] =
  useVbenVxeGrid<SystemPermissionApi.UserTablePermissionDto>({
    gridOptions: {
      columns: useTablePermissionColumns(handleActionClick, (row) =>
        handleViewConditions(row as SystemPermissionApi.UserTablePermissionDto),
      ),
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
            return await getTablePermissionList({
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
  schema: useTablePermissionFormSchema(),
  showDefaultActions: false,
});

const [ConditionForm, conditionFormApi] = useVbenForm({
  schema: useTableConditionFormSchema(),
  showDefaultActions: false,
});

// ==================== Drawer配置 ====================

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const values = (await formApi.getValues()) as Recordable<any>;
    const submitData: SystemPermissionApi.UserTablePermissionAddDto = {
      ...currentTargetParams.value,
      frightModule: values.frightModule,
      manageType: values.manageType,
    };

    drawerApi.lock();
    try {
      if (editingId.value) {
        await editTablePermission({
          id: editingId.value,
          ...submitData,
        } as SystemPermissionApi.UserTablePermissionEditDto);
      } else {
        await addTablePermission(submitData);
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
        drawerApi.getData<SystemPermissionApi.UserTablePermissionDto>();
      formApi.resetForm();

      if (data && data.id) {
        editingId.value = data.id;
        formApi.setValues({
          frightModule: data.frightModule,
          manageType: data.manageType,
        });
      } else {
        editingId.value = undefined;
      }
    }
  },
});

const drawerTitle = computed(() => {
  return editingId.value
    ? $t('system.permission.editTablePermission')
    : $t('system.permission.addTablePermission');
});

// ==================== 条件Modal配置 ====================

const [ConditionModal, conditionModalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await conditionFormApi.validate();
    if (!valid) return;

    const values = (await conditionFormApi.getValues()) as Recordable<any>;
    const submitData: SystemPermissionApi.UserTablePermissionConditionAddDto = {
      userTablePermissionId: currentPermissionId.value!,
      propName: values.propName,
      operator: values.operator,
      value: values.value,
    };

    conditionModalApi.lock();
    try {
      await addTablePermissionCondition(submitData);
      message.success($t('system.permission.saveSuccess'));
      conditionFormApi.resetForm();
      loadConditions();
    } finally {
      conditionModalApi.unlock();
    }
  },
});

// ==================== 条件表格列定义 ====================

const conditionColumns = [
  { title: 'ID', dataIndex: 'id', width: 80 },
  {
    title: $t('system.permission.conditionPropName'),
    dataIndex: 'propName',
    width: 150,
  },
  {
    title: $t('system.permission.conditionOperator'),
    dataIndex: 'operator',
    width: 120,
    customRender: ({ value }: { value: number }) =>
      OperatorLabels[value as keyof typeof OperatorLabels] || value,
  },
  {
    title: $t('system.permission.conditionValue'),
    dataIndex: 'value',
  },
  {
    title: $t('system.permission.operation'),
    dataIndex: 'operation',
    width: 100,
    fixed: 'right' as const,
  },
];

// ==================== 条件Modal ====================

const [ConditionsDrawer, conditionsDrawerApi] = useVbenDrawer({
  onOpenChange(isOpen) {
    if (isOpen) {
      const data =
        conditionsDrawerApi.getData<SystemPermissionApi.UserTablePermissionDto>();
      if (data && data.id) {
        currentPermissionId.value = data.id;
        loadConditions();
      }
    }
  },
});

// ==================== 方法 ====================

async function loadConditions() {
  if (!currentPermissionId.value) return;

  loadingConditions.value = true;
  try {
    const res = await getTablePermissionConditionList({
      userTablePermissionId: currentPermissionId.value,
    });
    conditions.value = res.items || [];
  } finally {
    loadingConditions.value = false;
  }
}

function handleCreate() {
  drawerApi.setData({}).open();
}

function handleEdit(row: SystemPermissionApi.UserTablePermissionDto) {
  drawerApi.setData(row).open();
}

function handleDelete(row: SystemPermissionApi.UserTablePermissionDto) {
  Modal.confirm({
    title: $t('common.confirm'),
    content: $t('system.permission.confirmDelete'),
    onOk: async () => {
      await deleteTablePermission(row.id);
      message.success($t('system.permission.deleteSuccess'));
      gridApi.query();
    },
  });
}

function handleViewConditions(row: SystemPermissionApi.UserTablePermissionDto) {
  conditionsDrawerApi.setData(row).open();
}

function handleAddCondition() {
  conditionFormApi.resetForm();
  conditionModalApi.open();
}

async function handleDeleteCondition(
  row: SystemPermissionApi.UserTablePermissionConditionDto,
) {
  Modal.confirm({
    title: $t('common.confirm'),
    content: $t('system.permission.confirmDelete'),
    onOk: async () => {
      await deleteTablePermissionCondition(row.id);
      message.success($t('system.permission.deleteSuccess'));
      loadConditions();
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
    <!-- 表级权限编辑抽屉 -->
    <Drawer :title="drawerTitle">
      <Form />
    </Drawer>

    <!-- 条件列表抽屉 -->
    <ConditionsDrawer
      :title="$t('system.permission.viewConditions')"
      width="600"
    >
      <div class="mb-4">
        <Button type="primary" @click="handleAddCondition">
          <Plus class="size-5" />
          {{ $t('system.permission.addTableCondition') }}
        </Button>
      </div>
      <Table
        :columns="conditionColumns"
        :data-source="conditions"
        :loading="loadingConditions"
        :pagination="false"
        size="small"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'operation'">
            <Button
              type="link"
              danger
              size="small"
              @click="handleDeleteCondition(record)"
            >
              {{ $t('common.delete') }}
            </Button>
          </template>
        </template>
      </Table>
    </ConditionsDrawer>

    <!-- 添加条件Modal -->
    <ConditionModal :title="$t('system.permission.addTableCondition')">
      <ConditionForm />
    </ConditionModal>

    <!-- 表级权限列表 -->
    <Grid>
      <template #toolbar-tools>
        <Button type="primary" @click="handleCreate">
          <Plus class="size-5" />
          {{ $t('system.permission.addTablePermission') }}
        </Button>
      </template>
    </Grid>
  </div>
</template>
