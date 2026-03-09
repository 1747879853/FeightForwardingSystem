<script lang="ts" setup>
import type { ExchangeRateAdminApi } from '#/api/system/base-data/exchange-rate-admin';

import { computed, ref, toRef, watch } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import {
  getExchangeRateDetail,
  getExchangeRatePagedList,
} from '#/api/system/base-data/exchange-rate-admin';

import { usePagedSelect } from './use-paged-select';

interface Props {
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** placeholder */
  placeholder?: string;
  /** 已选中的汇率对象数组（用于编辑时回显） */
  selectedItems?: ExchangeRateAdminApi.ExchangeRateDto[];
  /** value 字段名，默认 'id' */
  valueKey?: string;
  /** 筛选币别 ID，可选 */
  currencyId?: number;
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  valueKey: 'id',
  currencyId: undefined,
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const modelValue = defineModel<any>();
const selectedItemsRef = toRef(props, 'selectedItems');
const currencyIdRef = toRef(props, 'currencyId');

const mapItemToOption = (item: ExchangeRateAdminApi.ExchangeRateDto) => {
  const itemAny = item as any;
  const label =
    item.localCurrency && item.calculateValue != null
      ? `${item.localCurrency} / ${item.calculateValue}`
      : item.id?.toString() || '';

  const rawValue = itemAny?.[props.valueKey];
  return {
    disabled: !item.enable,
    label: label || `#${item.id}`,
    value: rawValue === undefined || rawValue === null ? '' : rawValue,
  };
};

const extraParamsRef = computed(() => {
  const params: Record<string, any> = {};
  if (currencyIdRef.value != null) {
    params.CurrencyId = currencyIdRef.value;
  }
  return params;
});

const fetchPageAdapter = async (params: {
  KeyWords?: string;
  PageIndex: number;
  PageSize: number;
  CurrencyId?: number;
}) => {
  const res = await getExchangeRatePagedList({
    Keyword: params.KeyWords,
    PageIndex: params.PageIndex,
    PageSize: params.PageSize,
    CurrencyId: params.CurrencyId,
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
    extraParamsRef,
    pageSize: props.pageSize,
    queryKey: ['exchange-rate'],
    selectedItemsRef,
    valueKey: props.valueKey,
  });

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const apiComponentRef = ref();

/** 解析为字符串 ID，避免大数精度丢失（JS Number 安全整数上限为 2^53-1） */
const parseIdToSafeString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (value === '') return null;
  return String(value);
};

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
      const detail = await getExchangeRateDetail(idStr);
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
