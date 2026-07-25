<script lang="ts" setup>
import type { CtnCodeAdminApi } from '#/api/system/base-data/ctn-code-admin';

import { computed, nextTick, ref, toRef, watch } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import {
  getCtnCodeDetail,
  getCtnCodePagedList,
} from '#/api/system/base-data/ctn-code-admin';

import { usePagedSelect } from './use-paged-select';

interface Props {
  /** label 字段名，默认 'ctnName'，可用值：'ctnName' | 'ctnSize' | 'ctnType' */
  labelKey?: string;
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** placeholder */
  placeholder?: string;
  /** 已选中的集装箱对象数组（用于编辑时回显） */
  selectedItems?: CtnCodeAdminApi.CtnCodeDto[];
  /** value 字段名，默认 'id' */
  valueKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'ctnName',
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  valueKey: 'id',
});

const emit = defineEmits<{
  change: [value: any, option: any];
  'update:modelValue': [value: any];
}>();

const selectedItemsRef = toRef(props, 'selectedItems');

const mapCtnToOption = (ctn: CtnCodeAdminApi.CtnCodeDto) => {
  const ctnAny = ctn as any;
  let label = ctnAny?.[props.labelKey];
  if (!label && props.labelKey === 'ctnSize') {
    label = ctn.ctnName;
  }
  if (!label && props.labelKey === 'ctnType') {
    label = ctn.ctnName;
  }
  label = label || ctn.ctnName || ctn.ctnSize || ctn.ctnType || '';

  const rawValue = ctnAny?.[props.valueKey];
  return {
    disabled: ctn.status === 1,
    label,
    /** 完整箱型 DTO，供业务层 @change 使用 */
    raw: ctn,
    value: rawValue === undefined || rawValue === null ? '' : rawValue,
  };
};

const fetchPageAdapter = async (params: {
  KeyWords?: string;
  PageIndex: number;
  PageSize: number;
}) => {
  const res = await getCtnCodePagedList({
    Keyword: params.KeyWords,
    PageIndex: params.PageIndex,
    PageSize: params.PageSize,
    Sorting: 'OrderNo ASC, Id DESC',
  });
  return {
    items: res.items || [],
    total: res.totalCount || 0,
  };
};

const modelValue = defineModel<any>();

const {
  api,
  findCachedOption,
  handleDropdownVisibleChange,
  handlePopupScroll,
  handleSearch,
  mergeSelectedItems,
  params,
  pinSelectedFromOptions,
  searchValue,
} = usePagedSelect({
  fetchPage: fetchPageAdapter,
  mapItemToOption: mapCtnToOption,
  pageSize: props.pageSize,
  queryKey: ['ctn'],
  selectedItemsRef,
  selectedValuesRef: modelValue,
  valueKey: props.valueKey,
});

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const apiComponentRef = ref();
const loadedSelectedIds = ref(new Set<string>());

/** 解析为字符串 ID，避免大数精度丢失（JS Number 安全整数上限为 2^53-1） */
const parseIdToSafeString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (value === '') return null;
  return String(value);
};

const markLoaded = (rawValue: any) => {
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];
  for (const v of values) {
    const idStr = parseIdToSafeString(v);
    if (idStr !== null) {
      loadedSelectedIds.value.add(idStr);
    }
  }
};

const resolveOption = (value: any) => {
  if (value === undefined || value === null || value === '') return undefined;
  const options = apiComponentRef.value?.getOptions?.() || [];
  return (
    options.find((opt: any) => String(opt?.value) === String(value)) ||
    findCachedOption(value)
  );
};

const hasOptionForValue = (value: any, idStr: string) => {
  if (findCachedOption(value)) return true;
  const options = apiComponentRef.value?.getOptions?.() || [];
  return options.some((opt: any) => String(opt?.value) === idStr);
};

const handleChange = (value: any) => {
  const options = apiComponentRef.value?.getOptions?.() || [];
  // 先 pin，避免下拉关闭 reset 时丢掉已选 option（否则重挂载只能靠详情回显）
  pinSelectedFromOptions(value, options);
  markLoaded(value);

  const matched = resolveOption(value);
  if (matched?.raw) {
    mergeSelectedItems([matched.raw]);
  }

  modelValue.value = value;
  emit('update:modelValue', value);

  if (value === undefined || value === null || value === '') {
    emit('change', value, undefined);
    return;
  }
  emit('change', value, matched);
};

/**
 * 仅用于「编辑回显且父级未提供 selectedItems」的兜底。
 * 下拉选中场景：option 已在缓存/列表中，或 handleChange 已 markLoaded，绝不应打详情。
 */
const ensureSelectedLoaded = async (rawValue: any) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') return;
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  for (const v of values) {
    const idStr = parseIdToSafeString(v);
    if (idStr === null) continue;

    if (loadedSelectedIds.value.has(idStr) || hasOptionForValue(v, idStr)) {
      loadedSelectedIds.value.add(idStr);
      continue;
    }

    // 等一拍：父级 selectedItems / pin 可能尚未同步（表格 cell 重挂载时尤甚）
    await nextTick();
    if (loadedSelectedIds.value.has(idStr) || hasOptionForValue(v, idStr)) {
      loadedSelectedIds.value.add(idStr);
      continue;
    }

    loadedSelectedIds.value.add(idStr);
    try {
      const detail = await getCtnCodeDetail(idStr);
      mergeSelectedItems([detail]);
    } catch {
      loadedSelectedIds.value.delete(idStr);
    }
  }
};

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
    :search-value="searchValue"
    @update:model-value="handleChange"
    @dropdown-visible-change="handleDropdownVisibleChange"
    @search="handleSearch"
    @popup-scroll="handlePopupScroll"
    v-bind="$attrs"
    class="biz-select w-full"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </ApiComponent>
</template>
