<script lang="ts" setup>
import type { ClientAdminApi } from '#/api/sea-export/client-admin';

import { computed, ref, toRef, watch } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import {
  getClientDetail,
  getClientPagedList,
} from '#/api/sea-export/client-admin';

import { usePagedSelect } from './use-paged-select';

/** 行业类别枚举：a 船公司、b 发货人、c 场站 等 */
export type IndustryCategory = string;

interface Props {
  /** 行业类别，如 'a' 船公司、'b' 发货人，决定下拉数据来源 */
  industryCategory: IndustryCategory;
  /** label 字段名，默认 'name'，可用值：'name' | 'code' | 'fullName' */
  labelKey?: string;
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** placeholder */
  placeholder?: string;
  /** 已选中的客户对象数组（用于编辑时回显） */
  selectedItems?: ClientAdminApi.ClientDto[];
  /** value 字段名，默认 'id' */
  valueKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'name',
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
const industryCategoryRef = toRef(props, 'industryCategory');

const mapClientToOption = (client: ClientAdminApi.ClientDto) => {
  const clientAny = client as any;
  let label = clientAny?.[props.labelKey];
  if (!label && props.labelKey === 'code') {
    label = client.name || client.code;
  }
  if (!label && props.labelKey === 'fullName') {
    label = client.fullName || client.name;
  }
  label = label || client.name || client.code || client.fullName || '';

  return {
    disabled: false,
    label,
    value: clientAny?.[props.valueKey],
  };
};

const fetchPageAdapter = async (params: {
  KeyWords?: string;
  PageIndex: number;
  PageSize: number;
  IndustryCategory?: string;
}) => {
  const res = await getClientPagedList({
    Keyword: params.KeyWords,
    IndustryCategory: params.IndustryCategory,
    PageIndex: params.PageIndex,
    PageSize: params.PageSize,
  });
  return {
    items: res.items || [],
    total: res.totalCount || 0,
  };
};

const extraParamsRef = computed(() => ({
  IndustryCategory: industryCategoryRef.value,
}));

const { api, handlePopupScroll, handleSearch, mergeSelectedItems, params } =
  usePagedSelect({
    fetchPage: fetchPageAdapter,
    mapItemToOption: mapClientToOption,
    extraParamsRef,
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
      const detail = await getClientDetail(id);
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
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :key="name" :name="name" v-bind="slotData || {}"></slot>
    </template>
  </ApiComponent>
</template>
