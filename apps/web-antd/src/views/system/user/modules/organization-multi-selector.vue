<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api/system/user-admin';
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';

import { computed, ref } from 'vue';

import { Tree, Radio, Button, Tag, message } from 'ant-design-vue';
import { $t } from '#/locales';

interface Props {
  modelValue: SystemUserAdminApi.UpdateUserOrganizationPathDto[];
  treeData: SystemOrganizationUnitApi.OrganizationUnitTreeDto[];
}

interface Emits {
  (
    e: 'update:modelValue',
    value: SystemUserAdminApi.UpdateUserOrganizationPathDto[],
  ): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 展开的节点keys
const expandedKeys = ref<number[]>([]);
// 选中的组织IDs（用于Tree的checkedKeys）
const checkedKeys = ref<number[]>([]);

// 初始化：从modelValue中提取选中的组织ID
const initCheckedKeys = () => {
  checkedKeys.value = props.modelValue.map((org) => org.id);
};

// 监听外部值变化
const updateFromModelValue = () => {
  initCheckedKeys();
};

// 处理树节点选中变化
const handleCheck = (checked: any, info: any) => {
  const newCheckedKeys = Array.isArray(checked) ? checked : checked.checked;
  checkedKeys.value = newCheckedKeys;

  // 构建新的organizations数组
  const newOrganizations: SystemUserAdminApi.UpdateUserOrganizationPathDto[] =
    newCheckedKeys.map((id: number) => {
      // 检查该组织是否已经是默认组织
      const existing = props.modelValue.find((org) => org.id === id);
      return {
        id,
        default: existing?.default || false,
      };
    });

  emit('update:modelValue', newOrganizations);
};

// 设置默认组织
const setDefaultOrganization = (orgId: number) => {
  const updated = props.modelValue.map((org) => ({
    ...org,
    default: org.id === orgId,
  }));
  emit('update:modelValue', updated);
};

// 移除组织
const removeOrganization = (orgId: number) => {
  const updated = props.modelValue.filter((org) => org.id !== orgId);
  checkedKeys.value = updated.map((org) => org.id);
  emit('update:modelValue', updated);
};

// 获取组织名称（从树数据中查找）
const getOrgName = (orgId: number): string => {
  const findNode = (
    nodes: SystemOrganizationUnitApi.OrganizationUnitTreeDto[],
    id: number,
  ): SystemOrganizationUnitApi.OrganizationUnitTreeDto | null => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNode(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  const node = findNode(props.treeData, orgId);
  return node?.displayName || `ID:${orgId}`;
};

// 初始化
initCheckedKeys();
</script>

<template>
  <div class="organization-multi-selector">
    <!-- 已选组织列表 -->
    <div v-if="modelValue.length > 0" class="mb-3">
      <div class="mb-2 text-sm text-gray-600">
        {{ $t('system.user.selectedOrganizations') }}
      </div>
      <div class="flex flex-wrap gap-2">
        <Tag
          v-for="org in modelValue"
          :key="org.id"
          closable
          :color="org.default ? 'blue' : 'default'"
          @close="removeOrganization(org.id)"
        >
          <span class="mr-1">{{ getOrgName(org.id) }}</span>
          <Radio
            v-if="!org.default"
            :checked="false"
            size="small"
            @click.stop="setDefaultOrganization(org.id)"
          >
            {{ $t('system.user.setDefault') }}
          </Radio>
          <span v-else class="text-xs text-blue-600">{{
            $t('system.user.isDefault')
          }}</span>
        </Tag>
      </div>
    </div>

    <!-- 组织树选择器 -->
    <div class="rounded border p-3">
      <Tree
        v-model:expanded-keys="expandedKeys"
        :tree-data="treeData"
        :field-names="{
          title: 'displayName',
          key: 'id',
          children: 'children',
        }"
        checkable
        :checked-keys="checkedKeys"
        block-node
        @check="handleCheck"
      />
    </div>

    <!-- 提示信息 -->
    <div class="mt-2 text-xs text-gray-500">
      {{ $t('system.user.organizationSelectorTip') }}
    </div>
  </div>
</template>

<style scoped>
.organization-multi-selector {
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
}
</style>
