<script lang="ts" setup>
import { computed, onMounted, toRef, useAttrs, watch } from 'vue';

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
  /** userId 变化后，若已选值不在新用户组织范围内是否清空，默认 true */
  clearOnUserChange?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  userId: undefined,
  placeholder: undefined,
  autoDefault: true,
  clearOnUserChange: true,
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

const options = computed(() =>
  getUserOrgOptions(userIdRef.value).map((item) => ({
    label: item.label,
    value: item.value,
  })),
);

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const bindProps = computed(() =>
  objectOmit(attrs, ['value', 'onUpdate:value']),
);

const applyDefault = () => {
  if (!props.autoDefault) return;
  if (userIdRef.value === undefined || userIdRef.value === null) return;
  if (modelValue.value !== undefined && modelValue.value !== null) return;
  const defaultId = getUserDefaultOrgId(userIdRef.value);
  if (defaultId !== undefined) {
    modelValue.value = defaultId;
  }
};

const handleChange = (value: any) => {
  modelValue.value = value ?? null;
};

watch(userIdRef, async () => {
  await loadAllUserOrganizations();
  // 已选值不在新用户组织范围内时清空，避免脏数据
  if (
    props.clearOnUserChange &&
    modelValue.value !== undefined &&
    modelValue.value !== null &&
    !options.value.some((o) => o.value === modelValue.value)
  ) {
    modelValue.value = null;
  }
  applyDefault();
});

onMounted(async () => {
  await loadAllUserOrganizations();
  applyDefault();
});
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
