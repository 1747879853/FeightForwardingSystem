<script lang="ts" setup>
/**
 * 提单份数/副本份数 合并输入组件
 * 视觉上合并为一个字段，实际仍为 noBillEnum 和 copyNoBillEnum 两个独立字段
 */
import { computed } from 'vue';

import { Select } from 'ant-design-vue';

interface OptionItem {
  label: string;
  value: number | string;
}

interface Props {
  /** 提单份数（主字段，由表单绑定） */
  value?: number | string;
  /** 禁用 */
  disabled?: boolean;
  /** 下拉选项 */
  options?: OptionItem[];
  /** 表单上下文，用于更新 copyNoBillEnum */
  formContext?: { setFieldValue: (field: string, value: any) => void };
  /** 第二字段名，默认 copyNoBillEnum */
  secondFieldName?: string;
  /** 第二字段当前值 */
  secondFieldValue?: number | string;
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  disabled: false,
  options: () => [],
  secondFieldName: 'copyNoBillEnum',
  secondFieldValue: undefined,
});

const emit = defineEmits<{
  'update:value': [value: number | string | undefined];
}>();

const firstValue = computed(() => props.value);
const secondValue = computed(() => props.secondFieldValue);
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <Select
      :value="firstValue"
      :disabled="props.disabled"
      :options="props.options"
      class="flex-1"
      placeholder="请选择"
      allow-clear
      @update:value="(v) => emit('update:value', v)"
    />
    <Select
      :value="secondValue"
      :disabled="props.disabled"
      :options="props.options"
      class="flex-1"
      placeholder="请选择"
      allow-clear
      @update:value="
        (v) => props.formContext?.setFieldValue(props.secondFieldName, v)
      "
    />
  </div>
</template>
