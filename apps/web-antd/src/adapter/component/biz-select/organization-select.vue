<script lang="ts" setup>
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { computed, ref, toRef, watch } from 'vue';

import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import { getOrganizationUnits } from '#/api/system/organization-unit';

interface Props {
  /** 是否是公司。true=公司，false=部门，不传=全部 */
  isCompany?: boolean;
  /** label 字段名，默认 'displayName'，可用值：'displayName' | 'code' */
  labelKey?: string;
  /** placeholder */
  placeholder?: string;
  /** 已选中的组织对象数组（用于编辑时回显） */
  selectedItems?: SystemOrganizationUnitApi.OrganizationUnitDto[];
  /** value 字段名，默认 'id' */
  valueKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  isCompany: undefined,
  labelKey: 'displayName',
  placeholder: undefined,
  selectedItems: () => [],
  valueKey: 'id',
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const modelValue = defineModel<any>();
const isCompanyRef = toRef(props, 'isCompany');
const selectedItemsRef = toRef(props, 'selectedItems');

const loading = ref(false);
const keyword = ref('');
const list = ref<SystemOrganizationUnitApi.OrganizationUnitDto[]>([]);
const apiComponentRef = ref();

const parseIdToSafeString = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
};

const pickLabel = (item: SystemOrganizationUnitApi.OrganizationUnitDto) => {
  const itemAny = item as any;
  let label = itemAny?.[props.labelKey];
  if (!label && props.labelKey === 'code') {
    label = item.code || item.displayName;
  }
  label = label || item.displayName || item.code || '';

  // 默认展示“名称（编码）”，提升同名组织的区分度
  if (props.labelKey === 'displayName' && item.code) {
    return `${label} (${item.code})`;
  }
  return label;
};

const mergedItems = computed(() => {
  const map = new Map<string, SystemOrganizationUnitApi.OrganizationUnitDto>();
  for (const item of list.value) {
    const id = parseIdToSafeString((item as any)?.[props.valueKey]);
    if (id) map.set(id, item);
  }
  for (const item of selectedItemsRef.value) {
    const id = parseIdToSafeString((item as any)?.[props.valueKey]);
    if (id && !map.has(id)) map.set(id, item);
  }
  return [...map.values()];
});

const options = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  return mergedItems.value
    .filter((item) => {
      if (!kw) return true;
      return (
        (item.displayName || '').toLowerCase().includes(kw) ||
        (item.code || '').toLowerCase().includes(kw)
      );
    })
    .map((item) => {
      const itemAny = item as any;
      const rawValue = itemAny?.[props.valueKey];
      return {
        disabled: false,
        label: pickLabel(item),
        value: rawValue === undefined || rawValue === null ? '' : rawValue,
      };
    });
});

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const loadData = async () => {
  loading.value = true;
  try {
    list.value = await getOrganizationUnits(isCompanyRef.value);
  } finally {
    loading.value = false;
  }
};

const handleChange = (value: any) => {
  modelValue.value = value;
  emit('update:modelValue', value);
};

const handleSearch = (value: string) => {
  keyword.value = value || '';
};

watch(
  isCompanyRef,
  () => {
    keyword.value = '';
    loadData();
  },
  { immediate: true },
);

defineExpose({
  getApiComponentRef: () => apiComponentRef.value,
  getOptions: () => options.value,
  getValue: () => modelValue.value,
  reload: () => loadData(),
});
</script>

<template>
  <Select
    ref="apiComponentRef"
    :value="modelValue"
    :options="options"
    :loading="loading"
    :placeholder="computedPlaceholder"
    :filter-option="false"
    :show-search="true"
    :allow-clear="true"
    class="w-full"
    v-bind="$attrs"
    @update:value="handleChange"
    @search="handleSearch"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </Select>
</template>
