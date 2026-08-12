<script lang="ts" setup>
import { computed, onMounted, useAttrs } from 'vue';

import { $t } from '@vben/locales';

import { objectOmit } from '@vueuse/core';

import { Select } from 'ant-design-vue';

import { getMyOrgOptions, getMyDefaultOrgId, getMyOrgCompanyNode } from '#/composables/use-my-org';

defineOptions({ inheritAttrs: false });

interface Props {
  /** placeholder */
  placeholder?: string;
  /** 挂载时若未选值，是否自动填充默认公司，默认 true */
  autoDefault?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
  autoDefault: true,
});

const modelValue = defineModel<null | number | undefined>();
const attrs = useAttrs();

/**
 * 获取我的公司选项。
 * 遍历用户的 organizations，提取每条路径对应的公司节点（第一级 isCompany 或路径首个节点）。
 */
const options = computed(() => {
  const orgOptions = getMyOrgOptions();
  const companyMap = new Map<number, { label: string; value: number }>();

  orgOptions.forEach((orgOption) => {
    // 获取该组织对应的公司节点
    const companyNode = getMyOrgCompanyNode(orgOption.value);
    
    if (companyNode && !companyMap.has(companyNode.id)) {
      // 使用公司节点的 displayName 作为标签
      const label = companyNode.displayName || '';
      companyMap.set(companyNode.id, {
        label,
        value: companyNode.id,
      });
    }
  });

  return Array.from(companyMap.values());
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

/**
 * 获取默认公司 ID。
 * 基于默认组织的公司节点。
 */
const getDefaultCompanyId = (): number | undefined => {
  const defaultOrgId = getMyDefaultOrgId();
  if (!defaultOrgId) return undefined;
  
  const companyNode = getMyOrgCompanyNode(defaultOrgId);
  return companyNode?.id;
};

onMounted(() => {
  if (
    props.autoDefault &&
    (modelValue.value === undefined || modelValue.value === null)
  ) {
    const defaultId = getDefaultCompanyId();
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
