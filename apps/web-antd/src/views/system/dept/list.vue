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
  Descriptions,
  DescriptionsItem,
  Dropdown,
  Empty,
  Input,
  Menu,
  MenuItem,
  message,
  Popconfirm,
  Table,
  Tabs,
  TabPane,
  Tag,
  Tree,
} from 'ant-design-vue';

import {
  deleteOrgBankAccount,
  deleteOrganizationUnit,
  getOrganizationUnit,
  getOrgBankAccountList,
  getOrganizationUnitTree,
  getOrganizationUnitUsers,
  removeUserFromOrganizationUnit,
} from '#/api/system/organization-unit';
import { $t } from '#/locales';

import Form from './modules/form.vue';
import AddMemberModal from './modules/add-member-modal.vue';
import BankAccountModal from './modules/bank-account-modal.vue';

// ========== 组织树相关 ==========
const treeData = ref<SystemOrganizationUnitApi.OrganizationUnitTreeDto[]>([]);
const treeLoading = ref(false);
const selectedKeys = ref<number[]>([]);
const expandedKeys = ref<number[]>([]);
const searchValue = ref('');
const activeTab = ref('orgInfo');

const selectedOrgDetail = ref<SystemOrganizationUnitApi.OrganizationUnitDto>();

const selectedOrg = computed(() => {
  if (selectedKeys.value.length === 0) return null;
  return findNodeById(treeData.value, selectedKeys.value[0]!);
});

const isSelectedOrgCompany = computed(() => {
  return selectedOrgDetail.value?.isCompany === true;
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

async function loadOrgDetail() {
  const orgId = selectedKeys.value[0];
  if (!orgId) {
    selectedOrgDetail.value = undefined;
    return;
  }
  try {
    selectedOrgDetail.value = await getOrganizationUnit(orgId);
  } catch {
    selectedOrgDetail.value = undefined;
  }
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
  loadOrgDetail();
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

// ========== 银行账户列表 ==========
const bankAccountLoading = ref(false);
const bankAccountList = ref<SystemOrganizationUnitApi.OrgBankAccountDto[]>([]);

const bankAccountColumns = computed(() => [
  {
    dataIndex: 'bankShortName',
    title: $t('system.dept.bankAccount.bankShortName'),
    width: 100,
  },
  {
    dataIndex: 'bankName',
    title: $t('system.dept.bankAccount.bankName'),
    width: 180,
  },
  {
    dataIndex: 'bankAccount',
    title: $t('system.dept.bankAccount.bankAccount'),
    width: 200,
  },
  {
    dataIndex: 'accountName',
    title: $t('system.dept.bankAccount.accountName'),
    width: 150,
  },
  {
    dataIndex: 'currencyCode',
    title: $t('system.dept.bankAccount.currencyId'),
    width: 80,
  },
  {
    dataIndex: 'cnapsCode',
    title: $t('system.dept.bankAccount.cnapsCode'),
    width: 120,
  },
  {
    dataIndex: 'swiftCode',
    title: $t('system.dept.bankAccount.swiftCode'),
    width: 120,
  },
  {
    dataIndex: 'default',
    title: $t('system.dept.bankAccount.default'),
    width: 100,
    key: 'default',
  },
  {
    dataIndex: 'enable',
    title: $t('system.dept.bankAccount.enable'),
    width: 100,
    key: 'enable',
  },
  {
    title: $t('system.dept.operation'),
    key: 'bankAction',
    width: 140,
    fixed: 'right' as const,
  },
]);

async function loadBankAccounts() {
  const orgId = selectedKeys.value[0];
  if (!orgId) {
    bankAccountList.value = [];
    return;
  }
  bankAccountLoading.value = true;
  try {
    bankAccountList.value = await getOrgBankAccountList(orgId);
  } finally {
    bankAccountLoading.value = false;
  }
}

async function onDeleteBankAccount(
  record: SystemOrganizationUnitApi.OrgBankAccountDto,
) {
  try {
    await deleteOrgBankAccount(record.id);
    message.success($t('system.dept.bankAccount.deleteSuccess'));
    loadBankAccounts();
  } catch {
    // error handled by request interceptor
  }
}

// ========== 银行账户弹窗 ==========
const [BankAccountModalComponent, bankAccountModalApi] = useVbenModal({
  connectedComponent: BankAccountModal,
  destroyOnClose: true,
});

function onAddBankAccount() {
  const orgId = selectedKeys.value[0];
  if (!orgId) return;
  bankAccountModalApi.setData({ organizationUnitId: orgId }).open();
}

function onEditBankAccount(
  record: SystemOrganizationUnitApi.OrgBankAccountDto,
) {
  bankAccountModalApi
    .setData({
      organizationUnitId: record.organizationUnitId,
      id: record.id,
    })
    .open();
}

function onBankAccountSuccess() {
  loadBankAccounts();
}

// ========== Watch & Init ==========
watch(selectedKeys, async () => {
  await loadOrgDetail();
  loadUsers();
  if (isSelectedOrgCompany.value) {
    loadBankAccounts();
  } else {
    bankAccountList.value = [];
    if (activeTab.value === 'bankAccounts') {
      activeTab.value = 'orgInfo';
    }
  }
});

loadTree();
</script>

<template>
  <Page auto-content-height>
    <FormModal @success="onFormSuccess" />
    <AddMemberModalComponent @success="onAddMemberSuccess" />
    <BankAccountModalComponent @success="onBankAccountSuccess" />

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

      <!-- 右侧内容区 -->
      <Card class="min-w-0 flex-1" size="small">
        <template v-if="selectedOrg">
          <Tabs v-model:activeKey="activeTab">
            <!-- 组织信息 Tab -->
            <TabPane key="orgInfo" :tab="$t('system.dept.orgInfo')">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-base font-medium">
                  {{ selectedOrg.displayName }}
                </span>
                <div class="flex gap-2">
                  <Button
                    type="primary"
                    size="small"
                    @click="onEditOrg(selectedOrg)"
                  >
                    {{ $t('common.edit') }}
                  </Button>
                  <Popconfirm
                    :title="
                      $t('system.dept.confirmDeleteOrg', {
                        name: selectedOrg.displayName,
                      })
                    "
                    :disabled="
                      !!(
                        selectedOrg.children && selectedOrg.children.length > 0
                      )
                    "
                    @confirm="onDeleteOrg(selectedOrg)"
                  >
                    <Button
                      type="primary"
                      danger
                      size="small"
                      :disabled="
                        !!(
                          selectedOrg.children &&
                          selectedOrg.children.length > 0
                        )
                      "
                    >
                      {{ $t('common.delete') }}
                    </Button>
                  </Popconfirm>
                </div>
              </div>

              <Descriptions
                v-if="selectedOrgDetail"
                bordered
                size="small"
                :column="2"
              >
                <DescriptionsItem :label="$t('system.dept.deptName')">
                  {{ selectedOrgDetail.displayName }}
                </DescriptionsItem>
                <DescriptionsItem :label="$t('system.dept.orgCode')">
                  {{ selectedOrgDetail.code }}
                </DescriptionsItem>
                <DescriptionsItem :label="$t('system.dept.orgType')">
                  <Tag :color="selectedOrgDetail.isCompany ? 'blue' : 'green'">
                    {{
                      selectedOrgDetail.isCompany
                        ? $t('system.dept.isCompanyYes')
                        : $t('system.dept.isCompanyNo')
                    }}
                  </Tag>
                </DescriptionsItem>
                <DescriptionsItem :label="$t('system.dept.enable')">
                  <Tag :color="selectedOrgDetail.enable ? 'green' : 'default'">
                    {{
                      selectedOrgDetail.enable
                        ? $t('common.enabled')
                        : $t('common.disabled')
                    }}
                  </Tag>
                </DescriptionsItem>
                <DescriptionsItem :label="$t('system.dept.shortName')">
                  {{ selectedOrgDetail.shortName || '-' }}
                </DescriptionsItem>
                <DescriptionsItem :label="$t('system.dept.enName')">
                  {{ selectedOrgDetail.enName || '-' }}
                </DescriptionsItem>
                <DescriptionsItem :label="$t('system.dept.chargeUser')">
                  {{ selectedOrgDetail.chargeUserNickName || '-' }}
                </DescriptionsItem>
                <DescriptionsItem :label="$t('system.dept.contactPhone')">
                  {{ selectedOrgDetail.contactPhone || '-' }}
                </DescriptionsItem>
                <DescriptionsItem :label="$t('system.dept.email')">
                  {{ selectedOrgDetail.email || '-' }}
                </DescriptionsItem>
                <DescriptionsItem :label="$t('system.dept.address')">
                  {{ selectedOrgDetail.address || '-' }}
                </DescriptionsItem>
                <DescriptionsItem :label="$t('system.dept.webUrl')">
                  {{ selectedOrgDetail.webUrl || '-' }}
                </DescriptionsItem>
                <DescriptionsItem :label="$t('system.dept.memberCount')">
                  {{ selectedOrgDetail.memberCount ?? 0 }}
                </DescriptionsItem>
                <template v-if="selectedOrgDetail.isCompany">
                  <DescriptionsItem
                    :label="$t('system.dept.unifiedSocialCreditCode')"
                    :span="2"
                  >
                    {{ selectedOrgDetail.unifiedSocialCreditCode || '-' }}
                  </DescriptionsItem>
                  <DescriptionsItem :label="$t('system.dept.localCurrency')">
                    {{ selectedOrgDetail.localCurrencyCode || '-' }}
                  </DescriptionsItem>
                  <DescriptionsItem :label="$t('system.dept.invoiceTel')">
                    {{ selectedOrgDetail.invoiceTel || '-' }}
                  </DescriptionsItem>
                  <DescriptionsItem
                    :label="$t('system.dept.invoiceAddress')"
                    :span="2"
                  >
                    {{ selectedOrgDetail.invoiceAddress || '-' }}
                  </DescriptionsItem>
                </template>
              </Descriptions>
            </TabPane>

            <!-- 成员列表 Tab -->
            <TabPane key="members" :tab="$t('system.dept.memberList')">
              <div class="mb-3 flex items-center justify-between">
                <span class="text-base font-medium">
                  {{ selectedOrg.displayName }} -
                  {{ $t('system.dept.memberList') }}
                </span>
                <Button type="primary" size="small" @click="onAddMember">
                  <Plus class="size-4" />
                  {{ $t('system.dept.addMember') }}
                </Button>
              </div>

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
            </TabPane>

            <!-- 银行账户 Tab（仅公司类型显示） -->
            <TabPane
              v-if="isSelectedOrgCompany"
              key="bankAccounts"
              :tab="$t('system.dept.bankAccountList')"
            >
              <div class="mb-3 flex items-center justify-between">
                <span class="text-base font-medium">
                  {{ selectedOrg.displayName }} -
                  {{ $t('system.dept.bankAccountList') }}
                </span>
                <Button type="primary" size="small" @click="onAddBankAccount">
                  <Plus class="size-4" />
                  {{ $t('system.dept.addBankAccount') }}
                </Button>
              </div>

              <Table
                :columns="bankAccountColumns"
                :data-source="bankAccountList"
                :loading="bankAccountLoading"
                :pagination="false"
                row-key="id"
                size="small"
                :scroll="{ x: 1200 }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'default'">
                    <Tag v-if="record.default" color="blue">
                      {{ $t('common.yes') }}
                    </Tag>
                    <span v-else class="text-gray-400">
                      {{ $t('common.no') }}
                    </span>
                  </template>
                  <template v-if="column.key === 'enable'">
                    <Tag v-if="record.enable" color="green">
                      {{ $t('common.enabled') }}
                    </Tag>
                    <Tag v-else color="default">
                      {{ $t('common.disabled') }}
                    </Tag>
                  </template>
                  <template v-if="column.key === 'bankAction'">
                    <Button
                      type="link"
                      size="small"
                      @click="onEditBankAccount(record)"
                    >
                      {{ $t('common.edit') }}
                    </Button>
                    <Popconfirm
                      :title="$t('system.dept.bankAccount.confirmDelete')"
                      @confirm="onDeleteBankAccount(record)"
                    >
                      <Button type="link" danger size="small">
                        {{ $t('common.delete') }}
                      </Button>
                    </Popconfirm>
                  </template>
                </template>
              </Table>
            </TabPane>
          </Tabs>
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
