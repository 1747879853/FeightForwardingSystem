<script lang="ts" setup>
import type { SystemUserAdminApi } from '#/api/system/user-admin';

import { computed, onMounted, ref } from 'vue';

import { useVbenModal } from '@vben/common-ui';
import { Button, message, Popconfirm, Table } from 'ant-design-vue';

import {
  deleteUserBankAccount,
  getUserBankAccountList,
} from '#/api/system/user-admin';
import { $t } from '#/locales';

import { useUserBankAccountColumns } from '../data';
import BankAccountModal from './bank-account-modal.vue';

defineOptions({ name: 'UserBankAccountPanel' });

const props = defineProps<{ userId: number }>();

const loading = ref(false);
const bankAccountList = ref<SystemUserAdminApi.UserBankAccountDto[]>([]);

const columns = computed(() => useUserBankAccountColumns());

async function loadBankAccounts() {
  if (!props.userId) {
    bankAccountList.value = [];
    return;
  }
  loading.value = true;
  try {
    bankAccountList.value = await getUserBankAccountList(props.userId);
  } finally {
    loading.value = false;
  }
}

async function onDelete(record: SystemUserAdminApi.UserBankAccountDto) {
  try {
    await deleteUserBankAccount(record.id);
    message.success($t('system.user.bankAccount.deleteSuccess'));
    await loadBankAccounts();
  } catch {
    // error handled by request interceptor
  }
}

const [BankAccountModalComponent, bankAccountModalApi] = useVbenModal({
  connectedComponent: BankAccountModal,
  destroyOnClose: true,
});

function onAdd() {
  bankAccountModalApi.setData({ userId: props.userId }).open();
}

function onEdit(record: SystemUserAdminApi.UserBankAccountDto) {
  bankAccountModalApi.setData({ userId: record.userId, id: record.id }).open();
}

function onBankAccountSuccess() {
  void loadBankAccounts();
}

onMounted(() => {
  if (props.userId != null) {
    void loadBankAccounts();
  }
});
</script>

<template>
  <div class="p-4">
    <BankAccountModalComponent @success="onBankAccountSuccess" />

    <div class="mb-3 flex items-center justify-end">
      <Button type="primary" size="small" @click="onAdd">
        {{ $t('ui.actionTitle.create', [$t('system.user.bankAccount.name')]) }}
      </Button>
    </div>

    <Table
      :columns="columns"
      :data-source="bankAccountList"
      :loading="loading"
      :pagination="false"
      row-key="id"
      size="small"
      :scroll="{ x: 800 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'action'">
          <Button
            type="link"
            size="small"
            @click="onEdit(record as SystemUserAdminApi.UserBankAccountDto)"
          >
            {{ $t('common.edit') }}
          </Button>
          <Popconfirm
            :title="$t('system.user.bankAccount.confirmDelete')"
            @confirm="onDelete(record as SystemUserAdminApi.UserBankAccountDto)"
          >
            <Button type="link" danger size="small">
              {{ $t('common.delete') }}
            </Button>
          </Popconfirm>
        </template>
      </template>
    </Table>
  </div>
</template>
