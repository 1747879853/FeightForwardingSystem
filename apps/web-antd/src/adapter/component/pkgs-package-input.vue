<script lang="ts" setup>
/**
 * 件数/包装 合并输入组件
 * 视觉上合并为一个字段，实际仍为 pkgs 和 codePackageId 两个独立字段
 */
import { computed } from 'vue';

import { $t } from '@vben/locales';

import { InputNumber } from 'ant-design-vue';

import CodePackageSelect from './biz-select/code-package-select.vue';

interface Props {
  /** 件数（主字段，由表单绑定） */
  value?: null | number;
  /** 禁用 */
  disabled?: boolean;
  /** 表单上下文，用于更新 codePackageId */
  formContext?: { setFieldValue: (field: string, value: any) => void };
  /** 第二字段名，默认 codePackageId */
  secondFieldName?: string;
  /** 第二字段的当前值 */
  secondFieldValue?: null | number | string;
  /** 包装下拉回显项 */
  selectedItems?: any[];
  /** 与委托信息等区域一致的控件尺寸 */
  size?: 'large' | 'middle' | 'small';
  /** 件数（主字段）flex 伸缩比例，默认 1 */
  mainRatio?: number;
  /** 包装（第二字段）flex 伸缩比例，默认 3 */
  secondRatio?: number;
}

const props = withDefaults(defineProps<Props>(), {
  value: undefined,
  secondFieldName: 'codePackageId',
  secondFieldValue: undefined,
  selectedItems: () => [],
  size: undefined,
  mainRatio: 1,
  secondRatio: 3,
});

const emit = defineEmits<{
  'update:value': [value: null | number | undefined];
}>();

const pkgsValue = computed(() => props.value ?? undefined);
const packageValue = computed(() => props.secondFieldValue ?? undefined);

const handlePkgsChange = (value: null | number | string | undefined) => {
  emit(
    'update:value',
    value === undefined || value === null || value === ''
      ? undefined
      : Number(value),
  );
};

const handlePackageChange = (value: any) => {
  props.formContext?.setFieldValue(
    props.secondFieldName,
    value === undefined || value === null || value === '' ? undefined : value,
  );
};
</script>

<template>
  <div class="flex w-full items-center gap-2">
    <InputNumber
      :value="pkgsValue"
      :disabled="props.disabled"
      :placeholder="$t('seaImport.import.pkgs')"
      :size="props.size"
      :min="0"
      :controls="false"
      :precision="0"
      class="min-w-0"
      :style="{ flex: props.mainRatio }"
      @update:value="handlePkgsChange"
    />
    <CodePackageSelect
      :model-value="packageValue"
      :disabled="props.disabled"
      :placeholder="$t('seaImport.import.codePackageId')"
      :size="props.size"
      :selected-items="props.selectedItems"
      allow-clear
      class="min-w-0"
      :style="{ flex: props.secondRatio }"
      @update:model-value="handlePackageChange"
    />
  </div>
</template>
