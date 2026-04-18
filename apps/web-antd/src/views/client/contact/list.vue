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
} from '#/api/sea-export/client-contact-admin';
import { useVbenModal } from '@vben/common-ui';
import AddModal from './add-modal.vue';
import { computed, ref } from 'vue';
import { Page } from '@vben/common-ui';
import { useRoute } from 'vue-router';
import { IconifyIcon } from '@vben/icons';
import { Button, Space } from 'ant-design-vue';

import { $t } from '#/locales';

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
  }
};

const [Grid, gridApi] = useVbenVxeGrid<ClientContactAdminApi.ClientContactDto>({
  gridOptions: {
    columns: useColumns(handleActionClick),
    height: 'auto',
    keepSource: true,
    radioConfig: {
      highlight: true,
      trigger: 'row',
    },
    rowConfig: {
      keyField: 'id',
    },
    pagerConfig: {
      enabled: true,
    },
    proxyConfig: {
      ajax: {
        query: async (
          { page }: { page: { currentPage: number; pageSize: number } },
          formValues: Record<string, any>,
        ) => {
          const res = await getClientContactPagedList({
            PageIndex: page.currentPage,
            PageSize: page.pageSize,
            ClientId: editId.value,
            ...formValues,
          });
          return res;
        },
      },
    },
    toolbarConfig: {
      custom: true,
      export: false,
      refresh: { code: 'query' },
      zoom: true,
    },
  },
  gridEvents: {
    // 单行选择变化事件
    checkboxChange: ({ row, checked }) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any;

      selectedRowKeys.value = records.map((r: any) => r._rowKey);

      // 可以在这里处理业务逻辑
    },

    // 全选/取消全选事件
    checkboxAll: ({ checked }) => {
      const records = (gridApi.grid?.getCheckboxRecords?.() ?? []) as any;

      selectedRowKeys.value = records.map((r: any) => r._rowKey);
    },

    // 单选模式下的选择事件（如果使用 radio 类型）
    radioChange: ({ row }) => {
      console.log('单选选中:', row);
    },
  },
});
const addRowData = () => {
  const list = [...(dataSource.value ?? [])];
  list.push({
    _rowKey: `contact_${++rowKeyCounter}_${Date.now()}`,
    id: '',
    clientId: editId.value,
    invoiceEnable: false,
    statementEnable: false,
  } as any);
  dataSource.value = list;
};
const addRow = () => {
  tmpAdd.value = true;
  gridApi.query();
};

const [Modal, modalApi] = useVbenModal({
  // 连接抽离的组件
  connectedComponent: AddModal,
});
const addContactData = async (
  data: ClientContactAdminApi.ClientContactEditDto,
) => {
  data.clientId = editId.value || '';
  await addClientContact(data);
  gridApi.query();
};
const editContactData = async (
  data: ClientContactAdminApi.ClientContactEditDto,
) => {
  data.clientId = editId.value || '';
  await editClientContact(data);
  gridApi.query();
};

const addContact = () => {
  modalApi.open();
};
const editContact = (data: ClientContactAdminApi.ClientContactEditDto) => {
  modalApi.setData(data).open();
};

const delContact = async (data: ClientContactAdminApi.IdDto) => {
  await deleteClientContact(data);
  gridApi.query();
};
</script>

<template>
  <Page auto-content-height>
    <Grid table-title="客户联系人">
      <template #toolbar-tools>
        <Space>
          <Button type="primary" @click="addContact">
            <IconifyIcon icon="ant-design:plus-outlined" class="size-4" />
            {{ $t('common.create') }}
          </Button>
        </Space>
      </template>
    </Grid>
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
