<script lang="ts" setup>
import type { FeeCodeAdminApi } from '#/api/system/base-data/fee-code-admin';

import { computed, ref, toRef, watch, h } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select, Tag } from 'ant-design-vue';

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
  /** 是否已保存（id 不为空表示已保存） */
  isSaved?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'cnName',
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  valueKey: 'id',
  isSaved: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const modelValue = defineModel<any>();
const selectedItemsRef = toRef(props, 'selectedItems');

const mapItemToOption = (item: FeeCodeAdminApi.FeeCodeDto) => {
  const itemAny = item as any;
  let surLabel = itemAny?.[props.labelKey] || '';
  let label = item.code ? item.code + '-' + surLabel : surLabel;
  if (!label && props.labelKey === 'enName') {
    label = item.enName;
  }
  if (!label && props.labelKey === 'code') {
    label = item.cnName || item.code;
  }
  label = label || item.cnName || item.enName || item.code || '';

  const rawValue = itemAny?.[props.valueKey];
  return {
    disabled: !item.enable,
    label,
    rowLabel: itemAny?.[props.labelKey],
    value: rawValue === undefined || rawValue === null ? '' : rawValue,
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

const {
  api,
  handleDropdownVisibleChange,
  handlePopupScroll,
  handleSearch,
  mergeSelectedItems,
  params,
  searchValue,
} = usePagedSelect({
  fetchPage: fetchPageAdapter,
  mapItemToOption,
  pageSize: props.pageSize,
  queryKey: ['fee-code'],
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
      const detail = await getFeeCodeDetail(idStr);
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
  <div class="fee-code-select-wrapper">
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
      :option-label-prop="'rowLabel'"
      loading-slot="suffixIcon"
      model-prop-name="value"
      :search-value="searchValue"
      @update:model-value="handleChange"
      @dropdown-visible-change="handleDropdownVisibleChange"
      @search="handleSearch"
      @popup-scroll="handlePopupScroll"
      v-bind="$attrs"
      class="w-full"
    >
      <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
        <slot :name="name" v-bind="slotData || {}"></slot>
      </template>
    </ApiComponent>

    <!-- 未保存状态显示红色三角形标签 -->
    <Tag v-if="!isSaved" color="red" class="unsaved-indicator" />
  </div>
</template>

<style scoped lang="scss">
.fee-code-select-wrapper {
  position: relative;
  display: inline-block;
  width: 100%;
}

.unsaved-indicator {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  width: 14px;
  height: 14px;
  pointer-events: none;
  background-color: #ff4d4f;
  border-radius: 0 !important;
  clip-path: polygon(0 0, 100% 0, 0 100%);
}
</style>
