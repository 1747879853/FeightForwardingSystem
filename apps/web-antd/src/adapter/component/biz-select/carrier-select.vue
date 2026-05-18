<script lang="ts" setup>
import type { CarrierAdminApi } from '#/api/system/base-data/carrier-admin';

import { computed, h, ref, toRef, useSlots, watch } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import {
  getCarrierDetail,
  getCarrierPagedList,
} from '#/api/system/base-data/carrier-admin';

import { usePagedSelect } from './use-paged-select';

interface Props {
  /** label 字段名，默认 'cnName'，可用值：'cnName' | 'enName' | 'code' */
  labelKey?: string;
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** placeholder */
  placeholder?: string;
  /** 已选中的船公司对象数组（用于编辑时回显） */
  selectedItems?: CarrierAdminApi.CarrierDto[];
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
const slots = useSlots();
const forwardSlotNames = computed(() =>
  Object.keys(slots).filter((n) => n !== 'option'),
);

const mapCarrierToOption = (carrier: CarrierAdminApi.CarrierDto) => {
  const carrierAny = carrier as any;
  let label = carrierAny?.[props.labelKey];
  if (!label && props.labelKey === 'enName') {
    label = carrier.cnName;
  }
  if (!label && props.labelKey === 'code') {
    label = carrier.code;
  }
  label = label || carrier.cnName || carrier.enName || carrier.code || '';
  const logoUrl = carrier.logo?.url || '';
  const selectedLabelVNode = h(
    'span',
    { class: 'inline-flex items-center gap-1 pl-px' },
    [
      logoUrl
        ? h('img', {
            src: logoUrl,
            alt: label || 'carrier-logo',
            class: 'h-5 w-5 shrink-0 rounded object-contain',
          })
        : null,
      h('span', null, label),
    ],
  );

  const rawValue = carrierAny?.[props.valueKey];
  return {
    disabled: false,
    dropdownLabel: label,
    label: selectedLabelVNode,
    logoUrl,
    rawLabel: label,
    value: rawValue === undefined || rawValue === null ? '' : rawValue,
  };
};

const fetchPageAdapter = async (params: {
  KeyWords?: string;
  PageIndex: number;
  PageSize: number;
}) => {
  const res = await getCarrierPagedList({
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
    mapItemToOption: mapCarrierToOption,
    pageSize: props.pageSize,
    queryKey: ['carrier'],
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
      const detail = await getCarrierDetail(idStr);
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
    class="carrier-select-with-logo w-full"
  >
    <template v-for="name in forwardSlotNames" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
    <template #option="opt">
      <span class="carrier-option inline-flex items-center gap-1 pl-px">
        <img
          v-if="opt?.logoUrl"
          :src="opt.logoUrl"
          :alt="String(opt?.rawLabel || opt?.label || 'carrier-logo')"
          class="h-5 w-5 shrink-0 rounded object-contain"
        />
        <span class="carrier-option-text">{{
          opt?.dropdownLabel ?? opt?.rawLabel ?? opt?.label ?? ''
        }}</span>
      </span>
    </template>
  </ApiComponent>
</template>

<style scoped>
.carrier-option {
  min-height: 24px;
  line-height: 24px;
}

.carrier-option-text {
  line-height: 20px;
}
</style>
