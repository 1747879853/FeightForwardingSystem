<script lang="ts" setup>
/**
 * 船名/航次 合并输入组件
 * 视觉上合并为一个字段，实际仍为 vessel 和 innerVoyno 两个独立字段
 */
import { computed } from 'vue';

import { $t } from '@vben/locales';

import { Input } from 'ant-design-vue';

interface Props {
  /** 船名（主字段，由表单绑定） */
  value?: string;
  /** 禁用 */
  disabled?: boolean;
  /** 占位符 */
  placeholder?: string;
  /** 表单上下文，用于更新 innerVoyno */
  formContext?: { setFieldValue: (field: string, value: any) => void };
  /** 第二字段名，默认 innerVoyno */
  secondFieldName?: string;
  /** 第二字段的当前值（从 formContext 或外部传入） */
  secondFieldValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
  value: '',
  secondFieldName: 'innerVoyno',
  secondFieldValue: '',
});

const emit = defineEmits<{
  'update:value': [value: string];
}>();

const vesselValue = computed(() => props.value ?? '');

const voyageValue = computed(() => props.secondFieldValue ?? '');
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <Input
      :value="vesselValue"
      :disabled="props.disabled"
      :placeholder="$t('seaExport.export.vessel')"
      class="flex-1"
      allow-clear
      @update:value="(v) => emit('update:value', v)"
    />
    <Input
      :value="voyageValue"
      :disabled="props.disabled"
      :placeholder="$t('seaExport.export.innerVoyno')"
      class="flex-1"
      allow-clear
      @update:value="
        (v) => props.formContext?.setFieldValue(props.secondFieldName, v)
      "
    />
  </div>
</template>
