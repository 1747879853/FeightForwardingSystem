<script lang="ts" setup>
import type { DataNode } from 'ant-design-vue/es/tree';

import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, ref } from 'vue';

import { Tree, useVbenModal } from '@vben/common-ui';

import { Checkbox, Input, Spin } from 'ant-design-vue';

import { getAllPermissionsTreeApi } from '#/api/core/auth';
import { getUserPermissions } from '#/api/system/user-admin';
import { $t } from '#/locales';

const userData = ref<SystemUserAdminApi.SystemUser>();
const loading = ref(false);
const permissionTree = ref<DataNode[]>([]);
const grantedPermissions = ref<string[]>([]);
const searchKeyword = ref('');
const onlyGranted = ref(true);

const grantedSet = computed(() => new Set(grantedPermissions.value));

const modalTitle = computed(() => {
  const userName = userData.value?.nickName || userData.value?.userName || '';
  return $t('system.user.viewPermissionsFor', { name: userName });
});

const filteredTree = computed(() => {
  let nodes = permissionTree.value;
  if (onlyGranted.value) {
    nodes = filterGrantedTree(nodes, grantedSet.value);
  }
  return filterPermissionTree(nodes, searchKeyword.value.trim());
});

const treeKey = computed(
  () =>
    `${searchKeyword.value}|${onlyGranted.value}|${grantedPermissions.value.length}`,
);

const treeExpandedLevel = computed(() =>
  searchKeyword.value.trim() || onlyGranted.value ? 99 : 1,
);

function nodeOrDescendantGranted(
  node: DataNode,
  granted: Set<string>,
): boolean {
  const authCode = (node as any).authCode as string | undefined;
  if (authCode && granted.has(authCode)) return true;
  return (node.children as DataNode[] | undefined)?.some((child) =>
    nodeOrDescendantGranted(child, granted),
  );
}

function filterGrantedTree(
  nodes: DataNode[],
  granted: Set<string>,
): DataNode[] {
  const result: DataNode[] = [];
  for (const node of nodes) {
    if (!nodeOrDescendantGranted(node, granted)) continue;
    const children = node.children
      ? filterGrantedTree(node.children as DataNode[], granted)
      : undefined;
    result.push({
      ...node,
      children: children?.length ? children : undefined,
    });
  }
  return result;
}

function filterPermissionTree(nodes: DataNode[], keyword: string): DataNode[] {
  if (!keyword) return nodes;
  const lower = keyword.toLowerCase();
  const result: DataNode[] = [];
  for (const node of nodes) {
    const name = String(node.name ?? '');
    const authCode = String((node as any).authCode ?? '');
    const children = node.children
      ? filterPermissionTree(node.children as DataNode[], keyword)
      : [];
    const selfMatched =
      name.toLowerCase().includes(lower) ||
      authCode.toLowerCase().includes(lower);
    if (selfMatched || children.length > 0) {
      result.push({
        ...node,
        children: children.length > 0 ? children : undefined,
      });
    }
  }
  return result;
}

async function loadData(userId: number | string) {
  loading.value = true;
  try {
    const [tree, perms] = await Promise.all([
      getAllPermissionsTreeApi($t),
      getUserPermissions(userId),
    ]);
    permissionTree.value = tree as unknown as DataNode[];
    grantedPermissions.value = perms || [];
  } finally {
    loading.value = false;
  }
}

const [Modal, modalApi] = useVbenModal({
  showConfirmButton: false,
  cancelText: $t('common.close'),
  class: 'w-[720px]',
  async onOpenChange(isOpen) {
    if (!isOpen) {
      permissionTree.value = [];
      grantedPermissions.value = [];
      searchKeyword.value = '';
      onlyGranted.value = true;
      return;
    }

    const data = modalApi.getData<SystemUserAdminApi.SystemUser>();
    userData.value = data;
    if (data?.id != null) {
      await loadData(data.id);
    }
  },
});
</script>

<template>
  <Modal :title="modalTitle">
    <div class="mb-3 flex flex-wrap items-center gap-3">
      <Input
        v-model:value="searchKeyword"
        :placeholder="$t('system.user.viewPermissionsSearch')"
        allow-clear
        class="w-64"
      />
      <Checkbox v-model:checked="onlyGranted">
        {{ $t('system.user.viewPermissionsOnlyGranted') }}
      </Checkbox>
      <span class="text-sm text-gray-500">
        {{
          $t('system.user.viewPermissionsCount', {
            count: grantedPermissions.length,
          })
        }}
      </span>
    </div>

    <Spin :spinning="loading">
      <div class="max-h-[60vh] overflow-auto rounded border border-border p-3">
        <div
          v-if="!loading && filteredTree.length === 0"
          class="flex h-32 items-center justify-center text-sm text-muted-foreground"
        >
          {{
            grantedPermissions.length === 0
              ? $t('system.user.viewPermissionsEmpty')
              : $t('system.permission.searchNoResult')
          }}
        </div>
        <Tree
          v-else
          :key="treeKey"
          :tree-data="filteredTree"
          :model-value="grantedPermissions"
          multiple
          bordered
          :default-expanded-level="treeExpandedLevel"
          value-field="authCode"
          label-field="name"
          class="pointer-events-none"
        >
          <template #node="{ value }">
            <span>{{ value.name }}</span>
            <span class="ml-2 text-xs text-gray-400">{{ value.authCode }}</span>
          </template>
        </Tree>
      </div>
    </Spin>
  </Modal>
</template>
