<script lang="ts" setup>
import type { CurrencyAdminApi } from '#/api/system/base-data/currency-admin';

import { computed, ref, toRef } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import { getCurrencyPagedList } from '#/api/system/base-data/currency-admin';

import { usePagedSelect } from './use-paged-select';

interface Props {
  /** label 字段名，默认 'cnName'，可用值：'cnName' | 'enName' | 'code' */
  labelKey?: string;
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** placeholder */
  placeholder?: string;
  /** 已选中的币别对象数组（用于编辑时回显） */
  selectedItems?: CurrencyAdminApi.CurrencyDto[];
  /** value 字段名，默认 'id' */
  valueKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'cnName',
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  valueKey: 'id',
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const modelValue = defineModel<any>();

// 响应式引用 selectedItems
const selectedItemsRef = toRef(props, 'selectedItems');

// 将币别数据转换为 Option
const mapCurrencyToOption = (currency: CurrencyAdminApi.CurrencyDto) => {
  // 优先使用指定的 labelKey，fallback 到 cnName
  let label = (currency as any)[props.labelKey];
  if (!label && props.labelKey === 'enName') {
    label = currency.cnName;
  }
  if (!label && props.labelKey === 'code') {
    label = currency.code;
  }
  label = label || currency.cnName || currency.code;

  return {
    disabled: !currency.enable,
    label,
    value: (currency as any)[props.valueKey],
  };
};

// 适配 fetchPage 函数以匹配 getCurrencyPagedList 的返回格式
const fetchPageAdapter = async (params: {
  KeyWords?: string;
  PageIndex: number;
  PageSize: number;
}) => {
  const res = await getCurrencyPagedList({
    Keyword: params.KeyWords,
    PageIndex: params.PageIndex,
    PageSize: params.PageSize,
  });
  return {
    items: res.items || [],
    total: res.totalCount || 0,
  };
};

// 使用分页选择组合式函数
const { api, handlePopupScroll, handleSearch, params } = usePagedSelect({
  fetchPage: fetchPageAdapter,
  mapItemToOption: mapCurrencyToOption,
  pageSize: props.pageSize,
  selectedItemsRef,
  valueKey: props.valueKey,
});

// 计算 placeholder
const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

// 处理值变化
const handleChange = (value: any) => {
  modelValue.value = value;
  emit('update:modelValue', value);
};

// ApiComponent ref
const apiComponentRef = ref();

// 暴露方法
defineExpose({
  /** 获取 ApiComponent 实例 */
  getApiComponentRef: () => apiComponentRef.value,
  /** 获取当前 options */
  getOptions: () => apiComponentRef.value?.getOptions?.() || [],
  /** 获取当前值 */
  getValue: () => modelValue.value,
});
</script>

<template>
  <ApiComponent
    ref="apiComponentRef"
    :component="Select"
    :api="api"
    :params="params"
    :model-value="modelValue"
    :placeholder="computedPlaceholder"
    :filter-option="false"
    :show-search="true"
    :allow-clear="true"
    loading-slot="suffixIcon"
    model-prop-name="value"
    visible-event="onDropdownVisibleChange"
    @update:model-value="handleChange"
    @search="handleSearch"
    @popup-scroll="handlePopupScroll"
    v-bind="$attrs"
    class="w-full"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </ApiComponent>
</template>
