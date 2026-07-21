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
} from '#/api/sea-export/client-contact-admin';
import { useVbenModal } from '@vben/common-ui';
import AddModal from './add-modal.vue';
import { computed, ref,onMounted, watch } from 'vue';
import { Page } from '@vben/common-ui';
import { useRoute } from 'vue-router';
import { IconifyIcon } from '@vben/icons';
import { Button, Space, Modal as AntModal, message } from 'ant-design-vue';
import { $t } from '#/locales';
import { createPagedListQuery } from '#/utils/paged-list-query';
import ContactHandsontable from './contact-handsontable.vue'; // 导入新的Handsontable组件

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
};

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
    clientId: editId.value,
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

const toggleContactDisable = async (data: ClientContactAdminApi.ClientContactDto) => {
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
          isDisabled: isDisabled
        });
        
        // 操作成功后刷新列表
        queryTableData();
      } catch (error) {
        console.error(`${actionText}联系人失败:`, error);
      }
    },
  });
};

// 处理Handsontable保存事件
const handleSaveContacts = async (contacts: any) => {
  try {
    // 检查contacts是否为undefined或null
    if (contacts === undefined || contacts === null) {
      console.warn('contacts参数为undefined或null，尝试从dataSource获取数据');
      // 如果contacts为undefined，使用当前的dataSource
      const currentContacts = dataSource.value || [];
      await saveContacts(currentContacts);
      return;
    }
    
    // 验证contacts参数是否为数组
    if (!Array.isArray(contacts)) {
      console.error('contacts参数不是有效的数组:', contacts);
      message.error('联系人数据格式错误');
      return;
    }
    
    await saveContacts(contacts);
  } catch (error) {
    console.error('保存联系人失败:', error);
    message.error('保存联系人失败');
  }
};

// 分离出保存联系人的具体逻辑
const saveContacts = async (contactsToSave: any[]) => {
  for (const contact of contactsToSave) {
    if (!contact) continue; // 跳过空值
    
    // 确保clientId已设置
    if (!contact.clientId) {
      contact.clientId = editId.value || '';
    }
    
    // 转换布尔值
    const isDefault = contact.isDefault === true || contact.isDefault === '是' || contact.isDefault === 'true';
    const invoiceEnable = contact.invoiceEnable === true || contact.invoiceEnable === '是' || contact.invoiceEnable === 'true';
    const statementEnable = contact.statementEnable === true || contact.statementEnable === '是' || contact.statementEnable === 'true';
    
    if (!contact.id || contact.id === 0 || contact.id === '0' || contact.id === null || contact.id === undefined) {
      // 新增联系人，id为0或undefined表示新记录
      const newContact: ClientContactAdminApi.ClientContactAddDto = {
        clientId: contact.clientId,
        name: contact.name || '',
        mobile: contact.mobile || '',
        email: contact.email || '',
        tel: contact.tel || '',
        landline: contact.landline || '',
        position: contact.position || '',
        weChat: contact.weChat || '',
        isDefault: isDefault,
        remark: contact.remark || '',
        qq: contact.qq || '',
        invoiceEnable: invoiceEnable,
        statementEnable: statementEnable,
      };
      
      await addClientContact(newContact);
    } else {
      // 编辑联系人
      const editContact: ClientContactAdminApi.ClientContactEditDto = {
        id: typeof contact.id === 'string' ? parseInt(contact.id) : contact.id,
        clientId: contact.clientId,
        name: contact.name || '',
        mobile: contact.mobile || '',
        email: contact.email || '',
        tel: contact.tel || '',
        landline: contact.landline || '',
        position: contact.position || '',
        weChat: contact.weChat || '',
        isDefault: isDefault,
        remark: contact.remark || '',
        qq: contact.qq || '',
        invoiceEnable: invoiceEnable,
        statementEnable: statementEnable,
      };
      
      await editClientContact(editContact);
    }
  }
  
  message.success('联系人信息保存成功');
  // 重新加载数据
  queryTableData();
};

// 在组件挂载后自动加载数据
onMounted(() => {
  console.log('Contact list mounted, editId:', editId.value);
  if (editId.value) {
    queryTableData();
  }
});

// 监听editId变化，如果变化则重新加载数据
watch(editId, (newId) => {
  if (newId) {
    console.log('editId changed, loading data for:', newId);
    queryTableData();
  }
}, { immediate: true });
</script>

<template>
  <Page auto-content-height>
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
  </Page>

  <Modal @add="addContactData" @edit="editContactData" />
</template>

<style scoped lang="scss">
.order-fee-card {
  :deep(.ant-card-body) {
    padding: 0 20px 20px !important;
  }

  :deep(.ant-table-content) {
    min-height: 270px;
    // max-height: 500px;
    // overflow-y: auto;
  }
}

// .custom-table {
//   min-height: 300px;
// }
</style>

