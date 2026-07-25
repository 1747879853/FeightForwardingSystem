<script lang="ts" setup>
import { computed, toRef, useAttrs, watch } from 'vue';

import { $t } from '@vben/locales';

import { objectOmit } from '@vueuse/core';

import { Select } from 'ant-design-vue';

import type { MyUserOrganizationPathDto } from '#/api/core/user';
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { useAllUserOrg } from '#/composables/use-all-user-org';

defineOptions({ inheritAttrs: false });

interface Props {
  /** 目标用户id（如所选销售），据此取其所属公司范围 */
  userId?: null | number;
  /** placeholder */
  placeholder?: string;
  /** userId 变化或挂载后，若未选值是否自动填充该用户默认公司，默认 true */
  autoDefault?: boolean;
  /** 从「另一个用户」切换过来时是否清空已选值（首次赋值/回显不清空），默认 true */
  clearOnUserChange?: boolean;
  /**
   * 回显兜底选项：value=公司节点id，label=完整公司名。
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

const { allUserOrgMap, loadAllUserOrganizations, loading } = useAllUserOrg();

/** 读取某用户的组织路径列表（未加载或不存在时返回空数组） */
function getUserOrganizations(
  userId?: null | number,
): MyUserOrganizationPathDto[] {
  if (userId === undefined || userId === null) return [];
  return allUserOrgMap.value.get(userId) ?? [];
}

/** 取一条组织路径中的「公司节点」（路径首端） */
function pickCompanyNode(
  path: SystemOrganizationUnitApi.OrganizationUnitDto[] | undefined,
): SystemOrganizationUnitApi.OrganizationUnitDto | undefined {
  if (!path || path.length === 0) return undefined;
  return path[0];
}

/**
 * 将组织路径拼接为「完整公司名」：父级 → 末级用 / 连接。
 * 兼容 displayName（GetAll/GetMy）与 name（详情 orgs）两种节点结构。
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

/**
 * 某用户的「公司」下拉选项（value = 公司节点 id）。
 * 用于业务录入按所选公司取其所属范围。
 */
function getUserCompanyOptions(userId?: null | number): Array<{
  isDefault: boolean;
  label: string;
  value: number;
}> {
  const orgs = getUserOrganizations(userId);
  const map = new Map<
    number,
    { isDefault: boolean; label: string; value: number }
  >();

  for (const item of orgs) {
    const node = pickCompanyNode(item.oneOrganizationPath);
    if (!node) continue;

    // 如果已存在相同公司id，保留第一个作为默认（如果它是默认组织）
    if (!map.has(node.id)) {
      map.set(node.id, {
        isDefault: !!item.default,
        label:
          formatOrgPathLabel(item.oneOrganizationPath) ||
          node.displayName ||
          '',
        value: node.id,
      });
    } else if (item.default) {
      // 如果当前是默认组织，更新为默认
      const existing = map.get(node.id)!;
      map.set(node.id, { ...existing, isDefault: true });
    }
  }

  return [...map.values()];
}

/** 某用户的默认公司 id，用于表单默认值 */
function getUserDefaultCompanyId(userId?: null | number): number | undefined {
  const orgs = getUserOrganizations(userId);
  const target =
    orgs.find((o: MyUserOrganizationPathDto) => o.default) ?? orgs[0];
  return pickCompanyNode(target?.oneOrganizationPath)?.id;
}

const options = computed(() => {
  const map = new Map<number, { label: string; value: number }>();
  for (const item of getUserCompanyOptions(userIdRef.value)) {
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

const applyDefault = () => {
  if (!props.autoDefault) return;
  if (userIdRef.value === undefined || userIdRef.value === null) return;
  if (modelValue.value !== undefined && modelValue.value !== null) return;
  const defaultId = getUserDefaultCompanyId(userIdRef.value);
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
    // 仅在「从另一个用户切换过来」时清空；首次赋值（新建选人/编辑回显）不清空
    const switchedFromAnotherUser =
      oldId !== undefined && oldId !== null && newId !== oldId;
    if (
      props.clearOnUserChange &&
      switchedFromAnotherUser &&
      modelValue.value !== undefined &&
      modelValue.value !== null
    ) {
      modelValue.value = null;
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
