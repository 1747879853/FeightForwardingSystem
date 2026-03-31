<script lang="ts" setup>
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { computed, ref, watch } from 'vue';

import { Button, Input, Modal, Select, Space, Table } from 'ant-design-vue';

import { getUser, UserAttribute } from '#/api/system/user-admin';
import { $t } from '@vben/locales';

import UserSelect from '../biz-select/user-select.vue';

type OrderRow = SeaExportAdminApi.OrderUserAddDto & {
  _rowKey: string;
  userName?: string;
};

const modelValue = defineModel<SeaExportAdminApi.OrderUserAddDto[] | undefined>(
  {
    default: undefined,
  },
);

const modalVisible = ref(false);
const pendingRows = ref<OrderRow[]>([]);
const selectedRowKeys = ref<string[]>([]);
const userNameMap = ref<Record<number, string>>({});
let rowKeyCounter = 0;

const makeRowKey = () => `order_user_${++rowKeyCounter}_${Date.now()}`;

const userAttributeOptions = computed(() => [
  {
    label: $t('system.user.userAttributeOptions.business'),
    value: UserAttribute.Business,
  },
  {
    label: $t('system.user.userAttributeOptions.operation'),
    value: UserAttribute.Operation,
  },
  {
    label: $t('system.user.userAttributeOptions.customerService'),
    value: UserAttribute.CustomerService,
  },
  {
    label: $t('system.user.userAttributeOptions.documentation'),
    value: UserAttribute.Documentation,
  },
]);

const displayText = computed(() => {
  const items = modelValue.value || [];
  if (!items.length) return $t('seaExport.export.selectOrderUsers');

  const attrLabelMap = new Map(
    userAttributeOptions.value.map((item) => [item.value, item.label]),
  );

  const selectedAttrLabels = Array.from(
    new Set(
      items
        .filter((item) => !!item.userId && !!item.userAttribute)
        .map((item) => attrLabelMap.get(item.userAttribute!))
        .filter(Boolean),
    ),
  );

  if (selectedAttrLabels.length) {
    return selectedAttrLabels.join(' / ');
  }

  const selectedUserNames = items
    .map((item) => {
      if (item.userId) {
        return userNameMap.value[item.userId] || String(item.userId);
      }
      return undefined;
    })
    .filter(Boolean);

  return selectedUserNames.length
    ? selectedUserNames.join(' / ')
    : $t('seaExport.export.selectOrderUsers');
});

const openModal = () => {
  pendingRows.value = (modelValue.value || []).map((item) => ({
    ...item,
    _rowKey: makeRowKey(),
  }));
  selectedRowKeys.value = [];
  modalVisible.value = true;
};

const handleConfirm = () => {
  modelValue.value = pendingRows.value.map(({ _rowKey: _k, ...rest }) => rest);
  modalVisible.value = false;
};

const addRow = () => {
  pendingRows.value = [...pendingRows.value, { _rowKey: makeRowKey() }];
};

const removeSelectedRows = () => {
  const keysSet = new Set(selectedRowKeys.value);
  pendingRows.value = pendingRows.value.filter(
    (row) => !keysSet.has(row._rowKey),
  );
  selectedRowKeys.value = [];
};

const updateRow = (
  index: number,
  patch: Partial<SeaExportAdminApi.OrderUserAddDto & { userName?: string }>,
) => {
  const list = [...pendingRows.value];
  list[index] = {
    ...list[index],
    ...patch,
  };
  pendingRows.value = list;
};

const updateUserAttribute = (
  index: number,
  userAttribute: number | undefined,
) => {
  updateRow(index, {
    userAttribute,
    userId: undefined,
    userName: undefined,
  });
};

const updateUser = (index: number, userId: number | undefined) => {
  updateRow(index, { userId, userName: undefined });
  if (!userId || userNameMap.value[userId]) return;
  getUser(userId)
    .then((detail) => {
      const userName = detail.userName || detail.nickName || String(userId);
      userNameMap.value = { ...userNameMap.value, [userId]: userName };
      const latest = [...pendingRows.value];
      const row = latest[index];
      if (row?.userId === userId) {
        latest[index] = {
          ...row,
          userName,
        };
        pendingRows.value = latest;
      }
    })
    .catch(() => {});
};

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: string[]) => {
    selectedRowKeys.value = keys;
  },
}));

const loadUserNames = async (items: SeaExportAdminApi.OrderUserAddDto[]) => {
  for (const item of items) {
    if (!item.userId) continue;
    const nickName = (item as any).userNickName as string | undefined;
    if (nickName && !userNameMap.value[item.userId]) {
      userNameMap.value = {
        ...userNameMap.value,
        [item.userId]: nickName,
      };
    }
  }
};

watch(
  () => modelValue.value,
  (items) => {
    if (items?.length) loadUserNames(items);
  },
  { immediate: true, deep: true },
);
</script>

<template>
  <div class="w-full">
    <Button class="w-full text-left" @click="openModal">
      <div class="flex w-full items-center">
        <span class="min-w-0 flex-1 truncate">{{ displayText }}</span>
        <span
          class="ml-auto inline-flex h-full flex-shrink-0 items-center justify-center text-primary"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="size-4"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="m16.5 3.5 4 4L7 21l-4 1 1-4 12.5-14.5z" />
          </svg>
        </span>
      </div>
    </Button>

    <Modal
      :open="modalVisible"
      :title="$t('seaExport.export.selectOrderUsers')"
      :width="760"
      :ok-text="$t('common.confirm')"
      :cancel-text="$t('common.cancel')"
      destroy-on-close
      @ok="handleConfirm"
      @cancel="() => (modalVisible = false)"
    >
      <div class="mb-2 flex items-center justify-between">
        <span class="text-sm font-medium text-gray-600">
          {{ $t('seaExport.export.orderUsers') }}
        </span>
        <Space>
          <Button type="primary" size="small" @click="addRow">
            {{ $t('seaExport.export.addOrderUser') }}
          </Button>
          <Button
            danger
            size="small"
            :disabled="!selectedRowKeys.length"
            @click="removeSelectedRows"
          >
            {{ $t('common.delete') }}
          </Button>
        </Space>
      </div>

      <Table
        :data-source="pendingRows"
        :row-selection="rowSelection"
        :pagination="false"
        row-key="_rowKey"
        size="small"
        bordered
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'userAttribute'">
            <Select
              :value="record.userAttribute"
              :options="userAttributeOptions"
              :placeholder="$t('seaExport.export.pleaseSelectUserAttribute')"
              allow-clear
              class="w-full"
              @update:value="(v) => updateUserAttribute(index, v)"
            />
          </template>
          <template v-else-if="column.key === 'userId'">
            <UserSelect
              :model-value="record.userId"
              :user-attribute="record.userAttribute"
              :selected-items="
                record.userId
                  ? [
                      {
                        id: record.userId,
                        userName:
                          record.userName || userNameMap[record.userId] || '',
                      },
                    ]
                  : []
              "
              :disabled="!record.userAttribute"
              :placeholder="$t('seaExport.export.pleaseSelectOrderUser')"
              class="w-full"
              @update:model-value="(v) => updateUser(index, v)"
            />
          </template>
          <template v-else-if="column.key === 'remark'">
            <Input
              :value="record.remark"
              :placeholder="$t('seaExport.export.remark')"
              allow-clear
              class="w-full"
              @update:value="(v) => updateRow(index, { remark: v })"
            />
          </template>
        </template>

        <Table.Column
          key="userAttribute"
          :title="$t('seaExport.export.userAttribute')"
          width="180"
        />
        <Table.Column
          key="userId"
          :title="$t('seaExport.export.orderUserId')"
          width="260"
        />
        <Table.Column key="remark" :title="$t('seaExport.export.remark')" />
      </Table>
    </Modal>
  </div>
</template>
