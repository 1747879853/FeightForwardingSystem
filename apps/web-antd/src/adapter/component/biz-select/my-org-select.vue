<script lang="ts" setup>
import { computed, onMounted, useAttrs } from 'vue';

import { $t } from '@vben/locales';

import { objectOmit } from '@vueuse/core';

import { Select } from 'ant-design-vue';

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
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
  autoDefault: true,
});

const modelValue = defineModel<null | number | undefined>();
const attrs = useAttrs();

const options = computed(() =>
  getMyCompanyOptions().map((item) => ({
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

const handleChange = (value: any) => {
  modelValue.value = value ?? null;
};

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
    class="biz-select w-full"
    @update:value="handleChange"
  >
    <template v-for="(_, name) in $slots" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
  </Select>
</template>
