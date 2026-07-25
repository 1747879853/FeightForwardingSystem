<script lang="ts" setup>
import { computed, onMounted, ref, toRef, useAttrs } from 'vue';

import { $t } from '@vben/locales';

import { objectOmit } from '@vueuse/core';

import { Select } from 'ant-design-vue';

import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { getOrganizationUnits } from '#/api/system/organization-unit';

defineOptions({ inheritAttrs: false });

interface Props {
  /** placeholder */
  placeholder?: string;
  /**
   * 回显兜底选项：value=公司节点id，label=完整公司名。
   * 用于编辑回显（如详情 orgs 路径），在数据加载完成前也能正确显示已选项。
   */
  selectedItems?: Array<{ label: string; value: number }>;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
  selectedItems: () => [],
});

const modelValue = defineModel<null | number | undefined>();
const attrs = useAttrs();

const loading = ref(false);
const companyList = ref<SystemOrganizationUnitApi.OrganizationUnitDto[]>([]);

/**
 * 加载公司列表数据
 */
const loadCompanies = async () => {
  loading.value = true;
  try {
    const data = await getOrganizationUnits({ isCompany: true });
    console.log('公司列表数据:', data);
    companyList.value = data || [];
  } catch (error) {
    console.error('加载公司列表失败:', error);
    companyList.value = [];
  } finally {
    loading.value = false;
  }
};

/**
 * 将组织名称拼接为「完整公司名」：父级 → 末级用 / 连接。
 * 兼容 displayName 与 name 两种节点结构。
 */
function formatOrgPathLabel(
  path:
    | Array<{ displayName?: null | string; name?: null | string }>
    | null
    | undefined,
): string {
  if (!path?.length) return '';
  return path
    .map((node) => (node.displayName ?? node.name ?? '').trim())
    .filter(Boolean)
    .join('/');
}

const options = computed(() => {
  const map = new Map<number, { label: string; value: number }>();

  // 从 API 获取的公司列表构建选项
  for (const company of companyList.value) {
    if (!map.has(company.id)) {
      map.set(company.id, {
        label: company.displayName || '',
        value: company.id,
      });
    }
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

const handleChange = (value: any) => {
  modelValue.value = value ?? null;
};

// 组件挂载时加载公司列表
onMounted(async () => {
  await loadCompanies();
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
