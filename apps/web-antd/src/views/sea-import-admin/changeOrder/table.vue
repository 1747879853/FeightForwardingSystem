<script lang="ts" setup>
import type { ChangeOrderAdminApi } from '#/api/sea-import/change-order-admin';

import { GetPagedList, DeleteAsync } from '#/api/sea-import/change-order-admin';
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

const modelValue = defineModel<ChangeOrderAdminApi.ChangeOrderEditDto[]>({
  default: () => [],
});

const selectedRowKeys = ref<(string | number)[]>([]);

const dataSource = computed({
  get: () => modelValue.value ?? [],
  set: (val) => {
    modelValue.value = val;
  },
});

const rowSelection = computed(() => ({
  type: 'radio',
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys;
    let select = (dataSource.value ?? []).find(
      (item) => item._rowKey === selectedRowKeys.value[0],
    );
    console.log('select', select);
    emit('sync-table', select);
  },
}));
// 方法4：一行代码版本
const getCurrentYearMonth4 = () => {
  return new Date().toISOString().slice(0, 7);
};

let rowKeyCounter = 0;
const addRow = () => {
  const list = [...(modelValue.value ?? [])];
  let id = `co_${++rowKeyCounter}_${Date.now()}`;
  list.push({ _rowKey: id, accountDate: dayjs().format('YYYY-MM') } as any);
  console.log(list);
  modelValue.value = list;
  console.log(modelValue.value);
  console.log(dataSource.value);
  selectedRowKeys.value = [id];
};

const removeSelectedRows = async () => {
  if (!selectedRowKeys.value.length) return;
  const keysSet = new Set(selectedRowKeys.value);
  const needDelIds = (dataSource.value ?? [])
    .filter((row) => keysSet.has((row as any)._rowKey))
    .filter((row) => (row as any).id !== 0)
    .map((row) => (row as any).id);
  console.log(needDelIds);
  await DeleteAsync(needDelIds);
  const list = (modelValue.value ?? []).filter(
    (row) => !keysSet.has((row as any)._rowKey),
  );
  modelValue.value = list;
  selectedRowKeys.value = [];
};
const emit = defineEmits(['sync-table']);

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
const updateRow = (
  index: number,
  field: keyof ChangeOrderAdminApi.ChangeOrderEditDto,
  value: any,
) => {
  const list = [...(modelValue.value ?? [])];
  list[index] = { ...list[index], [field]: value };
  modelValue.value = list;

  console.log('updateRow', list[index]);
  emit('sync-table', list[index]);
};

const toSelectedItems = (id: any, name: any, labelKey = 'name') => {
  if (id == null) return [];
  return [{ id, [labelKey]: name || '' }] as any[];
};

watch(
  () => modelValue.value,
  (val) => {
    if (val === undefined || val === null) {
      modelValue.value = [];
    }
    const keys = new Set((val ?? []).map((r) => (r as any)._rowKey));
    selectedRowKeys.value = selectedRowKeys.value.filter((k) => keys.has(k));
  },
  { immediate: true },
);

defineExpose({
  addRow,
  removeSelectedRows,
});

onMounted(() => {
  getTableData();
});
</script>

<template>
  <Table
    :data-source="dataSource"
    :row-selection="rowSelection"
    :pagination="false"
    size="small"
    bordered
    :scroll="{ x: 1700 }"
    row-key="_rowKey"
  >
    <template #bodyCell="{ column, record, index }">
      <template v-if="column.key === 'accountDate'">
        <span>{{ record.accountDate }}</span>
      </template>

      <template v-if="column.key === 'reason'">
        <Input
          :value="record.reason"
          :placeholder="$t('seaImport.import.changeOrder.reason')"
          allow-clear
          @update:value="(v) => updateRow(index, 'reason', v)"
        />
      </template>
      <template v-if="column.key === 'remark'">
        <Input
          :value="record.remark"
          :placeholder="$t('seaImport.import.remark')"
          allow-clear
          @update:value="(v) => updateRow(index, 'remark', v)"
        />
      </template>
      <template v-if="column.key === 'lastModificationTime'">
        <span>{{
          dayjs(record.lastModificationTime).format('YYYY-MM-DD HH:mm')
        }}</span>
      </template>
      <template v-if="column.key === 'creationTime'">
        <span>{{ dayjs(record.creationTime).format('YYYY-MM-DD HH:mm') }}</span>
      </template>
    </template>
    <Table.Column
      key="accountDate"
      :title="$t('seaImport.import.accountDate')"
      width="100"
    />
    <Table.Column
      key="reason"
      :title="$t('seaImport.import.changeOrder.reason')"
      width="500"
    />
    <Table.Column
      key="remark"
      :title="$t('seaImport.import.remark')"
      width="130"
    />
    <Table.Column
      key="feeLocked"
      :title="$t('seaImport.import.changeOrder.feeLocked')"
      width="80"
    />
    <Table.Column
      key="feeLockedUserName"
      :title="$t('seaImport.import.changeOrder.feeLockedUserName')"
      width="100"
    />
    <Table.Column
      key="feeLockedTime"
      :title="$t('seaImport.import.changeOrder.feeLockedTime')"
      width="90"
    />
    <Table.Column
      key="feeUnLockedUserName"
      :title="$t('seaImport.import.changeOrder.feeUnLockedUserName')"
      width="90"
    />
    <Table.Column
      key="lastModificationTime"
      :title="$t('seaImport.import.changeOrder.lastModificationTime')"
      width="90"
    />
    <Table.Column
      key="creationTime"
      :title="$t('seaImport.import.changeOrder.creationTime')"
      width="100"
    />
  </Table>
</template>
