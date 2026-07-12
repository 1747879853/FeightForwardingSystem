<script lang="ts" setup>
import { computed, ref, toRef, watch } from 'vue';

import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import { getIndustryCategoryOptions } from '#/views/sea-export-admin/orderFee/data';

interface Props {
  /** placeholder */
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const modelValue = defineModel<any>();

// 获取行业类别选项（使用key作为value，与表格编辑模式保持一致）
const industryCategoryOptions = computed(() => {
  return getIndustryCategoryOptions().map((item) => ({
    label: item.label,
    value: item.key,
  }));
});

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const handleChange = (value: any) => {
  modelValue.value = value;
  emit('update:modelValue', value);
};

defineExpose({
  getValue: () => modelValue.value,
  getOptions: () => industryCategoryOptions.value,
});
</script>

<template>
  <Select
    v-model:value="modelValue"
    :options="industryCategoryOptions"
    :placeholder="computedPlaceholder"
    :allow-clear="true"
    @update:value="handleChange"
    v-bind="$attrs"
    class="biz-select w-full"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </Select>
</template>
