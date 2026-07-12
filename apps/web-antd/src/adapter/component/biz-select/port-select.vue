<script lang="ts" setup>
import type { PortCodeAdminApi } from '#/api/system/base-data/port-code-admin';

import { computed, ref, toRef, useSlots, watch } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import {
  getPortCodeDetail,
  getPortCodePagedList,
} from '#/api/system/base-data/port-code-admin';

import { usePagedSelect } from './use-paged-select';

interface Props {
  /**
   * 选中后下拉框展示字段；支持单字段或点路径数组，多字段以 `, ` 拼接。
   * selectedItems 回显时尽量包含数组中的字段（缺字段则跳过，有 id 时会 lazy load 详情补全）。
   */
  labelKey?: string | string[];
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** placeholder */
  placeholder?: string;
  /** 已选中的港口对象数组（用于编辑时回显） */
  selectedItems?: PortCodeAdminApi.PortCodeDto[];
  /** value 字段名，默认 'id' */
  valueKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: () => ['portName', 'country.countryEnName'],
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  valueKey: 'id',
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
  /** change 事件，option 含 `raw`（完整 PortCodeDto） */
  change: [value: any, option: any | any[]];
}>();

const modelValue = defineModel<any>();
const selectedItemsRef = toRef(props, 'selectedItems');
const slots = useSlots();
/** 转发到 ApiComponent 的插槽（本组件用内置 #option，故排除） */
const forwardSlotNames = computed(() =>
  Object.keys(slots).filter((n) => n !== 'option'),
);

const getNestedValue = (obj: unknown, path: string): string => {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return '';
    cur = (cur as Record<string, unknown>)[part];
  }
  return (cur ?? '').toString().trim();
};

const resolveLabelKey = (
  port: PortCodeAdminApi.PortCodeDto,
  labelKey: string | string[],
): string => {
  const keys = Array.isArray(labelKey) ? labelKey : [labelKey];
  const parts = keys
    .map((key) => getNestedValue(port, key))
    .filter((value) => value !== '');
  if (parts.length > 0) return parts.join(', ');

  const portAny = port as Record<string, unknown>;
  return (
    (port.portName ?? '').toString().trim() ||
    (port.cnName ?? '').toString().trim() ||
    (port.ediCode ?? '').toString().trim() ||
    String(portAny.id ?? '')
  );
};

const mapPortToOption = (port: PortCodeAdminApi.PortCodeDto) => {
  const portAny = port as Record<string, unknown>;
  const ediCode = (port.ediCode ?? '').toString().trim();
  const countryEnName = (port.country?.countryEnName ?? '').toString().trim();
  const cnName = (port.cnName ?? '').toString().trim();
  const portName = (port.portName ?? '').toString().trim();
  const rawLabel = ediCode ? `${ediCode}(${portName})` : portName;
  const rawValue = portAny?.[props.valueKey] as number | string | undefined;
  return {
    disabled: port.status === 1,
    /** 第一行：EDI代码/港口名称 */
    line1: `${ediCode}/${portName}`,
    /** 第二行：国家英文名 / 中文名称 */
    line2: `${countryEnName} / ${cnName}`,
    label: resolveLabelKey(port, props.labelKey),
    /** 完整港口 DTO，供业务层 @change 使用 */
    raw: port,
    /** 外部 label 缓存（EDI 简洁格式） */
    rawLabel,
    value:
      rawValue === undefined || rawValue === null
        ? ''
        : (rawValue as number | string),
  };
};

const fetchPageAdapter = async (params: {
  KeyWords?: string;
  PageIndex: number;
  PageSize: number;
}) => {
  const res = await getPortCodePagedList({
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
  mapItemToOption: mapPortToOption,
  pageSize: props.pageSize,
  queryKey: ['port'],
  selectedItemsRef,
  valueKey: props.valueKey,
});

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

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

// 处理 change 事件（转发 value 与含 raw 的 option）
const handleSelectChange = (value: any, option: any | any[]) => {
  emit('change', value, option);
  handleChange(value);
};

const apiComponentRef = ref();

/** 解析为字符串 ID，避免大数精度丢失（JS Number 安全整数上限为 2^53-1） */
const parseIdToSafeString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  if (value === '') return null;
  return String(value);
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
      const detail = await getPortCodeDetail(idStr);
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
      const idStr = parseIdToSafeString(
        (item as Record<string, unknown>)[props.valueKey],
      );
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
    @change="handleSelectChange"
    @dropdown-visible-change="handleDropdownVisibleChange"
    @search="handleSearch"
    @popup-scroll="handlePopupScroll"
    v-bind="$attrs"
    class="biz-select w-full"
  >
    <!-- eslint-disable-next-line vue/no-v-for-template-key -- 多插槽名需 v-for+#[name] -->
    <template v-for="name in forwardSlotNames" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
    <template #option="opt">
      <div class="flex flex-col gap-0.5 py-0.5">
        <span
          class="text-sm font-medium"
          :class="opt?.disabled ? 'text-gray-400' : 'text-gray-900'"
        >
          {{ opt?.line1 }}
        </span>
        <span
          class="text-xs"
          :class="opt?.disabled ? 'text-gray-300' : 'text-gray-500'"
        >
          {{ opt?.line2 }}
        </span>
      </div>
    </template>
  </ApiComponent>
</template>
