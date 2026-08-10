<script lang="ts" setup>
import { computed, toRef, useAttrs, watch } from 'vue';

import { $t } from '@vben/locales';

import { objectOmit } from '@vueuse/core';

import { Select } from 'ant-design-vue';

import { useAllUserOrg } from '#/composables/use-all-user-org';

defineOptions({ inheritAttrs: false });

interface Props {
  /** 目标用户id（如所选销售），据此取其所属组织范围 */
  userId?: null | number;
  /** placeholder */
  placeholder?: string;
  /** userId 变化或挂载后，若未选值是否自动填充该用户默认组织，默认 true */
  autoDefault?: boolean;
  /** 从「另一个用户」切换过来时是否清空已选值（首次赋值/回显不清空），默认 true */
  clearOnUserChange?: boolean;
  /**
   * 回显兜底选项：value=末级组织id，label=完整公司名。
   * 用于编辑回显（如详情 orgs 路径），在该用户组织加载完成前也能正确显示已选项。
   */
  selectedItems?: Array<{ label: string; value: number }>;
}

const props = withDefaults(defineProps<Props>(), {
  userId: undefined,
  placeholder: undefined,
  autoDefault: true,
  clearOnUserChange: true,
  selectedItems: () => [],
});

const modelValue = defineModel<null | number | undefined>();
const attrs = useAttrs();
const userIdRef = toRef(props, 'userId');

const {
  getUserDefaultOrgId,
  getUserOrgOptions,
  loadAllUserOrganizations,
  loading,
} = useAllUserOrg();

const options = computed(() => {
  const map = new Map<number, { label: string; value: number }>();
  for (const item of getUserOrgOptions(userIdRef.value)) {
    map.set(item.value, { label: item.label, value: item.value });
  }
  // 回显兜底：仅补入当前已选值对应的选项，避免残留历史条目
  for (const item of props.selectedItems) {
    if (item.value === modelValue.value && !map.has(item.value)) {
      map.set(item.value, { label: item.label, value: item.value });
    }
  }
  return [...map.values()];
});

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const bindProps = computed(() =>
  objectOmit(attrs, ['value', 'onUpdate:value']),
);

const resolveDefaultOrgId = (userId?: null | number) => {
  if (!props.autoDefault) return undefined;
  if (userId === undefined || userId === null) return undefined;
  return getUserDefaultOrgId(userId);
};

const applyDefault = () => {
  if (modelValue.value !== undefined && modelValue.value !== null) return;
  const defaultId = resolveDefaultOrgId(userIdRef.value);
  if (defaultId !== undefined) {
    modelValue.value = defaultId;
  }
};

const handleChange = (value: any) => {
  modelValue.value = value ?? null;
};

watch(
  userIdRef,
  async (newId, oldId) => {
    await loadAllUserOrganizations();
    // 仅在「从另一个用户切换过来」时重置；首次赋值（新建选人/编辑回显）保留已选
    const switchedFromAnotherUser =
      oldId !== undefined && oldId !== null && newId !== oldId;
    if (props.clearOnUserChange && switchedFromAnotherUser) {
      // 一次写入最终值：有默认组织则直接带出，否则清空。
      // 禁止先 emit null 再 emit 默认值，避免父级两次异步 setFieldValue 乱序把表单 orgId 写空。
      const defaultId = resolveDefaultOrgId(newId);
      modelValue.value = defaultId ?? null;
      return;
    }
    applyDefault();
  },
  { immediate: true },
);
</script>

<template>
  <Select
    v-bind="bindProps"
    :value="modelValue ?? undefined"
    :options="options"
    :loading="loading"
    :placeholder="computedPlaceholder"
    :filter-option="true"
    option-filter-prop="label"
    :show-search="true"
    :allow-clear="true"
    class="biz-select w-full"
    @update:value="handleChange"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </Select>
</template>
