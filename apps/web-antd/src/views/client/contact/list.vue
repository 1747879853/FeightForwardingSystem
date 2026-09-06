<script lang="ts" setup>
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import type { OnActionClickParams } from '#/adapter/vxe-table';
import { useColumns } from './data';
import type { ClientContactAdminApi } from '#/api/sea-export/client-contact-admin';
import {
  addClientContact,
  getClientContactPagedList,
  editClientContact,
  deleteClientContact,
  setClientContactDisabled,
  batchSaveClientContacts,
} from '#/api/sea-export/client-contact-admin';
import { useVbenModal } from '@vben/common-ui';
import AddModal from './add-modal.vue';
import { computed, ref, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { IconifyIcon } from '@vben/icons';
import { Button, Space, Modal as AntModal, message } from 'ant-design-vue';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';
import ContactHandsontable from './contact-handsontable.vue'; // 导入新的Handsontable组件

defineOptions({ name: 'ClientContactList' });

const tmpAdd = ref(false);
const dataSource = defineModel<ClientContactAdminApi.ClientContactDto[]>({
  default: () => [],
});

const route = useRoute();

const editId = computed<string | undefined>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0];
  return id ? String(id) : undefined;
});

const ORDER_CONTACT_API_KEYS: Array<
  Extract<keyof ClientContactAdminApi.ClientContactEditDto, string>
> = [
  'id',
  'clientId',
  'name',
  'mobile',
  'email',
  'tel',
  'landline',
  'position',
  'weChat',
  'isDefault',
  'remark',
  'qq',
  'invoiceEnable',
  'statementEnable',
];

let rowKeyCounter = 0;

/** 为 orderCtns 每项添加 _rowKey，供 Table 使用 */
const normalizeWithRowKey = (
  items: ClientContactAdminApi.ClientContactDto[] | undefined,
) => {
  if (!items?.length) return [];
  console.log('rrr', items);
  return items.map((item, i) => ({
    ...item,
    _rowKey: `contact_${i}_${Date.now()}`,
  })) as any[];
};
const queryTableData = async () => {
  if (!editId.value) {
    return;
  }
  let params = {
    ClientId: editId.value,
    PageIndex: 1,
    PageSize: 999,
  };
  const res = await getClientContactPagedList(params);
  console.log('res', res.items);
  dataSource.value = normalizeWithRowKey(res.items);
  syncContactSnapshot();
};

const contactSnapshot = ref<null | string>(null);

function contactDirtyPayload() {
  return JSON.stringify(
    // dataSource 行由 normalizeWithRowKey 注入了 _rowKey（非 DTO 字段），此处按宽松类型剔除
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

const selectedRowKeys = ref<(string | number)[]>([]);

const handleActionClick = ({
  code,
  row,
}: OnActionClickParams<ClientContactAdminApi.ClientContactDto>) => {
  switch (code) {
    case 'delete': {
      delContact(row);
      break;
    }
    case 'edit': {
      editContact(row);
      break;
    }
    case 'toggleDisable': {
      toggleContactDisable(row);
      break;
    }
  }
};

const fetchClientContactPagedList = (params: Record<string, any>) =>
  getClientContactPagedList({
    ...params,
    ClientId: editId.value,
  });

const [Modal, modalApi] = useVbenModal({
  // 连接抽离的组件
  connectedComponent: AddModal,
});

const addContactData = async (
  data: ClientContactAdminApi.ClientContactEditDto,
) => {
  data.clientId = editId.value || '';
  await addClientContact(data);
  queryTableData(); // 重新加载数据
};
const editContactData = async (
  data: ClientContactAdminApi.ClientContactEditDto,
) => {
  data.clientId = editId.value || '';
  await editClientContact(data);
  queryTableData(); // 重新加载数据
};

const addContact = () => {
  modalApi.setData(null).open();
};
const editContact = (data: ClientContactAdminApi.ClientContactEditDto) => {
  modalApi.setData(data).open();
};

const delContact = async (data: ClientContactAdminApi.IdDto) => {
  await deleteClientContact(data);
  queryTableData(); // 重新加载数据
};

const toggleContactDisable = async (
  data: ClientContactAdminApi.ClientContactDto,
) => {
  const isDisabled = !data.isDeleted; // 根据isDeleted字段判断当前状态
  const actionText = isDisabled ? '禁用' : '启用';
  const displayName = data.name || `联系人${data.id}`;

  AntModal.confirm({
    title: `${actionText}联系人`,
    content: `确定要${actionText}联系人 "${displayName}" 吗？`,
    okType: 'danger',
    async onOk() {
      try {
        await setClientContactDisabled({
          id: data.id,
          isDisabled: isDisabled,
        });

        // 操作成功后刷新列表
        queryTableData();
      } catch (error) {
        console.error(`${actionText}联系人失败:`, error);
      }
    },
  });
};

// 处理Handsontable保存事件 - 统一处理批量保存逻辑
const handleSaveContacts = async (
  contacts: ClientContactAdminApi.ClientContactDto[],
) => {
  try {
    // 验证contacts参数
    if (!contacts || !Array.isArray(contacts)) {
      console.error('contacts参数不是有效的数组:', contacts);
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

// 分离出保存联系人的具体逻辑 - 使用批量保存接口
const saveContacts = async (
  contactsToSave: ClientContactAdminApi.ClientContactDto[],
) => {
  if (!editId.value) {
    message.error('缺少客户ID');
    return;
  }

  // 转换数据格式为批量保存项
  const contacts: ClientContactAdminApi.ClientContactBatchItemDto[] =
    contactsToSave.map((contact) => {
      // 构建批量保存项
      const item: ClientContactAdminApi.ClientContactBatchItemDto = {
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
        // 对接人：未指定（空/0/null）时不传，由后端视为“所有人可见”
        userId: contact.userId || undefined,
      };

      return item;
    });

  try {
    // 调用批量保存接口
    const savedIds = await batchSaveClientContacts({
      clientId: editId.value,
      contacts: contacts,
    });

    console.log('批量保存成功，返回的ID列表:', savedIds);
    message.success(`联系人信息保存成功（共${contacts.length}条）`);

    // 重新加载数据
    await queryTableData();
  } catch (error) {
    console.error('批量保存联系人失败:', error);
    message.error('保存联系人失败');
    throw error;
  }
};

// 在组件挂载后自动加载数据
onMounted(() => {
  console.log('Contact list mounted, editId:', editId.value);
  if (editId.value) {
    queryTableData();
  }
});

// 监听editId变化，如果变化则重新加载数据
watch(
  editId,
  (newId) => {
    if (newId) {
      console.log('editId changed, loading data for:', newId);
      queryTableData();
    }
  },
  { immediate: true },
);
</script>

<template>
  <!-- ✅ 不再嵌套 Page auto-content-height：本组件已处于客户编辑页(client/editor.vue)的 Page 内，
       嵌套 Page 会二次按全屏高度(--vben-content-height)计算，而固定高 800 的 Handsontable 会溢出该高度框，
       形成双层滚动，导致表格表头克隆层错位消失、sticky 页签栏被破坏。改用普通 div 由外层 Page 统一滚动。 -->
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

  <Modal @add="addContactData" @edit="editContactData" />
</template>
