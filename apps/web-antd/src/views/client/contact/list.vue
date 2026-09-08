<script lang="ts" setup>
import type { ClientContactAdminApi } from '#/api/sea-export/client-contact-admin';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { IconifyIcon } from '@vben/icons';

import { Button, message, Space } from 'ant-design-vue';

import {
  batchSaveClientContacts,
  getClientContactPagedList,
} from '#/api/sea-export/client-contact-admin';
import { $t } from '#/locales';

import ContactHandsontable from './contact-handsontable.vue';

defineOptions({ name: 'ClientContactList' });

const dataSource = defineModel<ClientContactAdminApi.ClientContactDto[]>({
  default: () => [],
});

const route = useRoute();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

/** 为联系人行注入 _rowKey，供 Handsontable 使用 */
const normalizeWithRowKey = (
  items: ClientContactAdminApi.ClientContactDto[] | undefined,
) => {
  if (!items?.length) return [];
  return items.map((item, i) => ({
    ...item,
    _rowKey: `contact_${i}_${Date.now()}`,
  })) as ClientContactAdminApi.ClientContactDto[];
};

const queryTableData = async () => {
  if (!editId.value) return;
  const res = await getClientContactPagedList({
    ClientId: editId.value,
    PageIndex: 1,
    PageSize: 999,
  });
  dataSource.value = normalizeWithRowKey(res.items);
  syncContactSnapshot();
};

const contactSnapshot = ref<null | string>(null);

function contactDirtyPayload() {
  return JSON.stringify(
    (dataSource.value ?? []).map(({ _rowKey: _k, ...rest }: any) => rest),
  );
}

function syncContactSnapshot() {
  contactSnapshot.value = contactDirtyPayload();
}

function isContactDirty() {
  if (contactSnapshot.value === null) return false;
  return contactDirtyPayload() !== contactSnapshot.value;
}

defineExpose({ isContactDirty });

const handleSaveContacts = async (
  contacts: ClientContactAdminApi.ClientContactDto[],
) => {
  try {
    if (!contacts || !Array.isArray(contacts)) {
      message.error('联系人数据格式错误');
      return;
    }
    if (contacts.length === 0) {
      message.warning('没有需要保存的联系人');
      return;
    }
    await saveContacts(contacts);
  } catch (error) {
    console.error('保存联系人失败:', error);
    message.error('保存联系人失败');
  }
};

const saveContacts = async (
  contactsToSave: ClientContactAdminApi.ClientContactDto[],
) => {
  if (!editId.value) {
    message.error('缺少客户ID');
    return;
  }

  const contacts: ClientContactAdminApi.ClientContactBatchItemDto[] =
    contactsToSave.map((contact) => ({
      id:
        !contact.id ||
        contact.id === 0 ||
        contact.id === null ||
        contact.id === undefined
          ? undefined
          : contact.id,
      name: contact.name || '',
      mobile: contact.mobile || '',
      email: contact.email || '',
      tel: contact.tel || '',
      landline: contact.landline || '',
      position: contact.position || '',
      weChat: contact.weChat || '',
      isDefault: contact.isDefault,
      remark: contact.remark || '',
      qq: contact.qq || '',
      invoiceEnable: contact.invoiceEnable,
      statementEnable: contact.statementEnable,
      isDisabled: contact.isDisabled,
      // 对接人：未指定时不传，由后端视为「所有人可见」
      userId: contact.userId || undefined,
    }));

  try {
    await batchSaveClientContacts({
      clientId: editId.value,
      contacts,
    });
    message.success(`联系人信息保存成功（共${contacts.length}条）`);
    await queryTableData();
  } catch (error) {
    console.error('批量保存联系人失败:', error);
    message.error('保存联系人失败');
    throw error;
  }
};

onMounted(() => {
  if (editId.value) {
    queryTableData();
  }
});

watch(
  editId,
  (newId) => {
    if (newId) {
      queryTableData();
    }
  },
  { immediate: true },
);
</script>

<template>
  <!-- 已处于 client/editor.vue 的 Page 内，勿再嵌套 Page，避免双层滚动破坏 Handsontable 表头。 -->
  <div class="client-contact-list p-4">
    <ContactHandsontable
      v-model:model-value="dataSource"
      :client-id="editId"
      @save="handleSaveContacts"
    >
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="queryTableData">
            <IconifyIcon icon="ant-design:reload-outlined" class="size-4" />
            {{ $t('common.refresh') }}
          </Button>
        </Space>
      </template>
    </ContactHandsontable>
  </div>
</template>
