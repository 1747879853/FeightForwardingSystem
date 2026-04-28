<script lang="ts" setup>
import type { ChangeOrderAdminApi } from '#/api/sea-export/change-order-admin';

import { GetPagedList, DeleteAsync } from '#/api/sea-export/change-order-admin';
import { computed, ref, watch, onMounted } from 'vue';

import {
  Button,
  Input,
  InputNumber,
  Space,
  Table,
  MonthPicker,
} from 'ant-design-vue';
import dayjs from 'dayjs';
import { $t } from '#/locales';
import { useVbenVxeGrid } from '#/adapter/vxe-table';
import { useColumns } from './data';
const dataSource = defineModel<ChangeOrderAdminApi.ChangeOrderEditDto[]>({
  default: () => [],
});

const selectedRowKeys = ref<(string | number)[]>([]);

const emit = defineEmits(['sync-table', 'save-change-order']);

const handleRowDblclick = ({
  row,
}: {
  row: ChangeOrderAdminApi.ChangeOrderEditDto;
}) => {
  console.log('select', row);
  // 设置当前行为选中状态，显示选中色
  const grid = gridApi.grid as any;
  if (grid && grid.setRadioRow) {
    grid.setRadioRow(row);
  }
  emit('sync-table', row);
};

// const rowSelection = computed(() => ({
//   type: 'radio',
//   selectedRowKeys: selectedRowKeys.value,
//   onChange: (keys: (string | number)[]) => {
//     selectedRowKeys.value = keys;
//     let select = (dataSource.value ?? []).find(
//       (item) => item._rowKey === selectedRowKeys.value[0],
//     );
//     console.log('select', select);
//     emit('sync-table', select);
//   },
// }));
const tmpAdd = ref(false);
const tmpDel = ref(false);

const [Grid, gridApi] = useVbenVxeGrid<ChangeOrderAdminApi.ChangeOrderEditDto>({
  gridOptions: {
    columns: useColumns(),
    height: '300px',
    keepSource: true,
    radioConfig: {
      highlight: true,
      trigger: 'row',
    },
    rowConfig: {
      keyField: '_rowKey',
    },
    pagerConfig: {
      enabled: false,
    },
    proxyConfig: {
      ajax: {
        query: async () => {
          console.log('addRowData', tmpAdd.value);
          if (tmpAdd.value) {
            tmpAdd.value = false;
            console.log('addRowDataing');
            addRowData();
            return dataSource.value;
          }
          if (tmpDel.value) {
            tmpDel.value = false;
            return dataSource.value;
          }
          await getTableData();
          return dataSource.value;
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
    cellDblclick: handleRowDblclick,
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
// 方法4：一行代码版本
const getCurrentYearMonth4 = () => {
  return new Date().toISOString().slice(0, 7);
};

let rowKeyCounter = 0;

const addRowData = () => {
  const list = [...(dataSource.value ?? [])];
  let id = `co_${++rowKeyCounter}_${Date.now()}`;
  list.push({
    _rowKey: id,
    accountDate: dayjs().format('YYYY-MM'),
    feeLockedTime: '',
    lastModificationTime: '',
    creationTime: '',
  } as any);
  dataSource.value = list;
  //selectedRowKeys.value = [id];
};
const addRow = () => {
  tmpAdd.value = true;
  gridApi.query();
};
const delRow = () => {
  tmpDel.value = true;
  gridApi.query();
};
const saveRow = () => {
  console.log('saveRow', dataSource.value);
  emit('save-change-order');
};
const removeSelectedRows = async () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const needDelIds = (dataSource.value ?? [])
    .filter((row) => keysSet.has((row as any)._rowKey))
    .filter((row) => (row as any).id !== undefined)
    .map((row) => (row as any).id);
  console.log(needDelIds);
  if (needDelIds.length > 0) {
    await DeleteAsync(needDelIds);
  }

  const list = (dataSource.value ?? []).filter(
    (row) => !keysSet.has((row as any)._rowKey),
  );
  dataSource.value = list;
  selectedRowKeys.value = [];
  delRow();
};

/**  每项添加 _rowKey，供 Table 使用 */
const normalizeChangeOrderWithRowKey = (
  items: ChangeOrderAdminApi.ChangeOrderDto[] | undefined,
) => {
  if (!items?.length) return [];
  return items.map((item, i) => ({
    ...item,
    accountDate: dayjs(item.accountDate).format('YYYY-MM'),
    _rowKey: `co_${i}_${Date.now()}`,
  })) as any[];
};
const getTableData = async () => {
  const res = await GetPagedList({
    PageIndex: 1,
    PageSize: 100,
    Sorting: 'Id',
  });
  console.log(res);
  dataSource.value = normalizeChangeOrderWithRowKey(res.items);
  // if (dataSource.value.length > 0)
  //   selectedRowKeys.value = [dataSource?.value[0]?._rowKey];
};
// const updateRow = (
//   index: number,
//   field: keyof ChangeOrderAdminApi.ChangeOrderEditDto,
//   value: any,
// ) => {
//   const list = [...(dataSource.value ?? [])];
//   list[index] = { ...list[index], [field]: value };
//   dataSource.value = list;

//   console.log('updateRow', list[index]);
//   emit('sync-table', list[index]);
// };

watch(
  () => dataSource.value,
  (val) => {
    if (val === undefined || val === null) {
      dataSource.value = [];
    }
    const keys = new Set((val ?? []).map((r) => (r as any)._rowKey));
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => keys.has(k));
  },
  { immediate: true },
);

onMounted(() => {
  // getTableData();
});
</script>

<template>
  <Card class="change-order-fee-card">
    <div class="px-1">
      <Grid :table-title="$t('seaExport.export.changeOrder.title')">
        <template #toolbar-tools>
          <Space>
            <Button type="primary" @click="addRow">
              {{ $t('common.create') }}
            </Button>
            <Button type="primary" @click="saveRow">
              {{ $t('common.save') }}
            </Button>
            <Button danger @click="removeSelectedRows">
              {{ $t('common.delete') }}
            </Button>
          </Space>
        </template>
      </Grid>
    </div>
  </Card>
</template>
<style scoped lang="scss">
.change-order-fee-card {
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
