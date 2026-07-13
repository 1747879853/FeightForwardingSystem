<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, ref, toRef, watch } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import { getUser, getUserSimplePagedList } from '#/api/system/user-admin';

import { usePagedSelect } from './use-paged-select';
import type { OptionItem } from './use-paged-select';

interface Props {
  /** label 字段名，默认 'nickName'，可用值：'userName' | 'nickName' */
  labelKey?: string;
  /** 选中后展示字段（如下拉与选中展示分离，配合 useRichOptionLabel） */
  optionLabelProp?: string;
  /** 下拉项展示为「用户名 — 昵称」，选中项仍用 optionLabelProp 或 labelKey */
  useRichOptionLabel?: boolean;
  /** 用户属性（位掩码），用于筛选用户 */
  userAttribute?: number;
  /** 每页数量，默认 20 */
  pageSize?: number;
  /** placeholder */
  placeholder?: string;
  /** 已选中的用户对象数组（用于编辑时回显） */
  selectedItems?: SystemUserAdminApi.UserSimpleDto[];
  /** value 字段名，默认 'id' */
  valueKey?: string;
}

const props = withDefaults(defineProps<Props>(), {
  labelKey: 'nickName',
  optionLabelProp: undefined,
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  useRichOptionLabel: false,
  valueKey: 'id',
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const modelValue = defineModel<any>();

// 响应式引用 selectedItems
const selectedItemsRef = toRef(props, 'selectedItems');
const userAttributeRef = toRef(props, 'userAttribute');
// 将用户数据转换为 Option
const mapUserToOption = (user: SystemUserAdminApi.UserSimpleDto) => {
  const nickName = user.nickName?.trim();
  //const userName = user.userName?.trim() || String(user.id);
  let label = nickName;
  const option: OptionItem = {
    // 回显用的 selectedItems 可能只有 id/nickName，缺 isActive 时不应禁用
    //disabled: user.isActive === false,
    label,
    value: (user as any)[props.valueKey],
  };

  if (props.optionLabelProp) {
    option[props.optionLabelProp] = nickName;
  }

  return option;
};

// 适配器函数：将 FetchPageParams 转换为 UserSimplePagedQueryDto
const fetchUserSimplePagedList = async (params: any) => {
  return getUserSimplePagedList({
    keyWords: params.KeyWords,
    userAttribute: params.userAttribute,
    pageIndex: params.PageIndex,
    pageSize: params.PageSize,
  });
};

const extraParamsRef = computed(() => ({
  userAttribute: userAttributeRef.value,
}));

// 使用分页选择组合式函数
const {
  api,
  handleDropdownVisibleChange,
  handlePopupScroll,
  handleSearch,
  mergeSelectedItems,
  params,
  pinSelectedFromOptions,
  searchValue,
} = usePagedSelect({
  extraParamsRef,
  fetchPage: fetchUserSimplePagedList,
  mapItemToOption: mapUserToOption,
  pageSize: props.pageSize,
  queryKey: ['user'],
  selectedItemsRef,
  selectedValuesRef: modelValue,
  valueKey: props.valueKey,
});

// 计算 placeholder
const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const apiComponentRef = ref();
const loadedSelectedIds = ref(new Set<string>());

const parseIdToSafeString = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
};

const handleChange = (value: any) => {
  const options = apiComponentRef.value?.getOptions?.() ?? [];
  pinSelectedFromOptions(value, options);
  modelValue.value = value;
  emit('update:modelValue', value);
};

const ensureSelectedLoaded = async (rawValue: any) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') return;
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  for (const value of values) {
    const idStr = parseIdToSafeString(value);
    if (idStr === null) continue;

    const options = apiComponentRef.value?.getOptions?.() ?? [];
    const hasOption = options.some(
      (option: OptionItem) => String(option.value) === idStr,
    );
    if (hasOption) {
      loadedSelectedIds.value.add(idStr);
      continue;
    }

    if (loadedSelectedIds.value.has(idStr)) continue;

    loadedSelectedIds.value.add(idStr);
    try {
      const detail = await getUser(Number(idStr), { silent: true });
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
    void ensureSelectedLoaded(value);
  },
  { immediate: true },
);

// 暴露方法
defineExpose({
  /** 获取 ApiComponent 实例 */
  getApiComponentRef: () => apiComponentRef.value,
  /** 获取当前 options */
  getOptions: () => apiComponentRef.value?.getOptions?.() || [],
  /** 获取当前值 */
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
    :option-label-prop="optionLabelProp"
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
