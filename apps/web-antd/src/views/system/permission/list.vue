<script lang="ts" setup>
import type { DataNode } from 'ant-design-vue/es/tree';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Page, Tree } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  message,
  Radio,
  RadioGroup,
  Row,
  Select,
  Spin,
  TabPane,
  Tabs,
} from 'ant-design-vue';

import { getAllPermissionsTreeApi } from '#/api/core/auth';
import {
  getRolePermissions,
  getUserPermissions,
} from '#/api/system/permission';
import { updateRolePermissions } from '#/api/system/role';
import { updateUserPermissions } from '#/api/system/user-admin';
import { getRoleList } from '#/api/system/role';
import { getUserPagedList } from '#/api/system/user-admin';
import { $t } from '#/locales';

import DataPermissionPanel from './modules/data-permission.vue';
import PropPermissionPanel from './modules/prop-permission.vue';
import TablePermissionPanel from './modules/table-permission.vue';

// ==================== 类型定义 ====================

type TargetType = 'role' | 'user';

interface RoleOption {
  label: string;
  value: number;
}

interface UserOption {
  label: string;
  value: number;
}

// ==================== 响应式状态 ====================

const route = useRoute();
const targetType = ref<TargetType>('role');
const selectedRoleId = ref<number>();
const selectedUserId = ref<number>();

const roleOptions = ref<RoleOption[]>([]);
const userOptions = ref<UserOption[]>([]);
const loadingOptions = ref(false);

const activeTab = ref('module');

// 模块权限相关
const permissions = ref<DataNode[]>([]);
const loadingPermissions = ref(false);
const checkedPermissions = ref<string[]>([]);
const savingPermissions = ref(false);
const permissionSearchKeyword = ref('');
/** 权限码 -> 父级权限码（来自后端 parentName） */
const permissionParentMap = ref<Map<string, string>>(new Map());

// ==================== 计算属性 ====================

const currentTargetId = computed(() => {
  return targetType.value === 'role'
    ? selectedRoleId.value
    : selectedUserId.value;
});

const hasTarget = computed(() => {
  return currentTargetId.value !== undefined;
});

const filteredPermissions = computed(() =>
  filterPermissionTree(permissions.value, permissionSearchKeyword.value),
);

const moduleTreeKey = computed(() =>
  permissionSearchKeyword.value.trim()
    ? `search-${permissionSearchKeyword.value}`
    : 'all',
);

const moduleTreeExpandedLevel = computed(() =>
  permissionSearchKeyword.value.trim() ? 99 : 2,
);

const hasPermissionSearchKeyword = computed(() =>
  Boolean(permissionSearchKeyword.value.trim()),
);

/** 搜索时仅向 Tree 传递可见节点的勾选，避免 Tree 回写剔除隐藏 key 引发递归更新 */
const treeCheckedPermissions = computed(() => {
  if (!hasPermissionSearchKeyword.value) {
    return checkedPermissions.value;
  }
  const visibleKeys = new Set(collectPermissionKeys(filteredPermissions.value));
  return checkedPermissions.value.filter((key) => visibleKeys.has(key));
});

// ==================== 权限树搜索 ====================

function matchesPermissionKeyword(node: DataNode, keyword: string): boolean {
  const name = String(node.name ?? '').toLowerCase();
  const authCode = String(node.authCode ?? node.id ?? '').toLowerCase();
  return name.includes(keyword) || authCode.includes(keyword);
}

function filterPermissionTree(nodes: DataNode[], keyword: string): DataNode[] {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return nodes;
  }

  const result: DataNode[] = [];
  for (const node of nodes) {
    const children = node.children
      ? filterPermissionTree(node.children as DataNode[], keyword)
      : [];
    const selfMatch = matchesPermissionKeyword(node, normalizedKeyword);

    if (selfMatch || children.length > 0) {
      result.push({
        ...node,
        children: selfMatch
          ? (node.children as DataNode[] | undefined)
          : children.length > 0
            ? children
            : undefined,
      });
    }
  }
  return result;
}

function clearPermissionSearch() {
  permissionSearchKeyword.value = '';
}

function collectPermissionKeys(nodes: DataNode[]): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    const authCode = String(node.authCode ?? node.id ?? '');
    if (authCode) {
      keys.push(authCode);
    }
    if (node.children) {
      keys.push(...collectPermissionKeys(node.children as DataNode[]));
    }
  }
  return keys;
}

function buildPermissionParentMap(nodes: DataNode[]): Map<string, string> {
  const map = new Map<string, string>();
  const walk = (list: DataNode[]) => {
    for (const node of list) {
      const authCode = String(node.authCode ?? node.id ?? '');
      const pid = String(node.pid ?? '');
      if (authCode && pid && pid !== '0') {
        map.set(authCode, pid);
      }
      if (node.children) {
        walk(node.children as DataNode[]);
      }
    }
  };
  walk(nodes);
  return map;
}

/** 勾选子权限时自动补齐全部祖先权限 */
function expandWithAncestorPermissions(keys: string[]): string[] {
  const expanded = new Set(keys);
  const parentMap = permissionParentMap.value;
  for (const key of keys) {
    let current = key;
    while (parentMap.has(current)) {
      const parent = parentMap.get(current)!;
      expanded.add(parent);
      current = parent;
    }
  }
  return [...expanded];
}

// ==================== 数据加载方法 ====================

/** 加载角色列表 */
async function loadRoles() {
  loadingOptions.value = true;
  try {
    const res = await getRoleList({ page: 1, pageSize: 1000 });
    roleOptions.value = (res.items || []).map((item: any) => ({
      label: item.displayName || item.name,
      value: item.id,
    }));
  } finally {
    loadingOptions.value = false;
  }
}

/** 加载用户列表 */
async function loadUsers(keyword?: string) {
  loadingOptions.value = true;
  try {
    const res = await getUserPagedList({
      KeyWords: keyword,
      pageIndex: 1,
      pageSize: 1000,
    });
    userOptions.value = (res.items || []).map((item: any) => ({
      label: `${item.nickName || item.userName}(${item.id})`,
      value: item.id,
    }));
  } finally {
    loadingOptions.value = false;
  }
}

/** 加载权限树 */
async function loadPermissions() {
  loadingPermissions.value = true;
  try {
    const res = await getAllPermissionsTreeApi($t);
    permissions.value = res as unknown as DataNode[];
    permissionParentMap.value = buildPermissionParentMap(permissions.value);
    if (checkedPermissions.value.length > 0) {
      checkedPermissions.value = expandWithAncestorPermissions(
        checkedPermissions.value,
      );
    }
  } finally {
    loadingPermissions.value = false;
  }
}

/** 加载已选中的权限 */
async function loadCheckedPermissions() {
  if (!currentTargetId.value) {
    checkedPermissions.value = [];
    return;
  }

  loadingPermissions.value = true;
  try {
    let perms: string[];
    if (targetType.value === 'role') {
      perms = await getRolePermissions(currentTargetId.value);
    } else {
      perms = await getUserPermissions(currentTargetId.value);
    }
    checkedPermissions.value = expandWithAncestorPermissions(perms || []);
  } finally {
    loadingPermissions.value = false;
  }
}

// ==================== 事件处理方法 ====================

/** 目标类型改变 */
function handleTargetTypeChange() {
  selectedRoleId.value = undefined;
  selectedUserId.value = undefined;
  checkedPermissions.value = [];
  clearPermissionSearch();
}

/** 角色/用户选择改变 */
function handleTargetChange() {
  clearPermissionSearch();
  if (activeTab.value === 'module') {
    loadCheckedPermissions();
  }
}

/** 权限选择改变（搜索过滤时合并不可见节点的已选权限，避免被 Tree 覆盖丢失） */
function handlePermissionsChange(keys: string[]) {
  const expandedKeys = expandWithAncestorPermissions(keys);

  if (!hasPermissionSearchKeyword.value) {
    checkedPermissions.value = expandedKeys;
    return;
  }

  const visibleKeys = new Set(collectPermissionKeys(filteredPermissions.value));
  const hiddenChecked = checkedPermissions.value.filter(
    (key) => !visibleKeys.has(key),
  );
  const merged = expandWithAncestorPermissions([
    ...new Set([...hiddenChecked, ...expandedKeys]),
  ]);
  if (
    merged.length === checkedPermissions.value.length &&
    merged.every((key) => checkedPermissions.value.includes(key))
  ) {
    return;
  }
  checkedPermissions.value = merged;
}

/** 保存模块权限 */
async function handleSaveModulePermissions() {
  if (!currentTargetId.value) return;

  savingPermissions.value = true;
  try {
    if (targetType.value === 'role') {
      await updateRolePermissions(
        currentTargetId.value,
        expandWithAncestorPermissions(checkedPermissions.value),
      );
    } else {
      await updateUserPermissions({
        userId: currentTargetId.value,
        permissionNames: expandWithAncestorPermissions(
          checkedPermissions.value,
        ),
      });
    }
    message.success($t('system.permission.permissionSaved'));
  } finally {
    savingPermissions.value = false;
  }
}

/** Tab切换 */
function handleTabChange(key: string | number) {
  activeTab.value = String(key);
  clearPermissionSearch();
  if (key === 'module' && hasTarget.value) {
    loadCheckedPermissions();
  }
}

// ==================== 初始化 ====================

// 监听目标类型变化，加载对应的选项列表
watch(
  targetType,
  (newType) => {
    if (newType === 'role') {
      loadRoles();
    } else {
      loadUsers();
    }
  },
  { immediate: true },
);

// 初始化加载权限树
loadPermissions();

// 处理路由参数（从用户管理页面跳转过来时）
onMounted(() => {
  const query = route.query;
  if (query.targetType === 'user') {
    targetType.value = 'user';
    if (query.userId) {
      selectedUserId.value = Number(query.userId);
    }
    if (query.tab) {
      activeTab.value = query.tab as string;
    }
    // 加载用户列表后，触发权限加载
    loadUsers().then(() => {
      if (selectedUserId.value) {
        loadCheckedPermissions();
      }
    });
  } else if (query.targetType === 'role') {
    targetType.value = 'role';
    if (query.roleId) {
      selectedRoleId.value = Number(query.roleId);
    }
    if (query.tab) {
      activeTab.value = query.tab as string;
    }
    loadRoles().then(() => {
      if (selectedRoleId.value) {
        loadCheckedPermissions();
      }
    });
  }
});
</script>

<template>
  <Page auto-content-height>
    <div class="flex h-full flex-col gap-4">
      <!-- 头部：选择配置对象 -->
      <Card size="small">
        <Row :gutter="16" align="middle">
          <Col :span="4">
            <span class="font-medium"
              >{{ $t('system.permission.targetType') }}:</span
            >
          </Col>
          <Col :span="6">
            <RadioGroup
              v-model:value="targetType"
              button-style="solid"
              @change="handleTargetTypeChange"
            >
              <Radio value="role">{{
                $t('system.permission.targetTypeRole')
              }}</Radio>
              <Radio value="user">{{
                $t('system.permission.targetTypeUser')
              }}</Radio>
            </RadioGroup>
          </Col>
          <Col :span="4">
            <span class="font-medium">
              {{
                targetType === 'role'
                  ? $t('system.permission.selectRole')
                  : $t('system.permission.selectUser')
              }}:
            </span>
          </Col>
          <Col :span="10">
            <Select
              v-if="targetType === 'role'"
              v-model:value="selectedRoleId"
              :loading="loadingOptions"
              :options="roleOptions"
              :placeholder="$t('system.permission.selectRole')"
              allow-clear
              show-search
              option-filter-prop="label"
              style="width: 100%"
              @change="handleTargetChange"
            />
            <Select
              v-else
              v-model:value="selectedUserId"
              :loading="loadingOptions"
              :options="userOptions"
              :placeholder="$t('system.permission.selectUser')"
              allow-clear
              show-search
              option-filter-prop="label"
              style="width: 100%"
              @change="handleTargetChange"
            />
          </Col>
        </Row>
      </Card>

      <!-- 内容区：权限配置Tabs -->
      <Card class="flex-1" :body-style="{ height: '100%', padding: '12px' }">
        <template v-if="!hasTarget">
          <div class="flex h-full items-center justify-center">
            <Alert
              :message="$t('system.permission.noPermissionConfig')"
              type="info"
              show-icon
            />
          </div>
        </template>
        <template v-else>
          <Tabs
            v-model:activeKey="activeTab"
            @change="handleTabChange"
            class="permission-tabs h-full"
          >
            <!-- 模块权限Tab -->
            <TabPane
              key="module"
              :tab="$t('system.permission.modulePermission')"
            >
              <div class="mb-4 flex items-center justify-between gap-4">
                <Input
                  v-model:value="permissionSearchKeyword"
                  :placeholder="$t('system.permission.searchPlaceholder')"
                  allow-clear
                  class="w-80"
                />
                <Button
                  type="primary"
                  :loading="savingPermissions"
                  @click="handleSaveModulePermissions"
                >
                  {{ $t('common.save') }}
                </Button>
              </div>
              <Spin :spinning="loadingPermissions">
                <div class="permission-tree-container">
                  <div
                    v-if="
                      hasPermissionSearchKeyword &&
                      filteredPermissions.length === 0
                    "
                    class="flex h-32 items-center justify-center text-sm text-muted-foreground"
                  >
                    {{ $t('system.permission.searchNoResult') }}
                  </div>
                  <Tree
                    v-else
                    :key="moduleTreeKey"
                    :tree-data="filteredPermissions"
                    :model-value="treeCheckedPermissions"
                    multiple
                    bordered
                    :default-expanded-level="moduleTreeExpandedLevel"
                    value-field="authCode"
                    label-field="name"
                    @update:model-value="handlePermissionsChange"
                  >
                    <template #node="{ value }">
                      {{ value.name }}
                    </template>
                  </Tree>
                </div>
              </Spin>
            </TabPane>

            <!-- 数据权限Tab -->
            <TabPane key="data" :tab="$t('system.permission.dataPermission')">
              <div class="mb-2 text-gray-500">
                {{ $t('system.permission.dataPermissionDesc') }}
              </div>
              <DataPermissionPanel
                :target-type="targetType"
                :role-id="targetType === 'role' ? selectedRoleId : undefined"
                :user-id="targetType === 'user' ? selectedUserId : undefined"
              />
            </TabPane>

            <!-- 表级权限Tab -->
            <TabPane key="table" :tab="$t('system.permission.tablePermission')">
              <div class="mb-2 text-gray-500">
                {{ $t('system.permission.tablePermissionDesc') }}
              </div>
              <TablePermissionPanel
                :target-type="targetType"
                :role-id="targetType === 'role' ? selectedRoleId : undefined"
                :user-id="targetType === 'user' ? selectedUserId : undefined"
              />
            </TabPane>

            <!-- 字段权限Tab -->
            <TabPane key="prop" :tab="$t('system.permission.propPermission')">
              <div class="mb-2 text-gray-500">
                {{ $t('system.permission.propPermissionDesc') }}
              </div>
              <PropPermissionPanel
                :target-type="targetType"
                :role-id="targetType === 'role' ? selectedRoleId : undefined"
                :user-id="targetType === 'user' ? selectedUserId : undefined"
              />
            </TabPane>
          </Tabs>
        </template>
      </Card>
    </div>
  </Page>
</template>

<style lang="less" scoped>
.permission-tabs {
  :deep(.ant-tabs-content) {
    height: calc(100% - 46px);
  }
  :deep(.ant-tabs-tabpane) {
    height: 100%;
    overflow: auto;
  }
}

.permission-tree-container {
  max-height: calc(100vh - 400px);
  overflow: auto;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  padding: 8px;
}
</style>
