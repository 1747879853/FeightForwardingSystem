<script lang="ts" setup>
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { computed, ref, useAttrs, watch } from 'vue';

import { $t } from '@vben/locales';

import { objectOmit } from '@vueuse/core';

import { Select } from 'ant-design-vue';

import { getMyPermissionCompanies } from '#/api/system/organization-unit';
import {
  getMyDefaultOrgId,
  getMyOrgCompanyNode,
} from '#/composables/use-my-org';

defineOptions({ inheritAttrs: false });

interface Props {
  /** placeholder */
  placeholder?: string;
  /**
   * 数据权限模块。传了按该模块的规则算公司；不传只看通用规则。
   * 0 是海运出口，不能当成「未传」。
   */
  module?: null | number;
  /** 挂载后若未选值，且默认公司在权限范围内，则自动选中 */
  autoDefault?: boolean;
  /**
   * 回显兜底：value 为公司 id，label 为公司名称。
   * 已选公司不在当前权限列表里时仍能显示名称。
   */
  selectedItems?: Array<{ label: string; value: number | string }>;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: undefined,
  module: undefined,
  autoDefault: false,
  selectedItems: () => [],
});

const modelValue = defineModel<null | number | string | undefined>();
const attrs = useAttrs();

const loading = ref(false);
const companyList = ref<SystemOrganizationUnitApi.OrganizationUnitSimpleDto[]>(
  [],
);

const sameId = (left: unknown, right: unknown) =>
  left !== undefined &&
  left !== null &&
  left !== '' &&
  String(left) === String(right);

const loadCompanies = async () => {
  loading.value = true;
  try {
    const data = await getMyPermissionCompanies(props.module);
    companyList.value = data || [];
    applyAutoDefault();
  } catch (error) {
    console.error('加载数据权限公司列表失败:', error);
    companyList.value = [];
  } finally {
    loading.value = false;
  }
};

const options = computed(() => {
  const map = new Map<string, { label: string; value: number | string }>();

  for (const company of companyList.value) {
    const key = String(company.id);
    if (!map.has(key)) {
      map.set(key, {
        label: company.name || key,
        value: company.id,
      });
    }
  }

  for (const item of props.selectedItems) {
    if (sameId(item.value, modelValue.value) && !map.has(String(item.value))) {
      map.set(String(item.value), {
        label: item.label,
        value: item.value,
      });
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

function applyAutoDefault() {
  if (!props.autoDefault) return;
  if (
    modelValue.value !== undefined &&
    modelValue.value !== null &&
    modelValue.value !== ''
  ) {
    return;
  }
  const defaultOrgId = getMyDefaultOrgId();
  const companyId = defaultOrgId
    ? getMyOrgCompanyNode(defaultOrgId)?.id
    : undefined;
  if (companyId == null) return;
  const hit = companyList.value.find((item) => sameId(item.id, companyId));
  if (hit) {
    modelValue.value = hit.id;
  }
}

watch(
  () => props.module,
  () => {
    void loadCompanies();
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
