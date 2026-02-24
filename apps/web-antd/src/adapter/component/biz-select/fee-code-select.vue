<script lang="ts" setup>
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';

import { computed, ref, toRef, watch } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import {
  getFeeCodeDetail,
  getFeeCodePagedList,
} from '#/api/system/base-data/fee-code-admin';

import { usePagedSelect } from './use-paged-select';

interface Props {
  /** label 字段名，默认 'cnName'，可用值：'cnName' | 'enName' | 'code' */
  labelKey?: string;
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** placeholder */
  placeholder?: string;
  /** 已选中的费用代码对象数组（用于编辑时回显） */
  selectedItems?: FeeCodeAdminApi.FeeCodeDto[];
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
const selectedItemsRef = toRef(props, 'selectedItems');

const mapItemToOption = (item: FeeCodeAdminApi.FeeCodeDto) => {
  const itemAny = item as any;
  let label = itemAny?.[props.labelKey];
  if (!label && props.labelKey === 'enName') {
    label = item.cnName;
  }
  if (!label && props.labelKey === 'code') {
    label = item.cnName || item.code;
  }
  label = label || item.cnName || item.enName || item.code || '';

  return {
    disabled: !item.enable,
    label,
    value: itemAny?.[props.valueKey],
  };
};

const fetchPageAdapter = async (params: {
  KeyWords?: string;
  PageIndex: number;
  PageSize: number;
}) => {
  const res = await getFeeCodePagedList({
    Keyword: params.KeyWords,
    PageIndex: params.PageIndex,
    PageSize: params.PageSize,
  });
  return {
    items: res.items || [],
    total: res.totalCount || 0,
  };
};

const { api, handlePopupScroll, handleSearch, mergeSelectedItems, params } =
  usePagedSelect({
    fetchPage: fetchPageAdapter,
    mapItemToOption,
    pageSize: props.pageSize,
    selectedItemsRef,
    valueKey: props.valueKey,
  });

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const handleChange = (value: any) => {
  modelValue.value = value;
  emit('update:modelValue', value);
};

const apiComponentRef = ref();

const parseId = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const ensureSelectedLoaded = async (rawValue: any) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') return;
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  for (const v of values) {
    const id = parseId(v);
    if (id === null) continue;
    if (loadedSelectedIds.value.has(id)) continue;

    loadedSelectedIds.value.add(id);
    try {
      const detail = await getFeeCodeDetail(id);
      mergeSelectedItems([detail]);
    } catch {
      loadedSelectedIds.value.delete(id);
    }
  }
};

const loadedSelectedIds = ref(new Set<number>());

watch(
  modelValue,
  (value) => {
    ensureSelectedLoaded(value);
  },
  { immediate: true },
);

defineExpose({
  getApiComponentRef: () => apiComponentRef.value,
  getOptions: () => apiComponentRef.value?.getOptions?.() || [],
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
