<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { SystemPermissionApi } from '#/api/system/permission';

import { computed, nextTick, ref, watch } from 'vue';

import { useVbenDrawer, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import { Button, Input, message, Modal, Select, Table } from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  addTablePermission,
  addTablePermissionCondition,
  deleteTablePermission,
  deleteTablePermissionCondition,
  editTablePermission,
  editTablePermissionCondition,
  FrightModule,
  getTablePermissionConditionList,
  getTablePermissionList,
} from '#/api/system/permission';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import {
  FrightModuleLabels,
  getOperatorOptionsForField,
  getTablePermissionFieldMeta,
  getTablePermissionFieldOptions,
  OperatorLabels,
  useTablePermissionColumns,
  useTablePermissionFormSchema,
} from '../data';

type TablePermissionRow = SystemPermissionApi.UserTablePermissionDto & {
  conditionCount?: number;
};

type LocalCondition = {
  id?: number;
  propName: string;
  operator: number;
  value: string;
  showName?: string;
  showValue?: string;
};

// ==================== Props ====================

const props = defineProps<{
  targetType: 'role' | 'user';
  roleId?: number;
  userId?: number;
}>();

// ==================== 响应式状态 ====================

const editingId = ref<number>();
const currentFrightModule = ref<FrightModule>();
const existingConditions = ref<
  SystemPermissionApi.UserTablePermissionConditionDto[]
>([]);
const localConditions = ref<LocalCondition[]>([]);
const editingConditionIndex = ref<number>();
const currentPermissionRow = ref<TablePermissionRow>();
const viewConditions = ref<
  SystemPermissionApi.UserTablePermissionConditionDto[]
>([]);
const loadingViewConditions = ref(false);

// ==================== 计算属性 ====================

const currentTargetParams = computed(() => {
  return props.targetType === 'role'
    ? { roleId: props.roleId }
    : { userId: props.userId };
});

const drawerConditions = computed(() => {
  if (editingId.value) {
    return existingConditions.value.map((item) => ({
      ...item,
      key: String(item.id),
    }));
  }
  return localConditions.value.map((item, index) => ({
    ...item,
    key: `local-${index}`,
  }));
});

const conditionModalTitle = computed(() => {
  return editingConditionIndex.value === undefined
    ? $t('system.permission.addTableCondition')
    : $t('system.permission.editTableCondition');
});

const currentFieldMeta = computed(() => {
  const propName = conditionFormPropName.value;
  if (!propName || currentFrightModule.value === undefined) {
    return undefined;
  }
  return getTablePermissionFieldMeta(currentFrightModule.value, propName);
});

const operatorOptions = computed(() =>
  getOperatorOptionsForField(currentFieldMeta.value),
);

const valueInputType = computed(() => {
  const meta = currentFieldMeta.value;
  if (meta?.valueType === 'enum' && meta.enumOptions?.length) {
    return 'enum';
  }
  return 'input';
});

const fieldOptions = computed(() =>
  getTablePermissionFieldOptions(currentFrightModule.value),
);

const enumValueOptions = computed(
  () => currentFieldMeta.value?.enumOptions ?? [],
);

const isEditingExistingCondition = computed(
  () => editingConditionIndex.value !== undefined && !!editingId.value,
);

// ==================== 表格配置 ====================

function handleActionClick(e: OnActionClickParams<TablePermissionRow>) {
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

async function enrichWithConditionCount(result: {
  items: SystemPermissionApi.UserTablePermissionDto[];
  totalCount: number;
}) {
  const items = await Promise.all(
    (result.items || []).map(async (item) => {
      try {
        const res = await getTablePermissionConditionList({
          userTablePermissionId: item.id,
          pageSize: 1,
        });
        return { ...item, conditionCount: res.totalCount || 0 };
      } catch {
        return { ...item, conditionCount: 0 };
      }
    }),
  );
  return { items, totalCount: result.totalCount || 0 };
}

const fetchTablePermissionList = async (params: Record<string, any>) => {
  if (!props.roleId && !props.userId) {
    return { items: [], totalCount: 0 };
  }
  const result = await getTablePermissionList({
    ...params,
    ...currentTargetParams.value,
  });
  return enrichWithConditionCount(result);
};

const [Grid, gridApi] = useVbenVxeGrid<TablePermissionRow>({
  gridOptions: {
    id: 'systemPermissionTableList',
    columns: useTablePermissionColumns(handleActionClick, (row) =>
      handleViewConditions(row as TablePermissionRow),
    ),
    height: 'auto',
    keepSource: true,
    proxyConfig: {
      ajax: {
        query: createPagedListQuery(fetchTablePermissionList),
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

// ==================== 主规则表单 ====================

const [Form, formApi] = useVbenForm({
  layout: 'vertical',
  schema: useTablePermissionFormSchema(),
  showDefaultActions: false,
  handleValuesChange: (values) => {
    currentFrightModule.value = values.frightModule;
  },
});

// ==================== 条件表单（动态 schema） ====================

const conditionFormPropName = ref<string>();
const conditionFormOperator = ref<number>();
const conditionFormValue = ref<string>();

function resetConditionFormState() {
  conditionFormPropName.value = undefined;
  conditionFormOperator.value = undefined;
  conditionFormValue.value = undefined;
}

function openConditionModal(index?: number) {
  if (currentFrightModule.value === undefined) {
    message.warning($t('system.permission.selectModuleFirst'));
    return;
  }

  editingConditionIndex.value = index;
  resetConditionFormState();

  if (index !== undefined) {
    const target = editingId.value
      ? existingConditions.value[index]
      : localConditions.value[index];
    if (target) {
      conditionFormPropName.value = target.propName;
      conditionFormOperator.value = target.operator;
      conditionFormValue.value = target.value;
    }
  }

  conditionModalApi.open();
}

// ==================== 主规则抽屉 ====================

const [Drawer, drawerApi] = useVbenDrawer({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;

    const values = (await formApi.getValues()) as Recordable<any>;
    const submitData: SystemPermissionApi.UserTablePermissionAddDto = {
      ...currentTargetParams.value,
      frightModule: values.frightModule,
    };

    drawerApi.lock();
    try {
      const permissionId = editingId.value
        ? await saveMainRule(submitData)
        : await addTablePermission(submitData);

      await syncConditions(permissionId);

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
      const data = drawerApi.getData<TablePermissionRow>();
      formApi.resetForm();
      resetConditionState();

      if (data?.id) {
        editingId.value = data.id;
        currentFrightModule.value = data.frightModule;
        formApi.setValues({ frightModule: data.frightModule });
        await loadExistingConditions(data.id);
      } else {
        editingId.value = undefined;
        currentFrightModule.value = undefined;
      }
    }
  },
});

const drawerTitle = computed(() => {
  return editingId.value
    ? $t('system.permission.editTablePermission')
    : $t('system.permission.addTablePermission');
});

// ==================== 条件编辑 Modal ====================

const [ConditionModal, conditionModalApi] = useVbenModal({
  async onConfirm() {
    if (!conditionFormPropName.value) {
      message.warning($t('system.permission.conditionPropNameRequired'));
      return;
    }
    if (conditionFormOperator.value === undefined) {
      message.warning($t('system.permission.conditionOperatorRequired'));
      return;
    }
    if (!conditionFormValue.value?.trim()) {
      message.warning($t('system.permission.conditionValueRequired'));
      return;
    }

    const fieldMeta = getTablePermissionFieldMeta(
      currentFrightModule.value,
      conditionFormPropName.value,
    );
    const enumOption = fieldMeta?.enumOptions?.find(
      (option) => option.value === conditionFormValue.value,
    );
    const condition: LocalCondition = {
      propName: conditionFormPropName.value,
      operator: conditionFormOperator.value,
      value: conditionFormValue.value,
      showName: fieldMeta?.showName,
      showValue: enumOption?.label,
    };

    if (editingConditionIndex.value === undefined) {
      if (editingId.value) {
        conditionModalApi.lock();
        try {
          const id = await addTablePermissionCondition({
            userTablePermissionId: editingId.value,
            ...condition,
          });
          existingConditions.value.push({
            id,
            userTablePermissionId: editingId.value,
            ...condition,
          });
        } finally {
          conditionModalApi.unlock();
        }
      } else {
        localConditions.value.push(condition);
      }
    } else if (editingId.value) {
      const target = existingConditions.value[editingConditionIndex.value];
      if (!target?.id) return;

      conditionModalApi.lock();
      try {
        await editTablePermissionCondition({
          id: target.id,
          userTablePermissionId: editingId.value,
          operator: condition.operator,
          value: condition.value,
        });
        existingConditions.value[editingConditionIndex.value] = {
          ...target,
          operator: condition.operator,
          value: condition.value,
          showValue: condition.showValue ?? target.showValue,
        };
      } finally {
        conditionModalApi.unlock();
      }
    } else {
      localConditions.value[editingConditionIndex.value] = condition;
    }

    message.success($t('system.permission.saveSuccess'));
    conditionModalApi.close();
  },
  onOpenChange(isOpen) {
    if (!isOpen) {
      editingConditionIndex.value = undefined;
      resetConditionFormState();
    }
  },
});

// ==================== 条件查看抽屉 ====================

const [ConditionsDrawer, conditionsDrawerApi] = useVbenDrawer({
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = conditionsDrawerApi.getData<TablePermissionRow>();
      if (data?.id) {
        currentPermissionRow.value = data;
        loadViewConditions(data.id);
      }
    }
  },
});

const conditionsDrawerTitle = computed(() => {
  const moduleLabel = currentPermissionRow.value
    ? FrightModuleLabels[currentPermissionRow.value.frightModule]
    : '';
  return `${$t('system.permission.viewConditions')}${moduleLabel ? ` - ${moduleLabel}` : ''}`;
});

const viewConditionColumns = [
  {
    title: $t('system.permission.conditionPropName'),
    dataIndex: 'propName',
    width: 120,
    customRender: ({ record }: { record: Recordable<any> }) =>
      record.showName || record.propName,
  },
  {
    title: $t('system.permission.conditionOperator'),
    dataIndex: 'operator',
    width: 100,
    customRender: ({ value }: { value: number }) =>
      OperatorLabels[value as keyof typeof OperatorLabels] || value,
  },
  {
    title: $t('system.permission.conditionValue'),
    dataIndex: 'value',
    customRender: ({ record }: { record: Recordable<any> }) =>
      record.showValue || record.value,
  },
];

// ==================== 数据加载与保存 ====================

function resetConditionState() {
  existingConditions.value = [];
  localConditions.value = [];
  editingConditionIndex.value = undefined;
}

async function loadExistingConditions(permissionId: number) {
  const res = await getTablePermissionConditionList({
    userTablePermissionId: permissionId,
    pageSize: 500,
  });
  existingConditions.value = res.items || [];
}

async function loadViewConditions(permissionId: number) {
  loadingViewConditions.value = true;
  try {
    const res = await getTablePermissionConditionList({
      userTablePermissionId: permissionId,
      pageSize: 500,
    });
    viewConditions.value = res.items || [];
  } finally {
    loadingViewConditions.value = false;
  }
}

async function saveMainRule(
  submitData: SystemPermissionApi.UserTablePermissionAddDto,
) {
  await editTablePermission({
    id: editingId.value!,
    ...submitData,
  } as SystemPermissionApi.UserTablePermissionEditDto);
  return editingId.value!;
}

async function syncConditions(permissionId: number) {
  if (editingId.value || localConditions.value.length === 0) {
    return;
  }

  await Promise.all(
    localConditions.value.map((condition) =>
      addTablePermissionCondition({
        userTablePermissionId: permissionId,
        propName: condition.propName,
        operator: condition.operator,
        value: condition.value,
        showName: condition.showName,
        showValue: condition.showValue,
      }),
    ),
  );
}

// ==================== 事件处理 ====================

function handleCreate() {
  drawerApi.setData({}).open();
}

function handleEdit(row: TablePermissionRow) {
  drawerApi.setData(row).open();
}

function handleDelete(row: TablePermissionRow) {
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

function handleViewConditions(row: TablePermissionRow) {
  conditionsDrawerApi.setData(row).open();
}

function handleDrawerDeleteCondition(index: number) {
  Modal.confirm({
    title: $t('common.confirm'),
    content: $t('system.permission.confirmDelete'),
    onOk: async () => {
      if (editingId.value) {
        const target = existingConditions.value[index];
        if (!target?.id) return;
        await deleteTablePermissionCondition(target.id);
        existingConditions.value.splice(index, 1);
      } else {
        localConditions.value.splice(index, 1);
      }
      message.success($t('system.permission.deleteSuccess'));
    },
  });
}

function handlePropNameChange(value: string) {
  conditionFormPropName.value = value;
  conditionFormOperator.value = undefined;
  conditionFormValue.value = undefined;
}

function handleOperatorChange(value: number) {
  conditionFormOperator.value = value;
}

function handleValueChange(value: string) {
  conditionFormValue.value = value;
}

// ==================== 监听 ====================

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
    <Drawer :title="drawerTitle" class="w-[640px]">
      <Form class="mx-4" />

      <div class="mx-4 mt-4">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-medium">
            {{ $t('system.permission.tableConditionList') }}
          </span>
          <Button size="small" type="primary" @click="openConditionModal()">
            <Plus class="size-4" />
            {{ $t('system.permission.addTableCondition') }}
          </Button>
        </div>

        <Table
          :columns="[
            {
              title: $t('system.permission.conditionPropName'),
              dataIndex: 'propName',
              width: 120,
              customRender: ({ record }) => record.showName || record.propName,
            },
            {
              title: $t('system.permission.conditionOperator'),
              dataIndex: 'operator',
              width: 100,
              customRender: ({ value }) => OperatorLabels[value] || value,
            },
            {
              title: $t('system.permission.conditionValue'),
              dataIndex: 'value',
              customRender: ({ record }) => record.showValue || record.value,
            },
            {
              title: $t('system.permission.operation'),
              dataIndex: 'operation',
              width: 120,
            },
          ]"
          :data-source="drawerConditions"
          :pagination="false"
          size="small"
          row-key="key"
        >
          <template #bodyCell="{ column, index }">
            <template v-if="column.dataIndex === 'operation'">
              <Button
                type="link"
                size="small"
                @click="openConditionModal(index)"
              >
                {{ $t('common.edit') }}
              </Button>
              <Button
                type="link"
                danger
                size="small"
                @click="handleDrawerDeleteCondition(index)"
              >
                {{ $t('common.delete') }}
              </Button>
            </template>
          </template>
        </Table>

        <div
          v-if="drawerConditions.length === 0"
          class="py-4 text-center text-sm text-muted-foreground"
        >
          {{ $t('system.permission.noTableConditions') }}
        </div>
      </div>
    </Drawer>

    <ConditionModal :title="conditionModalTitle" class="w-[480px]">
      <div class="mx-4 space-y-4">
        <div>
          <div class="mb-1 text-sm font-medium">
            {{ $t('system.permission.conditionPropName') }}
            <span class="text-destructive">*</span>
          </div>
          <Select
            :value="conditionFormPropName"
            :options="fieldOptions"
            :disabled="isEditingExistingCondition"
            class="w-full"
            show-search
            option-filter-prop="label"
            :placeholder="$t('system.permission.conditionPropNamePlaceholder')"
            @change="handlePropNameChange"
          />
        </div>

        <div>
          <div class="mb-1 text-sm font-medium">
            {{ $t('system.permission.conditionOperator') }}
            <span class="text-destructive">*</span>
          </div>
          <Select
            :value="conditionFormOperator"
            :options="operatorOptions"
            class="w-full"
            :placeholder="$t('system.permission.conditionOperatorPlaceholder')"
            @change="handleOperatorChange"
          />
        </div>

        <div>
          <div class="mb-1 text-sm font-medium">
            {{ $t('system.permission.conditionValue') }}
            <span class="text-destructive">*</span>
          </div>
          <Select
            v-if="valueInputType === 'enum'"
            :value="conditionFormValue"
            :options="enumValueOptions"
            class="w-full"
            :placeholder="$t('system.permission.conditionValuePlaceholder')"
            @change="handleValueChange"
          />
          <Input
            v-else
            :value="conditionFormValue"
            :placeholder="$t('system.permission.conditionValuePlaceholder')"
            @update:value="handleValueChange"
          />
        </div>
      </div>
    </ConditionModal>

    <ConditionsDrawer :title="conditionsDrawerTitle" width="560">
      <Table
        :columns="viewConditionColumns"
        :data-source="viewConditions"
        :loading="loadingViewConditions"
        :pagination="false"
        size="small"
        row-key="id"
      />
    </ConditionsDrawer>

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
