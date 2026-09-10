<script lang="ts" setup>
import { computed, onMounted, ref, useAttrs, watch } from 'vue';

import { $t } from '@vben/locales';

import { objectOmit } from '@vueuse/core';

import { Select } from 'ant-design-vue';

import { resolveOrganizationCompany } from '#/api/system/organization-unit';
import {
  getMyDefaultOrgId,
  getMyCompanyOptions,
} from '#/composables/use-my-org';

defineOptions({ inheritAttrs: false });

interface Props {
  /** placeholder */
  placeholder?: string;
  /** 挂载时若未选值，是否自动填充默认组织，默认 true */
  autoDefault?: boolean;
  /**
   * 回显兜底：value 必须是部门/直属组织 id，label 为所属公司名。
   * 只用于关闭态显示，不进入本人下拉候选，提交值仍是该部门 id。
   */
  selectedItems?: Array<{ label: string; value: number | string }>;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
  autoDefault: true,
  selectedItems: () => [],
});

const modelValue = defineModel<null | number | string | undefined>();
const attrs = useAttrs();

const myOptions = computed(() =>
  getMyCompanyOptions().map((item) => ({
    label: item.label,
    value: item.value,
  })),
);

const extraOption = ref<{
  class: string;
  disabled: boolean;
  label: string;
  value: number | string;
} | null>(null);

function sameId(
  left?: null | number | string,
  right?: null | number | string,
): boolean {
  if (left === undefined || left === null || left === '') return false;
  if (right === undefined || right === null || right === '') return false;
  return String(left) === String(right);
}

const options = computed(() => {
  const list = [...myOptions.value];
  const extra = extraOption.value;
  if (extra && !list.some((item) => sameId(item.value, extra.value))) {
    // 仅补关闭态 label：value 仍是原部门 id，不出现在本人下拉里
    list.unshift(extra);
  }
  return list;
});

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const bindProps = computed(() =>
  objectOmit(attrs, ['value', 'onUpdate:value']),
);

const handleChange = (value: any) => {
  modelValue.value = value ?? null;
};

async function ensureEchoOption(orgId?: null | number | string) {
  if (orgId === undefined || orgId === null || orgId === '') {
    extraOption.value = null;
    return;
  }
  if (myOptions.value.some((item) => sameId(item.value, orgId))) {
    extraOption.value = null;
    return;
  }
  const fromProps = props.selectedItems.find((item) =>
    sameId(item.value, orgId),
  );
  const label = fromProps?.label?.trim();
  if (label) {
    extraOption.value = {
      class: 'my-org-select-echo-option',
      disabled: true,
      label,
      value: orgId,
    };
    return;
  }
  const company = await resolveOrganizationCompany(orgId);
  if (!sameId(modelValue.value, orgId)) return;
  extraOption.value = {
    class: 'my-org-select-echo-option',
    disabled: true,
    label: company?.displayName?.trim() || String(orgId),
    value: orgId,
  };
}

watch(
  () => [modelValue.value, props.selectedItems] as const,
  ([orgId]) => {
    void ensureEchoOption(orgId);
  },
  { immediate: true, deep: true },
);

onMounted(() => {
  if (
    props.autoDefault &&
    (modelValue.value === undefined || modelValue.value === null)
  ) {
    const defaultId = getMyDefaultOrgId();
    if (defaultId !== undefined) {
      modelValue.value = defaultId;
    }
  }
});
</script>

<template>
  <Select
    v-bind="bindProps"
    :value="modelValue ?? undefined"
    :options="options"
    :placeholder="computedPlaceholder"
    :filter-option="true"
    option-filter-prop="label"
    :show-search="true"
    :allow-clear="true"
    popup-class-name="my-org-select-popup"
    class="biz-select w-full"
    @update:value="handleChange"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </Select>
</template>

<style>
/* 回显项只用于关闭态显示公司名，不出现在本人组织下拉里 */
.my-org-select-popup .my-org-select-echo-option {
  display: none !important;
}
</style>
