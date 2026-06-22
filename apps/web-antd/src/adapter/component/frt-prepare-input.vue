<script lang="ts" setup>
/**
 * 付费方式/付费地点 合并输入组件
 * 视觉上合并为一个字段，实际仍为 codeFrtId 和 prepareAtId 两个独立字段
 */
import { computed, defineAsyncComponent } from 'vue';

const CodeFrtSelect = defineAsyncComponent(
  () => import('./biz-select/code-frt-select.vue'),
);
const PortSelect = defineAsyncComponent(
  () => import('./biz-select/port-select.vue'),
);

interface SelectFieldProps {
  allowClear?: boolean;
  placeholder?: string;
  selectedItems?: any[];
}

interface Props {
  /** 付费方式（主字段，由表单绑定） */
  value?: number | string;
  /** 禁用 */
  disabled?: boolean;
  /** 表单上下文，用于更新 prepareAtId */
  formContext?: { setFieldValue: (field: string, value: any) => void };
  /** 第二字段名，默认 prepareAtId */
  secondFieldName?: string;
  /** 第二字段当前值 */
  secondFieldValue?: number | string;
  /** 付费方式额外属性 */
  frtProps?: SelectFieldProps;
  /** 付费地点额外属性 */
  prepareProps?: SelectFieldProps;
  /** 与基础信息等区域一致的控件尺寸 */
  size?: 'large' | 'middle' | 'small';
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  disabled: false,
  secondFieldName: 'prepareAtId',
  secondFieldValue: undefined,
  frtProps: () => ({
    allowClear: true,
    placeholder: undefined,
    selectedItems: [],
  }),
  prepareProps: () => ({
    allowClear: true,
    placeholder: undefined,
    selectedItems: [],
  }),
  size: undefined,
});

const emit = defineEmits<{
  'update:value': [value: number | string | undefined];
}>();

const frtValue = computed(() => props.value);
const prepareValue = computed(() => props.secondFieldValue);
const frtPlaceholder = computed(() => props.frtProps?.placeholder || '请选择');
const preparePlaceholder = computed(
  () => props.prepareProps?.placeholder || '请选择',
);
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <CodeFrtSelect
      :model-value="frtValue"
      :disabled="props.disabled"
      :allow-clear="props.frtProps?.allowClear ?? true"
      :placeholder="frtPlaceholder"
      :selected-items="props.frtProps?.selectedItems || []"
      :size="props.size"
      class="flex-1"
      @update:model-value="(v) => emit('update:value', v)"
    />
    <PortSelect
      :model-value="prepareValue"
      :disabled="props.disabled"
      :allow-clear="props.prepareProps?.allowClear ?? true"
      :placeholder="preparePlaceholder"
      :selected-items="props.prepareProps?.selectedItems || []"
      label-key="ediCode"
      :size="props.size"
      class="flex-1"
      @update:model-value="
        (v) => props.formContext?.setFieldValue(props.secondFieldName, v)
      "
    />
  </div>
</template>
