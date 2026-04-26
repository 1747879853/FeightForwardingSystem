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
   * 港口名称的备用字段（仅当下拉中 ediCode 与 portName/cnName 都缺失时，用于补全 `ediCode/名称` 的右侧）
   * 默认 'cnName'，可用值：'cnName' | 'portName' 等
   */
  labelKey?: string;
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
  labelKey: 'cnName',
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  valueKey: 'id',
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
  /** 当前选中港口的英文名称；清空选择时为 `undefined` */
  portName: [portName: string | undefined];
}>();

const modelValue = defineModel<any>();
const selectedItemsRef = toRef(props, 'selectedItems');
const slots = useSlots();
/** 转发到 ApiComponent 的插槽（本组件用内置 #option，故排除） */
const forwardSlotNames = computed(() =>
  Object.keys(slots).filter((n) => n !== 'option'),
);

const mapPortToOption = (port: PortCodeAdminApi.PortCodeDto) => {
  const portAny = port as any;
  const ediCode = (port.ediCode ?? '').toString().trim();

  let nameForPath = (port.portName ?? '').toString().trim();
  if (!nameForPath) {
    nameForPath = (port.cnName ?? '').toString().trim();
  }
  if (!nameForPath) {
    const fromKey = portAny?.[props.labelKey];
    nameForPath = fromKey ? String(fromKey).trim() : '';
  }

  /** 下拉里展示 ediCode/portName；选中后仅展示 ediCode，故 option.label 用 ediCode */
  const dropdownLabel =
    ediCode && nameForPath
      ? `${ediCode}/${nameForPath}`
      : ediCode || nameForPath;
  const label = ediCode || nameForPath;

  const rawPortName = (port.portName ?? '').toString().trim();
  const rawValue = portAny?.[props.valueKey];
  return {
    disabled: port.status === 1,
    dropdownLabel: dropdownLabel || label,
    label,
    /** 供选中后 `portName` 事件使用，不依赖额外请求 */
    portName: rawPortName || undefined,
    value: rawValue === undefined || rawValue === null ? '' : rawValue,
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

const { api, handlePopupScroll, handleSearch, mergeSelectedItems, params } =
  usePagedSelect({
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

const emitPortNameForValue = async (value: any) => {
  const isEmpty =
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0);
  if (isEmpty) {
    emit('portName', undefined);
    return;
  }

  const idRaw = Array.isArray(value) ? value[0] : value;
  const idStr = parseIdToSafeString(idRaw);
  if (idStr === null) {
    emit('portName', undefined);
    return;
  }

  const options = apiComponentRef.value?.getOptions?.() ?? [];
  const fromOpt = options.find(
    (o: { value: unknown; portName?: string }) => String(o.value) === idStr,
  ) as { portName?: string } | undefined;
  if (fromOpt?.portName) {
    emit('portName', fromOpt.portName);
    return;
  }

  for (const item of selectedItemsRef.value) {
    if (String((item as any)[props.valueKey]) === idStr) {
      const pn = (item as PortCodeAdminApi.PortCodeDto).portName;
      if (pn != null && String(pn).trim() !== '') {
        emit('portName', String(pn).trim());
        return;
      }
    }
  }

  try {
    const detail = await getPortCodeDetail(idStr);
    const pn = (detail?.portName ?? '').toString().trim();
    emit('portName', pn || undefined);
  } catch {
    emit('portName', undefined);
  }
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
  void emitPortNameForValue(value);
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
    <!-- eslint-disable-next-line vue/no-v-for-template-key -- 多插槽名需 v-for+#[name] -->
    <template v-for="name in forwardSlotNames" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
    <template #option="opt">
      <span>{{ opt?.dropdownLabel ?? opt?.label }}</span>
    </template>
  </ApiComponent>
</template>
