<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, ref, toRef } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import { getUserPagedList } from '#/api/system/user-admin';

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
  selectedItems?: SystemUserAdminApi.UserListDto[];
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
const mapUserToOption = (user: SystemUserAdminApi.UserListDto) => {
  const nickName = user.nickName?.trim() || user.userName;
  const userName = user.userName?.trim() || String(user.id);

  let label = (user as any)[props.labelKey];
  if (!label && props.labelKey === 'nickName') {
    label = user.userName;
  }
  label = label || user.userName;

  if (props.useRichOptionLabel) {
    label = `${userName} — ${nickName}`;
  }

  const option: OptionItem = {
    // 回显用的 selectedItems 可能只有 id/nickName，缺 isActive 时不应禁用
    disabled: user.isActive === false,
    label,
    value: (user as any)[props.valueKey],
  };

  if (props.optionLabelProp) {
    option[props.optionLabelProp] = nickName;
  }

  return option;
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
  params,
  searchValue,
} = usePagedSelect({
  extraParamsRef,
  fetchPage: getUserPagedList,
  mapItemToOption: mapUserToOption,
  pageSize: props.pageSize,
  queryKey: ['user'],
  selectedItemsRef,
  valueKey: props.valueKey,
});

// 计算 placeholder
const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

// 处理值变化
const handleChange = (value: any) => {
  modelValue.value = value;
  emit('update:modelValue', value);
};

// ApiComponent ref
const apiComponentRef = ref();

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
    class="w-full"
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </ApiComponent>
</template>
