<script lang="ts" setup>
import type { CurrencyAdminApi } from '#/api/system/base-data/currency-admin';

import { computed, ref, toRef, watch } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import {
  getCurrencyDetail,
  getCurrencyPagedList,
} from '#/api/system/base-data/currency-admin';

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
  /** 额外选项，常用于追加“全部/原币”等固定项 */
  extraOptions?: Array<{
    disabled?: boolean;
    label: string;
    value: any;
  }>;
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'code',
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  valueKey: 'id',
  extraOptions: () => [],
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

  const rawValue = (currency as any)[props.valueKey];
  return {
    disabled: !currency.enable,
    label,
    value: rawValue === undefined || rawValue === null ? '' : rawValue,
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
const { api, handlePopupScroll, handleSearch, mergeSelectedItems, params } =
  usePagedSelect({
    fetchPage: fetchPageAdapter,
    mapItemToOption: mapCurrencyToOption,
    pageSize: props.pageSize,
    queryKey: ['currency'],
    selectedItemsRef,
    valueKey: props.valueKey,
  });

const mergedApi = async () => {
  const options = await api();
  if (!props.extraOptions || props.extraOptions.length === 0) {
    return options;
  }
  return [...props.extraOptions, ...options];
};

// 计算 placeholder
const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

// ApiComponent ref
const apiComponentRef = ref();

/** 解析为字符串 ID，避免大数精度丢失（JS Number 安全整数上限为 2^53-1） */
const parseIdToSafeString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (value === '') return null;
  return String(value);
};

// 处理值变化
const handleChange = (value: any) => {
  const values = Array.isArray(value) ? value : [value];
  for (const v of values) {
    const idStr = parseIdToSafeString(v);
    if (idStr !== null) {
      loadedSelectedIds.value.add(idStr);
    }
  }
  modelValue.value = value;
  emit('update:modelValue', value);
};

const ensureSelectedLoaded = async (rawValue: any) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') return;
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  for (const v of values) {
    const idStr = parseIdToSafeString(v);
    if (idStr === null) continue;
    if (loadedSelectedIds.value.has(idStr)) continue;

    loadedSelectedIds.value.add(idStr);
    try {
      const detail = await getCurrencyDetail(idStr);
      mergeSelectedItems([detail]);
    } catch {
      loadedSelectedIds.value.delete(idStr);
    }
  }
};

const loadedSelectedIds = ref(new Set<string>());

watch(
  selectedItemsRef,
  (items) => {
    for (const item of items) {
      const idStr = parseIdToSafeString((item as any)[props.valueKey]);
      if (idStr !== null) {
        loadedSelectedIds.value.add(idStr);
      }
    }
  },
  { immediate: true },
);

watch(
  modelValue,
  (value) => {
    ensureSelectedLoaded(value);
  },
  { immediate: true },
);

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
    :api="mergedApi"
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
