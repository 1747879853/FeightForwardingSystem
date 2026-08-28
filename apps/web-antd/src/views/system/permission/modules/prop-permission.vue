<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type { OnActionClickParams } from '#/adapter/vxe-table';
import type { SystemPermissionApi } from '#/api/system/permission';
import {
  FrightModule,
  PropMaskConditionOperator,
  PropMaskOperatorOptions,
} from '#/api/system/permission';

import { computed, nextTick, ref, watch } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import {
  Alert,
  Button,
  DatePicker,
  Input,
  message,
  Modal,
  Select,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/form';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import {
  addPropPermission,
  deletePropPermission,
  editPropPermission,
  getPropPermissionConditionSources,
  getPropPermissionList,
} from '#/api/system/permission';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';

import type { PropConditionRow } from '../data';

import {
  buildPropConditionJson,
  parsePropConditionJson,
  usePropPermissionColumns,
  usePropPermissionFormSchema,
} from '../data';

type ConditionRowUi = {
  prop?: string;
  op?: PropMaskConditionOperator;
  value?: any;
  showName?: string;
  showValue?: string | string[];
};

// ==================== Props ====================

const props = defineProps<{
  targetType: 'role' | 'user';
  roleId?: number;
  userId?: number;
}>();

// ==================== 响应式状态 ====================

const editingId = ref<number>();
const selectedModule = ref<FrightModule>();
const conditionSources = ref<SystemPermissionApi.PropMaskConditionSourceDto[]>(
  [],
);
const conditionLogic = ref<'and' | 'or'>('and');
const conditionRows = ref<ConditionRowUi[]>([]);
// 编辑时遇到不支持的嵌套结构，只读保留原始条件，保存时原样回传
const unsupportedCondition = ref<string>();

// ==================== 计算属性 ====================

const currentTargetParams = computed(() => {
  return props.targetType === 'role'
    ? { roleId: props.roleId }
    : { userId: props.userId };
});

const fieldOptions = computed(() =>
  conditionSources.value.map((source) => ({
    label:
      source.showName && source.showName !== source.propName
        ? `${source.showName}(${source.propName})`
        : source.propName,
    value: source.propName,
  })),
);

const boolOptions = [
  { label: $t('system.permission.boolTrue'), value: 1 },
  { label: $t('system.permission.boolFalse'), value: 0 },
];

function getSourceMeta(propName?: string) {
  if (!propName) return undefined;
  return conditionSources.value.find((item) => item.propName === propName);
}

function getEnumOptions(row: ConditionRowUi) {
  return (getSourceMeta(row.prop)?.enumOptions ?? []).map((option) => ({
    label: option.showName || option.name,
    value: option.value,
  }));
}

function isArrayOperator(op?: PropMaskConditionOperator) {
  return (
    op === PropMaskConditionOperator.In ||
    op === PropMaskConditionOperator.NotIn
  );
}

function isNullOperator(op?: PropMaskConditionOperator) {
  return (
    op === PropMaskConditionOperator.IsNull ||
    op === PropMaskConditionOperator.IsNotNull
  );
}

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

const fetchPropPermissionList = async (params: Record<string, any>) => {
  if (!props.roleId && !props.userId) {
    return Promise.resolve({ items: [], total: 0 });
  }
  const result = await getPropPermissionList({
    ...params,
    ...currentTargetParams.value,
  });
  // 转换 totalCount 为 total 以符合 createPagedListQuery 的期望格式
  return {
    items: result.items,
    total: result.totalCount,
  };
};

const [Grid, gridApi] =
  useVbenVxeGrid<SystemPermissionApi.UserPropPermissionDto>({
    gridOptions: {
      id: 'systemPermissionPropList',
      columns: usePropPermissionColumns(handleActionClick),
      height: 'auto',
      keepSource: true,
      proxyConfig: {
        ajax: {
          query: createPagedListQuery(fetchPropPermissionList),
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
  schema: usePropPermissionFormSchema({ fieldOptions: fieldOptions.value }),
  showDefaultActions: false,
  // 监听表单值变化，切换模块时重新加载字段候选并清空条件
  handleValuesChange(values) {
    const newModule = values.frightModule as FrightModule | undefined;
    if (newModule === undefined || newModule === selectedModule.value) {
      return;
    }
    selectedModule.value = newModule;
    handleModuleChanged(newModule);
  },
});

async function loadConditionSources(module: FrightModule) {
  try {
    conditionSources.value = await getPropPermissionConditionSources(module);
  } catch {
    conditionSources.value = [];
  }
  formApi.updateSchema([
    {
      fieldName: 'propName',
      componentProps: {
        options: fieldOptions.value,
      },
    },
  ]);
}

function handleModuleChanged(module: FrightModule) {
  conditionRows.value = [];
  unsupportedCondition.value = undefined;
  formApi.setValues({ propName: undefined });
  void loadConditionSources(module);
}

// ==================== 条件编辑 ====================

function handleAddCondition() {
  if (selectedModule.value === undefined) {
    message.warning($t('system.permission.selectModuleFirst'));
    return;
  }
  conditionRows.value.push({});
}

function handleRemoveCondition(index: number) {
  conditionRows.value.splice(index, 1);
}

function handleConditionPropChange(index: number, value: string) {
  const row = conditionRows.value[index];
  if (!row) return;
  row.prop = value;
  row.showName = getSourceMeta(value)?.showName;
  row.value = undefined;
  row.showValue = undefined;
}

function handleConditionOperatorChange(
  index: number,
  value: PropMaskConditionOperator,
) {
  const row = conditionRows.value[index];
  if (!row) return;
  row.op = value;
  // 切换数组类/空值类操作符时清空旧值，避免结构不符
  if (isNullOperator(value) || isArrayOperator(value)) {
    row.value = isArrayOperator(value) ? [] : undefined;
  } else if (Array.isArray(row.value)) {
    row.value = row.value[0];
  }
}

/** 编辑回填：序列化条件行 -> 界面行（按字段类型还原控件值） */
function toUiRows(rows: PropConditionRow[]): ConditionRowUi[] {
  return rows.map((row) => {
    const meta = getSourceMeta(row.prop);
    const ui: ConditionRowUi = {
      prop: row.prop,
      op: row.op,
      showName: row.showName,
      showValue: row.showValue,
    };
    let value = row.value;
    if (meta?.dataType === 'datetime' && value) {
      value = dayjs(value);
    } else if (meta?.dataType === 'bool' && value !== undefined) {
      value = value === 'true' || value === 1 || value === true ? 1 : 0;
    } else if (
      isArrayOperator(row.op) &&
      meta?.dataType !== 'enum' &&
      Array.isArray(value)
    ) {
      value = value.map((item) => String(item));
    }
    ui.value = value;
    return ui;
  });
}

/** 提交前：界面行 -> 序列化条件行（含枚举 showValue、日期 ISO 化） */
function toSerializableRows(): PropConditionRow[] {
  return conditionRows.value.map((row) => {
    const meta = getSourceMeta(row.prop);
    const serial: PropConditionRow = {
      prop: row.prop,
      op: row.op,
      showName: meta?.showName,
    };
    if (isNullOperator(row.op)) {
      return serial;
    }
    let value = row.value;
    if (meta?.dataType === 'datetime' && value) {
      value = dayjs(value).toISOString();
    }
    if (
      meta?.dataType === 'number' &&
      value !== undefined &&
      value !== null &&
      !Array.isArray(value)
    ) {
      const num = Number(value);
      if (!Number.isNaN(num)) {
        value = num;
      }
    }
    serial.value = value;
    // 枚举判据由前端补 showValue（按下标与 value 对应）
    if (meta?.dataType === 'enum' && meta.enumOptions?.length) {
      const values = Array.isArray(value) ? value : [value];
      const shows = values.map(
        (item) =>
          meta.enumOptions!.find(
            (option) => String(option.value) === String(item),
          )?.showName ?? String(item),
      );
      serial.showValue = Array.isArray(value) ? shows : shows[0];
    }
    return serial;
  });
}

function validateConditionRows(): boolean {
  for (const row of conditionRows.value) {
    if (!row.prop) {
      message.warning($t('system.permission.conditionPropNameRequired'));
      return false;
    }
    if (row.op === undefined) {
      message.warning($t('system.permission.conditionOperatorRequired'));
      return false;
    }
    if (isNullOperator(row.op)) {
      continue;
    }
    const isEmpty =
      row.value === undefined ||
      row.value === null ||
      row.value === '' ||
      (Array.isArray(row.value) && row.value.length === 0);
    if (isEmpty) {
      message.warning($t('system.permission.conditionValueRequired'));
      return false;
    }
  }
  return true;
}

// ==================== Modal配置 ====================

const [PropModal, modalApi] = useVbenModal({
  async onConfirm() {
    const { valid } = await formApi.validate();
    if (!valid) return;
    if (!validateConditionRows()) return;

    const values = (await formApi.getValues()) as Recordable<any>;
    // 不支持编辑的嵌套条件原样保留，防止保存时被清空
    const conditionJson =
      unsupportedCondition.value ??
      buildPropConditionJson(toSerializableRows(), conditionLogic.value);

    const submitData: SystemPermissionApi.UserPropPermissionAddDto = {
      ...currentTargetParams.value,
      frightModule: values.frightModule,
      propName: values.propName,
      conditionJson,
      description: values.description?.trim() || undefined,
    };

    modalApi.lock();
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
        modalApi.getData<SystemPermissionApi.UserPropPermissionDto>();
      formApi.resetForm();
      conditionRows.value = [];
      conditionLogic.value = 'and';
      unsupportedCondition.value = undefined;

      if (data && data.id) {
        editingId.value = data.id;
        selectedModule.value = data.frightModule;
        await loadConditionSources(data.frightModule);
        formApi.setValues({
          frightModule: data.frightModule,
          propName: data.propName,
          description: data.description,
        });
        const parsed = parsePropConditionJson(data.conditionJson);
        if (parsed.unsupported) {
          unsupportedCondition.value = data.conditionJson;
        } else {
          conditionLogic.value = parsed.logic;
          conditionRows.value = toUiRows(parsed.rows);
        }
      } else {
        editingId.value = undefined;
        selectedModule.value = undefined;
        conditionSources.value = [];
        formApi.updateSchema([
          { fieldName: 'propName', componentProps: { options: [] } },
        ]);
      }
    }
  },
});

const modalTitle = computed(() => {
  return editingId.value
    ? $t('system.permission.editPropPermission')
    : $t('system.permission.addPropPermission');
});

// ==================== 事件处理方法 ====================

function handleCreate() {
  modalApi.setData({}).open();
}

function handleEdit(row: SystemPermissionApi.UserPropPermissionDto) {
  modalApi.setData(row).open();
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
    <PropModal :title="modalTitle" class="w-[680px]">
      <Form class="mx-4" />

      <div class="mx-4 mt-2">
        <div class="mb-1 flex items-center justify-between">
          <span class="text-sm font-medium">
            {{ $t('system.permission.propCondition') }}
          </span>
          <div class="flex items-center gap-2">
            <span class="text-xs text-gray-500">
              {{ $t('system.permission.conditionLogic') }}
            </span>
            <Select
              v-model:value="conditionLogic"
              :options="[
                {
                  label: $t('system.permission.conditionLogicAnd'),
                  value: 'and',
                },
                {
                  label: $t('system.permission.conditionLogicOr'),
                  value: 'or',
                },
              ]"
              class="w-28"
              size="small"
            />
            <Button size="small" type="primary" @click="handleAddCondition">
              <Plus class="size-4" />
              {{ $t('system.permission.addPropCondition') }}
            </Button>
          </div>
        </div>
        <div class="mb-2 text-xs text-gray-500">
          {{ $t('system.permission.propConditionDesc') }}
        </div>

        <Alert
          v-if="unsupportedCondition"
          type="warning"
          show-icon
          class="mb-2"
          :message="$t('system.permission.propConditionUnsupported')"
        >
          <template #description>
            <div class="break-all text-xs">{{ unsupportedCondition }}</div>
          </template>
        </Alert>

        <Alert
          v-else-if="
            selectedModule !== undefined && conditionSources.length === 0
          "
          type="info"
          show-icon
          class="mb-2"
          :message="$t('system.permission.propModuleNotSupported')"
        />

        <div
          v-for="(row, index) in conditionRows"
          :key="index"
          class="mb-2 flex items-center gap-2"
        >
          <Select
            :value="row.prop"
            :options="fieldOptions"
            class="min-w-0 flex-1"
            show-search
            option-filter-prop="label"
            :placeholder="$t('system.permission.conditionPropNamePlaceholder')"
            @change="
              (value: any) => handleConditionPropChange(index, value as string)
            "
          />
          <Select
            :value="row.op"
            :options="PropMaskOperatorOptions"
            class="w-28"
            :placeholder="$t('system.permission.conditionOperatorPlaceholder')"
            @change="
              (value: any) =>
                handleConditionOperatorChange(
                  index,
                  value as PropMaskConditionOperator,
                )
            "
          />
          <template v-if="!isNullOperator(row.op)">
            <!-- 枚举 + 属于/不属于：多选 -->
            <Select
              v-if="
                isArrayOperator(row.op) &&
                getSourceMeta(row.prop)?.dataType === 'enum'
              "
              :value="row.value"
              :options="getEnumOptions(row)"
              mode="multiple"
              class="min-w-0 flex-1"
              :placeholder="$t('system.permission.conditionValuePlaceholder')"
              @change="(value: any) => (conditionRows[index]!.value = value)"
            />
            <!-- 其它类型 + 属于/不属于：多值输入 -->
            <Select
              v-else-if="isArrayOperator(row.op)"
              :value="row.value"
              mode="tags"
              class="min-w-0 flex-1"
              :placeholder="$t('system.permission.conditionValuePlaceholder')"
              @change="(value: any) => (conditionRows[index]!.value = value)"
            />
            <!-- 布尔 -->
            <Select
              v-else-if="getSourceMeta(row.prop)?.dataType === 'bool'"
              :value="row.value"
              :options="boolOptions"
              class="min-w-0 flex-1"
              :placeholder="$t('system.permission.conditionValuePlaceholder')"
              @change="(value: any) => (conditionRows[index]!.value = value)"
            />
            <!-- 日期 -->
            <DatePicker
              v-else-if="getSourceMeta(row.prop)?.dataType === 'datetime'"
              :value="row.value"
              class="min-w-0 flex-1"
              :placeholder="$t('system.permission.conditionValuePlaceholder')"
              @change="(value: any) => (conditionRows[index]!.value = value)"
            />
            <!-- 枚举单值 -->
            <Select
              v-else-if="getSourceMeta(row.prop)?.dataType === 'enum'"
              :value="row.value"
              :options="getEnumOptions(row)"
              class="min-w-0 flex-1"
              allow-clear
              :placeholder="$t('system.permission.conditionValuePlaceholder')"
              @change="(value: any) => (conditionRows[index]!.value = value)"
            />
            <!-- 其它：文本输入 -->
            <Input
              v-else
              :value="row.value"
              class="min-w-0 flex-1"
              :placeholder="$t('system.permission.conditionValuePlaceholder')"
              @update:value="
                (value: string) => (conditionRows[index]!.value = value)
              "
            />
          </template>
          <Button
            type="link"
            danger
            size="small"
            @click="handleRemoveCondition(index)"
          >
            {{ $t('common.delete') }}
          </Button>
        </div>

        <div
          v-if="
            !unsupportedCondition &&
            conditionRows.length === 0 &&
            (selectedModule === undefined || conditionSources.length > 0)
          "
          class="py-2 text-center text-sm text-muted-foreground"
        >
          {{ $t('system.permission.noPropConditions') }}
        </div>
      </div>
    </PropModal>

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
