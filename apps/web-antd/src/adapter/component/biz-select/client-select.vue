<script lang="ts" setup>
import type { ClientAppApi } from '#/api/common/client';

import { computed, ref, toRef } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import { getClientPagedList } from '#/api/common/client';

import { usePagedSelect } from './use-paged-select';

/** 行业类别枚举：a 船公司、b 发货人、c 场站 等 */
export type IndustryCategory = string;

interface Props {
  /** 行业类别，如 'a' 船公司、'b' 发货人，决定下拉数据来源（通用接口必填） */
  industryCategory?: IndustryCategory;
  /** label 字段名，默认 'name'，可用值：'name' | 'code' | 'fullName' */
  labelKey?: string;
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** placeholder */
  placeholder?: string;
  /**
   * 已选中的客户对象数组（编辑回显必传，含 id/name 等简易字段）
   * 通用 Client 接口无 Detail，不再按 id 拉 Admin 详情
   */
  selectedItems?: ClientAppApi.ClientSimpleDto[];
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
  change: [value: any, option: any | any[]];
}>();

const modelValue = defineModel<any>();
const selectedItemsRef = toRef(props, 'selectedItems');
const industryCategoryRef = toRef(props, 'industryCategory');

const mapClientToOption = (client: ClientAppApi.ClientSimpleDto) => {
  const clientAny = client as any;
  let label = clientAny?.[props.labelKey];
  if (!label && props.labelKey === 'code') {
    label = client.name || client.code;
  }
  if (!label && props.labelKey === 'fullName') {
    label = client.fullName || client.name;
  }
  label = label || client.name || client.code || client.fullName || '';

  const rawValue = clientAny?.[props.valueKey];
  return {
    disabled: false,
    label,
    /** 用于懒加载缓存的label值 */
    rawLabel: label,
    value: rawValue === undefined || rawValue === null ? '' : rawValue,
  };
};

const fetchPageAdapter = async (params: {
  KeyWords?: string;
  PageIndex: number;
  PageSize: number;
  industryCategory?: string;
}) => {
  const industryCategory = params.industryCategory;
  if (!industryCategory) {
    return { items: [], total: 0 };
  }
  const res = await getClientPagedList({
    keyword: params.KeyWords,
    industryCategory,
    pageIndex: params.PageIndex,
    pageSize: params.PageSize,
  });
  return {
    items: res.items || [],
    total: res.totalCount || 0,
  };
};

const extraParamsRef = computed(() => ({
  industryCategory: industryCategoryRef.value,
}));

const {
  api,
  handleDropdownVisibleChange,
  handlePopupScroll,
  handleSearch,
  params,
  pinSelectedFromOptions,
  searchValue,
} = usePagedSelect({
  fetchPage: fetchPageAdapter,
  mapItemToOption: mapClientToOption,
  extraParamsRef,
  pageSize: props.pageSize,
  queryKey: ['client'],
  selectedItemsRef,
  selectedValuesRef: modelValue,
  valueKey: props.valueKey,
});

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const apiComponentRef = ref();

const handleChange = (value: any) => {
  const options = apiComponentRef.value?.getOptions?.() ?? [];
  pinSelectedFromOptions(value, options);
  modelValue.value = value;
  emit('update:modelValue', value);
};

const handleSelectChange = (value: any, option: any | any[]) => {
  emit('change', value, option);
  handleChange(value);
};

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
    :search-value="searchValue"
    @change="handleSelectChange"
    @dropdown-visible-change="handleDropdownVisibleChange"
    @search="handleSearch"
    @popup-scroll="handlePopupScroll"
    v-bind="$attrs"
    class="biz-select w-full"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :key="name" :name="name" v-bind="slotData || {}"></slot>
    </template>
  </ApiComponent>
</template>
