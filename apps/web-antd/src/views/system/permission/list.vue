<script lang="ts" setup>
import type { DataNode } from 'ant-design-vue/es/tree';

import { computed, ref, watch } from 'vue';

import { Page, Tree } from '@vben/common-ui';

import {
  Alert,
  Card,
  Col,
  message,
  Radio,
  RadioGroup,
  Row,
  Select,
  Spin,
  TabPane,
  Tabs,
  Button,
} from 'ant-design-vue';

import { getAllPermissionsTreeApi } from '#/api/core/auth';
import {
  getRolePermissions,
  getUserPermissions,
  updateRolePermissions,
  updateUserPermissions,
} from '#/api/system/permission';
import { getRoleList } from '#/api/system/role';
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

// ==================== 计算属性 ====================

const currentTargetId = computed(() => {
  return targetType.value === 'role'
    ? selectedRoleId.value
    : selectedUserId.value;
});

const hasTarget = computed(() => {
  return currentTargetId.value !== undefined;
});

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

/** 加载用户列表 - 简化版，实际项目中应调用用户列表API */
async function loadUsers() {
  loadingOptions.value = true;
  try {
    // TODO: 调用实际的用户列表API
    // 这里暂时使用模拟数据，实际项目中需要替换
    userOptions.value = [];
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
    checkedPermissions.value = perms || [];
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
}

/** 角色/用户选择改变 */
function handleTargetChange() {
  if (activeTab.value === 'module') {
    loadCheckedPermissions();
  }
}

/** 权限选择改变 */
function handlePermissionsChange(keys: string[]) {
  checkedPermissions.value = keys;
}

/** 保存模块权限 */
async function handleSaveModulePermissions() {
  if (!currentTargetId.value) return;

  savingPermissions.value = true;
  try {
    if (targetType.value === 'role') {
      await updateRolePermissions({
        roleId: currentTargetId.value,
        permissionNames: checkedPermissions.value,
      });
    } else {
      await updateUserPermissions({
        userId: currentTargetId.value,
        permissionNames: checkedPermissions.value,
      });
    }
    message.success($t('system.permission.permissionSaved'));
  } finally {
    savingPermissions.value = false;
  }
}

/** Tab切换 */
function handleTabChange(key: string) {
  activeTab.value = key;
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
              <div class="mb-4 text-gray-500">
                {{ $t('system.permission.modulePermissionDesc') }}
                <Button
                  class="float-right"
                  type="primary"
                  :loading="savingPermissions"
                  @click="handleSaveModulePermissions"
                >
                  {{ $t('common.save') }}
                </Button>
              </div>
              <Spin :spinning="loadingPermissions">
                <div class="permission-tree-container">
                  <Tree
                    :tree-data="permissions"
                    :model-value="checkedPermissions"
                    multiple
                    bordered
                    :default-expanded-level="2"
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
