<script lang="ts" setup>
import type { CodePackageAdminApi } from '#/api/system/base-data/code-package-admin';

import { computed, toRef, useAttrs, watch } from 'vue';

import { $t } from '@vben/locales';

import { objectOmit } from '@vueuse/core';

import { Select } from 'ant-design-vue';

import { getCodePackageDetail } from '#/api/system/base-data/code-package-admin';

import { codePackageListCache } from './cache/code-package-cache';
import { useCachedSelect } from './use-cached-select';
import type { OptionItem } from './use-paged-select';

defineOptions({ inheritAttrs: false });

interface Props {
  /** label 字段名，默认 'name'，可用值：'name' | 'description' | 'ediCode' */
  labelKey?: string;
  /** 兼容旧调用，全量缓存后不再分页 */
  pageSize?: number;
  /** placeholder */
  placeholder?: string;
  /** 已选中的包装类型对象数组（用于编辑时回显） */
  selectedItems?: CodePackageAdminApi.CodePackageDto[];
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
  change: [value: any, option?: { label?: string; value?: any }];
  'update:modelValue': [value: any];
}>();

const attrs = useAttrs();
const modelValue = defineModel<any>();
const selectedItemsRef = toRef(props, 'selectedItems');

const bindProps = computed(() =>
  objectOmit(attrs, ['value', 'onUpdate:value', 'onUpdate:modelValue']),
);

const mapItemToOption = (item: CodePackageAdminApi.CodePackageDto) => {
  const itemAny = item as any;
  let label = itemAny?.[props.labelKey];
  if (!label && props.labelKey === 'description') {
    label = item.name;
  }
  if (!label && props.labelKey === 'ediCode') {
    label = item.name || item.ediCode;
  }
  label = label || item.name || item.description || item.ediCode || '';

  const rawValue = itemAny?.[props.valueKey];
  return {
    disabled: !item.enable,
    label,
    value: rawValue === undefined || rawValue === null ? '' : rawValue,
  };
};

const matchesKeyword = (
  item: CodePackageAdminApi.CodePackageDto,
  query: string,
) => {
  const haystacks = [item.name, item.description, item.ediCode, item.afrCode];
  return haystacks.some((text) =>
    String(text ?? '')
      .toLowerCase()
      .includes(query),
  );
};

const {
  handleDropdownVisibleChange,
  handleSearch,
  loading,
  mergeSelectedItems,
  options,
  pinSelectedFromOptions,
  searchValue,
  findCachedOption,
} = useCachedSelect({
  cache: codePackageListCache,
  mapItemToOption,
  matchesKeyword,
  selectedItemsRef,
  selectedValuesRef: modelValue,
});

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const loadedSelectedIds = new Set<string>();

const parseIdToSafeString = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
};

const handleChange = (value: any) => {
  pinSelectedFromOptions(value, options.value);
  modelValue.value = value;
  emit('update:modelValue', value);

  if (value === undefined || value === null || value === '') {
    emit('change', value, undefined);
    return;
  }
  const matched = options.value.find(
    (opt: OptionItem) => String(opt?.value) === String(value),
  );
  emit('change', value, matched);
};

const ensureSelectedLoaded = async (rawValue: any) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') return;
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  for (const value of values) {
    const idStr = parseIdToSafeString(value);
    if (idStr === null) continue;

    if (options.value.some((option) => String(option.value) === idStr)) {
      loadedSelectedIds.add(idStr);
      continue;
    }
    if (findCachedOption(idStr)) {
      const cached = codePackageListCache.findById(idStr);
      if (cached) mergeSelectedItems([cached]);
      loadedSelectedIds.add(idStr);
      continue;
    }
    if (loadedSelectedIds.has(idStr)) continue;

    loadedSelectedIds.add(idStr);
    try {
      const cached = codePackageListCache.findById(idStr);
      if (cached) {
        mergeSelectedItems([cached]);
        continue;
      }
      const detail = await getCodePackageDetail(idStr);
      if (detail) mergeSelectedItems([detail]);
    } catch {
      loadedSelectedIds.delete(idStr);
    }
  }
};

watch(
  selectedItemsRef,
  (list) => {
    for (const item of list) {
      const idStr = parseIdToSafeString((item as any)[props.valueKey]);
      if (idStr !== null) loadedSelectedIds.add(idStr);
    }
  },
  { immediate: true },
);

watch(
  modelValue,
  (value) => {
    void ensureSelectedLoaded(value);
  },
  { immediate: true },
);

watch(
  () => codePackageListCache.items.value,
  () => {
    void ensureSelectedLoaded(modelValue.value);
  },
);

defineExpose({
  getApiComponentRef: () => undefined,
  getOptions: () => options.value,
  getValue: () => modelValue.value,
});
</script>

<template>
  <Select
    v-bind="bindProps"
    :value="modelValue"
    :options="options"
    :placeholder="computedPlaceholder"
    :filter-option="false"
    :show-search="true"
    :allow-clear="true"
    :loading="loading"
    :search-value="searchValue"
    class="biz-select w-full"
    @update:value="handleChange"
    @dropdown-visible-change="handleDropdownVisibleChange"
    @search="handleSearch"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </Select>
</template>
