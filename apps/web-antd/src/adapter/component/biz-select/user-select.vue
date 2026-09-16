<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api/system/user-admin';
import type { OptionItem } from './use-paged-select';

import { computed, toRef, useAttrs, useSlots, watch } from 'vue';

import { $t } from '@vben/locales';

import { objectOmit } from '@vueuse/core';

import { Select } from 'ant-design-vue';

import { getUserListByIds } from '#/api/system/user-admin';

import { userSimpleListCache } from './cache/user-simple-cache';
import { useCachedSelect } from './use-cached-select';

defineOptions({ inheritAttrs: false });

interface Props {
  /** label 字段名，缺昵称/用户名时的回退字段，默认 'nickName' */
  labelKey?: string;
  /** 选中后展示字段；不传则用「昵称（用户名）」 */
  optionLabelProp?: string;
  /**
   * 兼容旧调用。下拉项现已固定为港口式两行（用户名/昵称 + 英文名），
   * 该开关不再改变展示。
   */
  useRichOptionLabel?: boolean;
  /** 用户属性（位掩码），用于筛选用户 */
  userAttribute?: number;
  /**
   * 按公司过滤候选（与 UserSimpleDto.companyIds 求交）。
   * 不传则不过滤公司。已选人始终 pin，不受过滤影响。
   */
  companyIds?: Array<number | string>;
  /** 兼容旧调用，全量缓存后不再分页 */
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
  useRichOptionLabel: false,
  pageSize: 20,
  placeholder: undefined,
  selectedItems: () => [],
  companyIds: undefined,
  valueKey: 'id',
});

const emit = defineEmits<{
  'update:modelValue': [value: any];
}>();

const attrs = useAttrs();
const slots = useSlots();
const modelValue = defineModel<any>();

const selectedItemsRef = toRef(props, 'selectedItems');
const userAttributeRef = toRef(props, 'userAttribute');
const companyIdsRef = toRef(props, 'companyIds');

const bindProps = computed(() =>
  objectOmit(attrs, ['value', 'onUpdate:value', 'onUpdate:modelValue']),
);

const forwardSlotNames = computed(() =>
  Object.keys(slots).filter((name) => name !== 'option'),
);

function trimText(value: unknown): string {
  return String(value ?? '').trim();
}

/** 选中回显：昵称（用户名）；缺一项则只显示另一项 */
function formatUserSelectedLabel(nickName: string, userName: string): string {
  return nickName || userName;
}

const mapUserToOption = (user: SystemUserAdminApi.UserSimpleDto) => {
  const nickName = trimText(user.nickName);
  const userName = trimText(user.userName);
  const enName = trimText(user.enName);
  const selectedLabel =
    formatUserSelectedLabel(nickName, userName) ||
    trimText((user as Record<string, unknown>)[props.labelKey]);

  const line1 =
    userName && nickName && userName !== nickName
      ? `${userName} / ${nickName}`
      : userName || nickName || selectedLabel;

  const option: OptionItem = {
    enName,
    label: selectedLabel,
    line1,
    line2: enName,
    nickName,
    userName,
    value: (user as Record<string, unknown>)[props.valueKey] as number | string,
  };

  if (props.optionLabelProp && props.optionLabelProp !== 'label') {
    option[props.optionLabelProp] =
      trimText((user as Record<string, unknown>)[props.optionLabelProp]) ||
      selectedLabel;
  }

  return option;
};

const matchesUserAttribute = (user: SystemUserAdminApi.UserSimpleDto) => {
  const mask = userAttributeRef.value;
  if (mask == null || mask === 0) return true;
  const attr = user.userAttribute;
  if (attr == null) return true;
  return (Number(attr) & mask) === mask;
};

const matchesCompany = (user: SystemUserAdminApi.UserSimpleDto) => {
  const filterIds = companyIdsRef.value;
  if (!filterIds?.length) return true;
  const userCompanyIds = user.companyIds;
  if (!userCompanyIds?.length) return false;
  const filterSet = new Set(filterIds.map(String));
  return userCompanyIds.some((id) => filterSet.has(String(id)));
};

const matchesKeyword = (
  user: SystemUserAdminApi.UserSimpleDto,
  query: string,
) => {
  const haystacks = [user.userName, user.nickName, user.enName];
  return haystacks.some((text) =>
    String(text ?? '')
      .toLowerCase()
      .includes(query),
  );
};

const {
  handleDropdownVisibleChange,
  handleSearch,
  loading,
  mergeSelectedItems,
  options,
  pinSelectedFromOptions,
  searchValue,
  findCachedOption,
} = useCachedSelect({
  cache: userSimpleListCache,
  mapItemToOption: mapUserToOption,
  matchesItem: (user) => matchesUserAttribute(user) && matchesCompany(user),
  matchesKeyword,
  selectedItemsRef,
  selectedValuesRef: modelValue,
});

const computedPlaceholder = computed(
  () => props.placeholder || $t('ui.placeholder.select'),
);

const loadedSelectedIds = new Set<string>();

const parseIdToSafeString = (value: unknown): string | null => {
  if (value === undefined || value === null || value === '') return null;
  return String(value);
};

const handleChange = (value: any) => {
  pinSelectedFromOptions(value, options.value);
  modelValue.value = value;
  emit('update:modelValue', value);
};

const toSimpleFromCacheOrDetail = (
  idStr: string,
  detail?: { id?: number | string; nickName?: string; userName?: string },
): SystemUserAdminApi.UserSimpleDto | undefined => {
  const cached = userSimpleListCache.findById(idStr);
  if (cached) return cached;
  if (!detail?.nickName && !detail?.userName) return undefined;
  return {
    id: detail.id as number,
    nickName: (detail.nickName ?? '').trim(),
    userName: detail.userName?.trim(),
  };
};

const ensureSelectedLoaded = async (rawValue: any) => {
  if (rawValue === undefined || rawValue === null || rawValue === '') return;
  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  for (const value of values) {
    const idStr = parseIdToSafeString(value);
    if (idStr === null) continue;

    if (options.value.some((option) => String(option.value) === idStr)) {
      loadedSelectedIds.add(idStr);
      continue;
    }
    if (findCachedOption(idStr)) {
      const cached = userSimpleListCache.findById(idStr);
      if (cached) mergeSelectedItems([cached]);
      loadedSelectedIds.add(idStr);
      continue;
    }
    if (loadedSelectedIds.has(idStr)) continue;

    loadedSelectedIds.add(idStr);
    try {
      const cached = userSimpleListCache.findById(idStr);
      if (cached) {
        mergeSelectedItems([cached]);
        continue;
      }
      const [detail] = await getUserListByIds([value as number], {
        silent: true,
      });
      const simple = toSimpleFromCacheOrDetail(idStr, detail);
      if (simple) mergeSelectedItems([simple]);
    } catch {
      loadedSelectedIds.delete(idStr);
    }
  }
};

watch(
  selectedItemsRef,
  (list) => {
    for (const item of list) {
      const idStr = parseIdToSafeString((item as any)[props.valueKey]);
      if (idStr !== null) loadedSelectedIds.add(idStr);
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

watch(
  () => userSimpleListCache.items.value,
  () => {
    void ensureSelectedLoaded(modelValue.value);
  },
);

defineExpose({
  getApiComponentRef: () => undefined,
  getOptions: () => options.value,
  getValue: () => modelValue.value,
});
</script>

<template>
  <Select
    v-bind="bindProps"
    :value="modelValue"
    :options="options"
    :placeholder="computedPlaceholder"
    :option-label-prop="optionLabelProp || 'label'"
    :filter-option="false"
    :show-search="true"
    :allow-clear="true"
    :loading="loading"
    :search-value="searchValue"
    class="biz-select w-full"
    @update:value="handleChange"
    @dropdown-visible-change="handleDropdownVisibleChange"
    @search="handleSearch"
  >
    <!-- eslint-disable-next-line vue/no-v-for-template-key -- 多插槽名需 v-for+#[name] -->
    <template v-for="name in forwardSlotNames" :key="name" #[name]="slotData">
      <slot :name="name" v-bind="slotData || {}"></slot>
    </template>
    <template #option="opt">
      <div class="flex flex-col gap-0.5 py-0.5">
        <span
          class="text-sm font-medium"
          :class="opt?.disabled ? 'text-gray-400' : 'text-gray-900'"
        >
          {{ opt?.line1 }}
        </span>
        <span
          v-if="opt?.line2"
          class="text-xs"
          :class="opt?.disabled ? 'text-gray-300' : 'text-gray-500'"
        >
          {{ opt?.line2 }}
        </span>
      </div>
    </template>
  </Select>
</template>
