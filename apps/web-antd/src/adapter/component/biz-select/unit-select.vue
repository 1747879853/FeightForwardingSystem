<script lang="ts" setup>
import type { CtnCodeAdminApi } from '#/api/system/base-data/ctn-code-admin';

import { computed, ref, toRef, watch } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

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
  /** 自定义单位选项列表（如果提供，则使用此列表而非API数据） */
  unitOptions?: Array<{ label: string; value: string }>;
  /** value 字段名，默认 'id' */
  valueKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'ctnName',
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  unitOptions: undefined,
  valueKey: 'id',
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const modelValue = defineModel<any>();
const selectedItemsRef = toRef(props, 'selectedItems');

/** 默认的固定单位选项 */
const DEFAULT_UNIT_OPTIONS = [
  { label: '毛重', value: 'KGS' },
  { label: '尺码', value: 'measurement' },
  { label: '件数', value: 'piece' },
  { label: 'TEU', value: 'teu' },
  { label: '票', value: 'order' },
];

const mapCtnToOption = (ctn: CtnCodeAdminApi.CtnCodeDto) => {
  console.log('mapCtnToOption', ctn);
  const ctnAny = ctn as any;
  let label = ctnAny?.[props.labelKey];
  if (!label && props.labelKey === 'ctnSize') {
    label = ctn.ctnName;
  }
  if (!label && props.labelKey === 'ctnType') {
    label = ctn.ctnName;
  }
  label = label || ctn.ctnName || ctn.ctnSize || ctn.ctnType || '';
  //console.log('mapCtnToOption', { ctn, label });
  const rawValue = ctnAny?.[props.valueKey];
  return {
    disabled: ctn.status === 1,
    label,
    value: label,
  };
};

const fetchPageAdapter = async (params: {
  KeyWords?: string;
  PageIndex: number;
  PageSize: number;
}) => {
  // 将固定选项转换为与API返回数据相同的格式
  const defaultOptionsAsItems = DEFAULT_UNIT_OPTIONS.map((opt) => ({
    id: opt.value,
    ctnName: opt.label,
    status: 0, // 启用状态
  })) as unknown as CtnCodeAdminApi.CtnCodeDto[];

  // 如果提供了自定义单位选项（即使是空数组），则使用：固定选项 + 自定义箱型
  if (props.unitOptions !== undefined) {
    const customOptionsAsItems = props.unitOptions.map((opt) => ({
      id: opt.value,
      ctnName: opt.label,
      status: 0, // 启用状态
    })) as unknown as CtnCodeAdminApi.CtnCodeDto[];

    // ✅ 固定选项 + 自定义箱型列表
    return {
      items: [...defaultOptionsAsItems, ...customOptionsAsItems],
      total: defaultOptionsAsItems.length + customOptionsAsItems.length,
    };
  }

  console.log(
    '⚠️ [UnitSelect.fetchPageAdapter] 未提供 unitOptions，只显示固定选项',
  );

  // 未提供 unitOptions 时，只显示固定选项
  console.log(
    '⚠️ [UnitSelect.fetchPageAdapter] defaultOptionsAsItems:',
    defaultOptionsAsItems,
  );

  return {
    items: defaultOptionsAsItems,
    total: defaultOptionsAsItems.length,
  };
};

const {
  api,
  handleDropdownVisibleChange,
  handlePopupScroll,
  handleSearch,
  mergeSelectedItems,
  params,
  reset,
  searchValue,
} = usePagedSelect({
  fetchPage: fetchPageAdapter,
  mapItemToOption: mapCtnToOption,
  pageSize: props.pageSize,
  // queryKey: ['ctn'],
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
    // try {
    //   const detail = await getCtnCodeDetail(idStr);
    //   mergeSelectedItems([detail]);
    // } catch {
    //   loadedSelectedIds.value.delete(idStr);
    // }
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

// ✅ 监听 unitOptions 变化，清空缓存并触发重新加载
watch(
  () => props.unitOptions,
  (newOptions, oldOptions) => {
    // 重置状态，清空缓存，触发 ApiComponent 重新请求
    reset();
    console.log('✅ [UnitSelect] 已调用 reset()，触发重新加载');
  },
  { deep: true },
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
    class="w-full"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </ApiComponent>
</template>
