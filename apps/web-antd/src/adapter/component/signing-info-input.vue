<script lang="ts" setup>
/**
 * 签单地点/时间 合并输入组件
 * 视觉上合并为一个字段，实际仍为 signingPortId 和 signingTime 两个独立字段
 */
import { computed, defineAsyncComponent } from 'vue';

import { DatePicker } from 'ant-design-vue';

const PortSelect = defineAsyncComponent(
  () => import('./biz-select/port-select.vue'),
);

interface Props {
  /** 签单日期（主字段，由表单绑定） */
  value?: any;
  /** 禁用 */
  disabled?: boolean;
  /** 表单上下文，用于更新 signingPortId */
  formContext?: { setFieldValue: (field: string, value: any) => void };
  /** 第二字段名，默认 signingPortId */
  secondFieldName?: string;
  /** 第二字段的当前值 */
  secondFieldValue?: any;
  /** 第二字段额外属性（例如 selectedItems） */
  secondFieldProps?: {
    allowClear?: boolean;
    placeholder?: string;
    selectedItems?: any[];
  };
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  secondFieldName: 'signingPortId',
  secondFieldValue: undefined,
  secondFieldProps: () => ({
    allowClear: true,
    placeholder: undefined,
    selectedItems: [],
  }),
});

const emit = defineEmits<{
  'update:value': [value: any];
}>();

const dateValue = computed(() => props.value);
const portValue = computed(() => props.secondFieldValue);
const portPlaceholder = computed(
  () => props.secondFieldProps?.placeholder || '请选择',
);
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <PortSelect
      :model-value="portValue"
      :disabled="props.disabled"
      :allow-clear="props.secondFieldProps?.allowClear ?? true"
      :placeholder="portPlaceholder"
      :selected-items="props.secondFieldProps?.selectedItems || []"
      class="flex-1"
      @update:model-value="
        (v) => props.formContext?.setFieldValue(props.secondFieldName, v)
      "
    />
    <DatePicker
      :value="dateValue"
      :disabled="props.disabled"
      placeholder="请选择日期"
      class="flex-1"
      @update:value="(v) => emit('update:value', v)"
    />
  </div>
</template>
