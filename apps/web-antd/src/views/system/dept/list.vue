<script lang="ts" setup>
import type { SystemOrganizationUnitApi } from '#/api/system/organization-unit';
import type {
  OrganizationUnitUserListDto,
  PagingListOfOrganizationUnitUserListDto,
} from '#/api/system/organization-unit';

import { computed, ref, watch } from 'vue';

import { Page, useVbenModal } from '@vben/common-ui';
import { Plus } from '@vben/icons';

import {
  Button,
  Card,
  Dropdown,
  Empty,
  Input,
  Menu,
  MenuItem,
  message,
  Popconfirm,
  Table,
  Tag,
  Tree,
} from 'ant-design-vue';

import {
  deleteOrganizationUnit,
  getOrganizationUnitTree,
  getOrganizationUnitUsers,
  removeUserFromOrganizationUnit,
} from '#/api/system/organization-unit';
import { $t } from '#/locales';

import Form from './modules/form.vue';
import AddMemberModal from './modules/add-member-modal.vue';

// ========== 组织树相关 ==========
const treeData = ref<SystemOrganizationUnitApi.OrganizationUnitTreeDto[]>([]);
const treeLoading = ref(false);
const selectedKeys = ref<number[]>([]);
const expandedKeys = ref<number[]>([]);
const searchValue = ref('');

const selectedOrg = computed(() => {
  if (selectedKeys.value.length === 0) return null;
  return findNodeById(treeData.value, selectedKeys.value[0]!);
});

function findNodeById(
  nodes: SystemOrganizationUnitApi.OrganizationUnitTreeDto[],
  id: number,
): SystemOrganizationUnitApi.OrganizationUnitTreeDto | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

function collectAllKeys(
  nodes: SystemOrganizationUnitApi.OrganizationUnitTreeDto[],
): number[] {
  const keys: number[] = [];
  for (const node of nodes) {
    keys.push(node.id);
    if (node.children) {
      keys.push(...collectAllKeys(node.children));
    }
  }
  return keys;
}

async function loadTree() {
  treeLoading.value = true;
  try {
    treeData.value = await getOrganizationUnitTree();
    if (expandedKeys.value.length === 0) {
      expandedKeys.value = collectAllKeys(treeData.value);
    }
  } finally {
    treeLoading.value = false;
  }
}

function onTreeSelect(keys: number[]) {
  selectedKeys.value = keys;
}

// ========== 组织表单弹窗 ==========
const [FormModal, formModalApi] = useVbenModal({
  connectedComponent: Form,
  destroyOnClose: true,
});

function onCreateOrg() {
  formModalApi.setData(null).open();
}

function onEditOrg(node: SystemOrganizationUnitApi.OrganizationUnitTreeDto) {
  formModalApi.setData(node).open();
}

function onAppendOrg(node: SystemOrganizationUnitApi.OrganizationUnitTreeDto) {
  formModalApi.setData({ parentId: node.id }).open();
}

async function onDeleteOrg(
  node: SystemOrganizationUnitApi.OrganizationUnitTreeDto,
) {
  const hideLoading = message.loading({
    content: $t('ui.actionMessage.deleting', [node.displayName]),
    duration: 0,
    key: 'action_process_msg',
  });
  try {
    await deleteOrganizationUnit(node.id);
    message.success({
      content: $t('ui.actionMessage.deleteSuccess', [node.displayName]),
      key: 'action_process_msg',
    });
    if (selectedKeys.value[0] === node.id) {
      selectedKeys.value = [];
    }
    await loadTree();
  } catch {
    hideLoading();
  }
}

function onFormSuccess() {
  loadTree();
}

// ========== 右侧用户列表 ==========
const userLoading = ref(false);
const userList = ref<OrganizationUnitUserListDto[]>([]);
const userPagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});

const userColumns = computed(() => [
  {
    dataIndex: 'userName',
    title: $t('system.dept.userName'),
    width: 120,
  },
  {
    dataIndex: 'nickName',
    title: $t('system.dept.nickName'),
    width: 120,
  },
  {
    dataIndex: 'phoneNumber',
    title: $t('system.dept.phoneNumber'),
    width: 140,
  },
  {
    dataIndex: 'isBoss',
    title: $t('system.dept.isBoss'),
    width: 80,
    key: 'isBoss',
  },
  {
    dataIndex: 'addedTime',
    title: $t('system.dept.addedTime'),
    width: 170,
  },
  {
    title: $t('system.dept.operation'),
    key: 'action',
    width: 100,
    fixed: 'right' as const,
  },
]);

async function loadUsers(page = 1, pageSize = 10) {
  const orgId = selectedKeys.value[0];
  if (!orgId) {
    userList.value = [];
    userPagination.value.total = 0;
    return;
  }
  userLoading.value = true;
  try {
    const res: PagingListOfOrganizationUnitUserListDto =
      await getOrganizationUnitUsers({
        OrganizationUnitId: orgId,
        PageIndex: page,
        PageSize: pageSize,
      });
    userList.value = res.items || [];
    userPagination.value = {
      current: page,
      pageSize,
      total: res.totalCount || 0,
    };
  } finally {
    userLoading.value = false;
  }
}

function onTableChange(pagination: { current: number; pageSize: number }) {
  loadUsers(pagination.current, pagination.pageSize);
}

async function onRemoveUser(record: OrganizationUnitUserListDto) {
  const orgId = selectedKeys.value[0];
  if (!orgId) return;
  try {
    await removeUserFromOrganizationUnit({
      UserId: record.id,
      OrganizationUnitId: orgId,
    });
    message.success($t('system.dept.removeSuccess'));
    loadUsers(userPagination.value.current, userPagination.value.pageSize);
    loadTree();
  } catch {
    // error handled by request interceptor
  }
}

watch(selectedKeys, () => {
  loadUsers();
});

// ========== 添加成员弹窗 ==========
const [AddMemberModalComponent, addMemberModalApi] = useVbenModal({
  connectedComponent: AddMemberModal,
  destroyOnClose: true,
});

function onAddMember() {
  const orgId = selectedKeys.value[0];
  if (!orgId) {
    message.warning($t('system.dept.selectOrgFirst'));
    return;
  }
  addMemberModalApi.setData({ organizationUnitId: orgId }).open();
}

function onAddMemberSuccess() {
  loadUsers(userPagination.value.current, userPagination.value.pageSize);
  loadTree();
}

// 初始化
loadTree();
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onFormSuccess" />
    <AddMemberModalComponent @success="onAddMemberSuccess" />

    <div class="flex h-full gap-4">
      <!-- 左侧组织树 -->
      <Card
        class="w-[300px] shrink-0 overflow-auto"
        :title="$t('system.dept.orgTree')"
        size="small"
      >
        <template #extra>
          <Button type="link" size="small" @click="onCreateOrg">
            <Plus class="size-4" />
          </Button>
        </template>

        <Input.Search
          v-model:value="searchValue"
          :placeholder="$t('system.dept.deptName')"
          class="mb-2"
          allow-clear
          size="small"
        />

        <Tree
          v-if="treeData.length > 0"
          v-model:expanded-keys="expandedKeys"
          :selected-keys="selectedKeys"
          :tree-data="treeData"
          :field-names="{
            title: 'displayName',
            key: 'id',
            children: 'children',
          }"
          block-node
          :loading="treeLoading"
          @select="onTreeSelect"
        >
          <template #title="node">
            <Dropdown :trigger="['contextmenu']">
              <span class="tree-node-title">
                {{ node.displayName }}
                <span
                  v-if="node.memberCount != null"
                  class="ml-1 text-xs text-gray-400"
                >
                  ({{ node.memberCount }})
                </span>
              </span>
              <template #overlay>
                <Menu>
                  <MenuItem key="append" @click="onAppendOrg(node)">
                    {{ $t('system.dept.addChild') }}
                  </MenuItem>
                  <MenuItem key="edit" @click="onEditOrg(node)">
                    {{ $t('common.edit') }}
                  </MenuItem>
                  <MenuItem
                    key="delete"
                    :disabled="!!(node.children && node.children.length > 0)"
                    @click="onDeleteOrg(node)"
                  >
                    {{ $t('common.delete') }}
                  </MenuItem>
                </Menu>
              </template>
            </Dropdown>
          </template>
        </Tree>

        <Empty v-else :description="$t('system.dept.list')" />
      </Card>

      <!-- 右侧用户列表 -->
      <Card
        class="min-w-0 flex-1"
        size="small"
        :title="
          selectedOrg
            ? `${selectedOrg.displayName} - ${$t('system.dept.memberList')}`
            : $t('system.dept.memberList')
        "
      >
        <template #extra>
          <Button
            type="primary"
            size="small"
            :disabled="!selectedOrg"
            @click="onAddMember"
          >
            <Plus class="size-4" />
            {{ $t('system.dept.addMember') }}
          </Button>
        </template>

        <template v-if="selectedOrg">
          <Table
            :columns="userColumns"
            :data-source="userList"
            :loading="userLoading"
            :pagination="{
              current: userPagination.current,
              pageSize: userPagination.pageSize,
              total: userPagination.total,
              showSizeChanger: true,
              showTotal: (total) => `${total} 条`,
            }"
            row-key="id"
            size="small"
            :scroll="{ x: 700 }"
            @change="onTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'isBoss'">
                <Tag v-if="record.isBoss" color="blue">
                  {{ $t('system.dept.isBoss') }}
                </Tag>
              </template>
              <template v-if="column.key === 'action'">
                <Popconfirm
                  :title="
                    $t('system.dept.confirmRemoveMember', {
                      name: record.nickName || record.userName,
                    })
                  "
                  @confirm="onRemoveUser(record)"
                >
                  <Button type="link" danger size="small">
                    {{ $t('system.dept.removeMember') }}
                  </Button>
                </Popconfirm>
              </template>
            </template>
          </Table>
        </template>

        <template v-else>
          <div class="flex h-full items-center justify-center">
            <Empty :description="$t('system.dept.selectOrgFirst')" />
          </div>
        </template>
      </Card>
    </div>
  </Page>
</template>
