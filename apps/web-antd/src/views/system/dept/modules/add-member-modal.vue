<script lang="ts" setup>
import type { OrganizationUnitMemberDto } from '#/api/system/organization-unit';

import { ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';

import { Input, message, Table } from 'ant-design-vue';

import {
  addUsersToOrganizationUnit,
  findUsersForOrganizationUnit,
} from '#/api/system/organization-unit';
import { $t } from '#/locales';

const emit = defineEmits(['success']);

const organizationUnitId = ref<number>(0);
const searchKeyword = ref('');
const loading = ref(false);
const userList = ref<OrganizationUnitMemberDto[]>([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const selectedRowKeys = ref<number[]>([]);

const columns = [
  {
    dataIndex: 'userName',
    title: () => $t('system.dept.userName'),
    width: 120,
  },
  {
    dataIndex: 'nickName',
    title: () => $t('system.dept.nickName'),
    width: 120,
  },
  {
    dataIndex: 'roleNames',
    title: () => $t('system.user.roles'),
    width: 160,
    ellipsis: true,
  },
];

async function searchUsers() {
  loading.value = true;
  try {
    const res = await findUsersForOrganizationUnit({
      keyWords: searchKeyword.value || undefined,
      organizationUnitId: organizationUnitId.value,
      skipCount: (currentPage.value - 1) * pageSize.value,
      maxResultCount: pageSize.value,
    });
    userList.value = res.items || [];
    totalCount.value = res.totalCount || 0;
  } finally {
    loading.value = false;
  }
}

function onTableChange(pagination: { current: number; pageSize: number }) {
  currentPage.value = pagination.current;
  pageSize.value = pagination.pageSize;
  searchUsers();
}

function onSearch() {
  currentPage.value = 1;
  searchUsers();
}

function onSelectionChange(keys: number[]) {
  selectedRowKeys.value = keys;
}

const [Modal, modalApi] = useVbenModal({
  async onConfirm() {
    if (selectedRowKeys.value.length === 0) {
      message.warning($t('system.dept.selectOrgFirst'));
      return;
    }
    modalApi.lock();
    try {
      await addUsersToOrganizationUnit({
        userIds: selectedRowKeys.value,
        organizationUnitId: organizationUnitId.value,
      });
      message.success($t('system.dept.addSuccess'));
      modalApi.close();
      emit('success');
    } finally {
      modalApi.lock(false);
    }
  },
  onOpenChange(isOpen) {
    if (isOpen) {
      const data = modalApi.getData<{ organizationUnitId: number }>();
      if (data) {
        organizationUnitId.value = data.organizationUnitId;
      }
      selectedRowKeys.value = [];
      searchKeyword.value = '';
      currentPage.value = 1;
      searchUsers();
    }
  },
});
</script>

<template>
  <Modal :title="$t('system.dept.addMember')">
    <div class="mb-3">
      <Input.Search
        v-model:value="searchKeyword"
        :placeholder="$t('system.dept.searchUser')"
        allow-clear
        enter-button
        @search="onSearch"
      />
    </div>
    <Table
      :columns="columns"
      :data-source="userList"
      :loading="loading"
      :pagination="{
        current: currentPage,
        pageSize: pageSize,
        total: totalCount,
        showSizeChanger: true,
        showTotal: (total) => `${total} 条`,
      }"
      :row-selection="{
        selectedRowKeys,
        onChange: onSelectionChange,
      }"
      row-key="id"
      size="small"
      :scroll="{ y: 400 }"
      @change="onTableChange"
    />
    <div v-if="selectedRowKeys.length > 0" class="mt-2 text-sm text-gray-500">
      {{ $t('system.dept.selectedUsers') }}: {{ selectedRowKeys.length }}
    </div>
  </Modal>
</template>
