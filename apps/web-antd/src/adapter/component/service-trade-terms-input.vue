<script lang="ts" setup>
/**
 * 运输条款/贸易条款 合并输入组件
 * 视觉上合并为一个字段，实际仍为 codeServiceId 和 tradeTermsType 两个独立字段
 */
import { computed, defineAsyncComponent } from 'vue';

import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

const CodeServiceSelect = defineAsyncComponent(
  () => import('./biz-select/code-service-select.vue'),
);

interface SelectOption {
  label: string;
  value: number | string;
}

interface ServiceFieldProps {
  allowClear?: boolean;
  placeholder?: string;
  selectedItems?: any[];
}

interface Props {
  /** 运输条款（主字段，由表单绑定） */
  value?: number | string;
  /** 禁用 */
  disabled?: boolean;
  /** 表单上下文，用于更新 tradeTermsType */
  formContext?: { setFieldValue: (field: string, value: any) => void };
  /** 第二字段名，默认 tradeTermsType */
  secondFieldName?: string;
  /** 第二字段当前值 */
  secondFieldValue?: number | string;
  /** 运输条款额外属性 */
  serviceProps?: ServiceFieldProps;
  /** 贸易条款下拉选项 */
  tradeTermsOptions?: SelectOption[];
  /** 贸易条款额外属性 */
  tradeTermsProps?: { allowClear?: boolean; placeholder?: string };
  /** 与基础信息等区域一致的控件尺寸 */
  size?: 'large' | 'middle' | 'small';
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  disabled: false,
  secondFieldName: 'tradeTermsType',
  secondFieldValue: undefined,
  serviceProps: () => ({
    allowClear: true,
    placeholder: undefined,
    selectedItems: [],
  }),
  tradeTermsOptions: () => [],
  tradeTermsProps: () => ({
    allowClear: true,
    placeholder: undefined,
  }),
  size: undefined,
});

const emit = defineEmits<{
  'update:value': [value: number | string | undefined];
}>();

const serviceValue = computed(() => props.value);
const tradeTermsValue = computed(() => props.secondFieldValue);
const servicePlaceholder = computed(
  () => props.serviceProps?.placeholder || $t('ui.placeholder.select'),
);
const tradeTermsPlaceholder = computed(
  () => props.tradeTermsProps?.placeholder || $t('ui.placeholder.select'),
);
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <CodeServiceSelect
      :model-value="serviceValue"
      :disabled="props.disabled"
      :allow-clear="props.serviceProps?.allowClear ?? true"
      :placeholder="servicePlaceholder"
      :selected-items="props.serviceProps?.selectedItems || []"
      :size="props.size"
      class="min-w-0 flex-1"
      @update:model-value="(v) => emit('update:value', v)"
    />
    <Select
      :value="tradeTermsValue"
      :disabled="props.disabled"
      :allow-clear="props.tradeTermsProps?.allowClear ?? true"
      :placeholder="tradeTermsPlaceholder"
      :options="props.tradeTermsOptions"
      :size="props.size"
      class="min-w-0 flex-1"
      @update:value="
        (v) => props.formContext?.setFieldValue(props.secondFieldName, v)
      "
    />
  </div>
</template>
