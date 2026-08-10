<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';

import { ref } from 'vue';

import {
  Button,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
} from 'ant-design-vue';

import { getBankStatementPagedListByPermission } from '#/api/settlement-management/bank-statement-admin';

import { formatAmount, formatDateTime } from '../form-data';

const emit = defineEmits<{
  select: [row: BankStatementAdminApi.BankStatementListDto];
}>();

const open = ref(false);
const loading = ref(false);
const selectedRow = ref<BankStatementAdminApi.BankStatementListDto>();
const list = ref<BankStatementAdminApi.BankStatementListDto[]>([]);
const total = ref(0);
const page = ref(1);
const pageSize = ref(10);
const bankStatementNo = ref('');

const columns = [
  {
    dataIndex: 'bankStatementNo',
    title: '银行流水号',
    width: 170,
    fixed: 'left' as const,
  },
  {
    dataIndex: 'statementTime',
    title: '交易时间',
    width: 150,
    customRender: ({ text }: { text: string }) => formatDateTime(text),
  },
  {
    dataIndex: 'amount',
    title: '总金额',
    width: 120,
    align: 'right' as const,
    customRender: ({ text }: { text: number }) => formatAmount(text),
  },
  {
    dataIndex: 'currencyCode',
    title: '币别',
    width: 80,
  },
  {
    dataIndex: 'settlementName',
    title: '付款方',
    minWidth: 150,
    customRender: ({
      record,
    }: {
      record: BankStatementAdminApi.BankStatementListDto;
    }) => record.settlement?.name || '-',
  },
  {
    dataIndex: 'creatorUserName',
    title: '创建人',
    width: 100,
  },
  {
    dataIndex: 'creationTime',
    title: '创建时间',
    width: 150,
    customRender: ({ text }: { text: string }) => formatDateTime(text),
  },
];

async function loadData() {
  loading.value = true;
  try {
    const result = await getBankStatementPagedListByPermission({
      bankStatementNo: bankStatementNo.value || undefined,
      pageIndex: page.value,
      pageSize: pageSize.value,
    });
    list.value = result.items ?? [];
    total.value = result.totalCount ?? 0;
  } finally {
    loading.value = false;
  }
}

function show() {
  open.value = true;
  selectedRow.value = undefined;
  page.value = 1;
  loadData();
}

function handleSearch() {
  page.value = 1;
  loadData();
}

function handlePageChange(current: number, size: number) {
  page.value = current;
  pageSize.value = size;
  loadData();
}

function handleConfirm() {
  if (!selectedRow.value) {
    message.warning('请先选择银行流水');
    return;
  }
  emit('select', selectedRow.value);
  open.value = false;
}

function selectRow(row: BankStatementAdminApi.BankStatementListDto) {
  selectedRow.value = row;
}

function selectAndConfirm(row: BankStatementAdminApi.BankStatementListDto) {
  selectedRow.value = row;
  handleConfirm();
}

defineExpose({ open: show });
</script>

<template>
  <Modal
    v-model:open="open"
    title="选择银行流水"
    width="980px"
    destroy-on-close
    @ok="handleConfirm"
  >
    <Space class="mb-3">
      <Input
        v-model:value="bankStatementNo"
        placeholder="银行流水号模糊搜索"
        allow-clear
        style="width: 220px"
        @press-enter="handleSearch"
      />
      <Button @click="handleSearch">查询</Button>
    </Space>

    <Table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="{
        current: page,
        pageSize,
        total,
        showSizeChanger: true,
        showTotal: (count) => `共 ${count} 条`,
        onChange: handlePageChange,
      }"
      :row-key="(record) => record.id"
      :row-selection="{
        type: 'radio',
        selectedRowKeys: selectedRow ? [selectedRow.id] : [],
        onSelect: selectRow,
      }"
      :custom-row="
        (record) => ({
          onDblclick: () => selectAndConfirm(record),
          onClick: () => selectRow(record),
        })
      "
      size="small"
      bordered
      :scroll="{ x: 1000 }"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'currencyCode'">
          <Tag v-if="record.currency?.code">{{ record.currency?.code }}</Tag>
          <span v-else>-</span>
        </template>
      </template>
    </Table>
  </Modal>
</template>
