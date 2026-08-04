<script lang="ts" setup>
import type { AirPortApi } from '#/api/system/base-data/air-port-admin';

import { computed, ref, toRef, useSlots, watch } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import {
  getAirPortDetail,
  getAirPortPagedList,
} from '#/api/system/base-data/air-port-admin';

import { usePagedSelect } from './use-paged-select';

interface Props {
  /** 国家 id 精确筛选，传入后仅返回该国家的机场（未选国家的机场不会出现） */
  countryId?: number | string;
  /**
   * 选中后输入框展示字段；支持单字段、点路径数组（多字段以 `, ` 拼接），
   * 或特殊值 `'iataEnName'`（`三字码/英文名称`，默认）
   */
  labelKey?: string | string[];
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** placeholder */
  placeholder?: string;
  /** 已选中的机场对象数组（用于编辑时回显） */
  selectedItems?: AirPortApi.AirPortSelectDto[];
  /** value 字段名，默认 'id' */
  valueKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  countryId: undefined,
  labelKey: 'iataEnName',
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  valueKey: 'id',
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
  /** change 事件，option 含 `raw`（完整 AirPortSelectDto） */
  change: [value: any, option: any | any[]];
}>();

const modelValue = defineModel<any>();
const selectedItemsRef = toRef(props, 'selectedItems');
const slots = useSlots();
/** 转发到 ApiComponent 的插槽（本组件用内置 #option，故排除） */
const forwardSlotNames = computed(() =>
  Object.keys(slots).filter((name) => name !== 'option'),
);

const getNestedValue = (obj: unknown, path: string): string => {
  const parts = path.split('.');
  let cur: unknown = obj;
  for (const part of parts) {
    if (cur === null || typeof cur !== 'object') return '';
    cur = (cur as Record<string, unknown>)[part];
  }
  return (cur ?? '').toString().trim();
};

/**
 * 选中回显文案。
 * - `'iataEnName'`：`三字码/英文名称`（如 PVG/Shanghai Pudong International Airport）
 * - 普通字段 / 字段数组：按字段取值，多字段以 `, ` 拼接
 */
const resolveLabel = (
  airPort: AirPortApi.AirPortSelectDto,
  labelKey: string | string[],
): string => {
  const iataCode = (airPort.iataCode ?? '').toString().trim();
  const enName = (airPort.enName ?? '').toString().trim();
  const cnName = (airPort.cnName ?? '').toString().trim();
  const fallback = iataCode || enName || cnName || String(airPort.id ?? '');

  if (labelKey === 'iataEnName') {
    return iataCode && enName ? `${iataCode}/${enName}` : fallback;
  }

  const keys = Array.isArray(labelKey) ? labelKey : [labelKey];
  const parts = keys
    .map((key) => getNestedValue(airPort, key))
    .filter((value) => value !== '');
  return parts.length > 0 ? parts.join(', ') : fallback;
};

const mapAirPortToOption = (airPort: AirPortApi.AirPortSelectDto) => {
  const airPortAny = airPort as unknown as Record<string, unknown>;
  const iataCode = (airPort.iataCode ?? '').toString().trim();
  const enName = (airPort.enName ?? '').toString().trim();
  const cnName = (airPort.cnName ?? '').toString().trim();
  const countryEnName = (airPort.country?.countryEnName ?? '')
    .toString()
    .trim();
  const city = (airPort.city ?? '').toString().trim();
  const rawValue = airPortAny?.[props.valueKey] as number | string | undefined;

  return {
    disabled: airPort.status === 1,
    /** 第一行：三字码/英文名称 */
    line1: iataCode && enName ? `${iataCode}/${enName}` : iataCode || enName,
    /** 第二行：国家英文名 / 城市 / 中文名称 */
    line2: [countryEnName, city, cnName].filter(Boolean).join(' / '),
    label: resolveLabel(airPort, props.labelKey),
    /** 完整机场 DTO，供业务层 @change 使用 */
    raw: airPort,
    value:
      rawValue === undefined || rawValue === null
        ? ''
        : (rawValue as number | string),
  };
};

/** countryId 变化时需重置分页并重新请求 */
const extraParamsRef = computed(() => {
  const extra: Record<string, any> = {};
  if (props.countryId !== undefined && props.countryId !== '') {
    extra.CountryId = props.countryId;
  }
  return extra;
});

const fetchPageAdapter = async (params: {
  CountryId?: number | string;
  KeyWords?: string;
  PageIndex: number;
  PageSize: number;
}) => {
  const res = await getAirPortPagedList({
    CountryId: params.CountryId,
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
  extraParamsRef,
  fetchPage: fetchPageAdapter,
  mapItemToOption: mapAirPortToOption,
  pageSize: props.pageSize,
  queryKey: ['air-port'],
  selectedItemsRef,
  valueKey: props.valueKey,
});

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const apiComponentRef = ref();

/** 解析为字符串 ID，避免大数精度丢失（JS Number 安全整数上限为 2^53-1） */
const parseIdToSafeString = (value: unknown): null | string => {
  if (value === undefined || value === null) return null;
  if (value === '') return null;
  return String(value);
};

const loadedSelectedIds = ref(new Set<string>());

const handleChange = (value: any) => {
  const values = Array.isArray(value) ? value : [value];
  for (const item of values) {
    const idStr = parseIdToSafeString(item);
    if (idStr !== null) {
      loadedSelectedIds.value.add(idStr);
    }
  }
  modelValue.value = value;
  emit('update:modelValue', value);
};

const handleSelectChange = (value: any, option: any | any[]) => {
  emit('change', value, option);
  handleChange(value);
};

/**
 * 业务端列表按关键字分页返回，已选机场可能不在当前页，
 * 回显时按 id 走管理端详情接口（仅需登录）补全 option
 */
const ensureSelectedLoaded = async (rawValue: any) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') return;
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  for (const item of values) {
    const idStr = parseIdToSafeString(item);
    if (idStr === null) continue;
    if (loadedSelectedIds.value.has(idStr)) continue;

    loadedSelectedIds.value.add(idStr);
    try {
      const detail = await getAirPortDetail(idStr);
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
      const idStr = parseIdToSafeString(
        (item as unknown as Record<string, unknown>)[props.valueKey],
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
