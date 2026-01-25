<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, ref, toRef } from 'vue';

import { ApiComponent } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { Select } from 'ant-design-vue';

import { getUserPagedList } from '#/api/system/user-admin';

import { usePagedSelect } from './use-paged-select';

interface Props {
  /** label 字段名，默认 'userName'，可用值：'userName' | 'nickName' */
  labelKey?: string;
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
  labelKey: 'userName',
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  valueKey: 'id',
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const modelValue = defineModel<any>();

// 响应式引用 selectedItems
const selectedItemsRef = toRef(props, 'selectedItems');

// 将用户数据转换为 Option
const mapUserToOption = (user: SystemUserAdminApi.UserListDto) => {
  // 优先使用指定的 labelKey，fallback 到 userName
  let label = (user as any)[props.labelKey];
  if (!label && props.labelKey === 'nickName') {
    label = user.userName;
  }
  label = label || user.userName;

  return {
    disabled: !user.isActive,
    label,
    value: (user as any)[props.valueKey],
  };
};

// 使用分页选择组合式函数
const { api, handlePopupScroll, handleSearch, params } = usePagedSelect({
  fetchPage: getUserPagedList,
  mapItemToOption: mapUserToOption,
  pageSize: props.pageSize,
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
  >
    <template v-for="(_, name) in $slots" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </ApiComponent>
</template>
