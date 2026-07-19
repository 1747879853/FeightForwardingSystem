<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';

import { computed, onMounted, onUnmounted, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import {
  Button,
  Card,
  DropdownButton,
  Input,
  Menu,
  MenuItem,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { getBankStatementReceiveSettlementPagedList } from '#/api/settlement-management/bank-statement-admin';

import {
  formatAmount,
  formatDateTime,
  getReceiveSettlementStatusColor,
  getReceiveSettlementStatusLabel,
  getReceiveSettlementTypeColor,
  getReceiveSettlementTypeLabel,
} from '../form-data';

const props = defineProps<{
  bankStatementId: string;
  canCreateSettlement?: boolean;
  currencyCode?: string;
  remainingAmount: number;
}>();

const emit = defineEmits<{
  create: [mode: 'fee' | 'invoice'];
  edit: [row: BankStatementAdminApi.ReceiveSettlementListDto];
}>();

const settlementList = ref<BankStatementAdminApi.ReceiveSettlementListDto[]>(
  [],
);
const loading = ref(false);
const total = ref(0);
const currentPage = ref(1);
const pageSize = ref(10);
const settlementNoFilter = ref('');
let searchTimer: ReturnType<typeof setTimeout> | undefined;

const isFiltering = computed(() => Boolean(settlementNoFilter.value.trim()));
const tablePagination = computed(() => {
  if (total.value <= pageSize.value) return false;
  return {
    current: currentPage.value,
    pageSize: pageSize.value,
    total: total.value,
    showSizeChanger: true,
    showTotal: (value: number) => `共 ${value} 张核销单`,
    onChange: handlePageChange,
  };
});

const columns = [
  {
    key: 'settlementNo',
    dataIndex: 'settlementNo',
    title: '核销单号',
    minWidth: 180,
    ellipsis: true,
  },
  {
    key: 'type',
    dataIndex: 'type',
    title: '核销方式',
    width: 110,
  },
  {
    key: 'status',
    dataIndex: 'status',
    title: '状态',
    width: 96,
  },
  {
    key: 'totalSettledAmount',
    dataIndex: 'totalSettledAmount',
    title: '核销金额',
    width: 150,
    align: 'right' as const,
  },
  {
    key: 'itemCount',
    dataIndex: 'itemCount',
    title: '明细',
    width: 80,
    align: 'right' as const,
  },
  {
    key: 'settlementTime',
    dataIndex: 'settlementTime',
    title: '核销时间',
    width: 150,
    customRender: ({ text }: { text: string }) => formatDateTime(text),
  },
  {
    key: 'creatorUserName',
    dataIndex: 'creatorUserName',
    title: '创建人',
    width: 110,
    ellipsis: true,
  },
  {
    key: 'remark',
    dataIndex: 'remark',
    title: '备注',
    minWidth: 160,
    ellipsis: true,
  },
];

function formatSettlementAmount(value: number | undefined | null) {
  const amountText = formatAmount(value ?? 0);
  return props.currencyCode
    ? `${amountText} ${props.currencyCode}`
    : amountText;
}

async function loadReceiveSettlements() {
  if (!props.bankStatementId) return;
  loading.value = true;
  try {
    const result = await getBankStatementReceiveSettlementPagedList({
      bankStatementId: props.bankStatementId,
      settlementNo: settlementNoFilter.value.trim() || undefined,
      pageIndex: currentPage.value,
      pageSize: pageSize.value,
    });
    settlementList.value = result.items ?? [];
    total.value = result.totalCount ?? 0;
  } finally {
    loading.value = false;
  }
}

function handleSearch() {
  currentPage.value = 1;
  loadReceiveSettlements();
}

function clearSearch() {
  settlementNoFilter.value = '';
  handleSearch();
}

function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  loadReceiveSettlements();
}

function openSettlement(row: Record<string, any>) {
  emit('edit', row as BankStatementAdminApi.ReceiveSettlementListDto);
}

function requestCreate(mode: 'fee' | 'invoice') {
  emit('create', mode);
}

function handleCreateMenu({ key }: { key: string | number }) {
  requestCreate(String(key) === 'invoice' ? 'invoice' : 'fee');
}

watch(settlementNoFilter, () => {
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(handleSearch, 300);
});

onMounted(loadReceiveSettlements);
onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer);
});

defineExpose({
  refresh: loadReceiveSettlements,
});
</script>

<template>
  <Card size="small" class="settlement-card">
    <template #title>
      <div class="settlement-card__title">
        <span>关联核销单</span>
        <span class="settlement-card__count">{{ total }}</span>
      </div>
    </template>

    <template #extra>
      <div class="settlement-toolbar">
        <Input
          v-model:value="settlementNoFilter"
          placeholder="搜索核销单号"
          allow-clear
          class="settlement-search"
          @press-enter="handleSearch"
        >
          <template #prefix>
            <IconifyIcon icon="mdi:magnify" class="size-4 text-gray-400" />
          </template>
        </Input>

        <DropdownButton
          v-if="canCreateSettlement"
          type="primary"
          @click="requestCreate('fee')"
        >
          新建核销
          <template #overlay>
            <Menu @click="handleCreateMenu">
              <MenuItem key="fee">按费用核销</MenuItem>
              <MenuItem key="invoice">按开票申请核销</MenuItem>
            </Menu>
          </template>
        </DropdownButton>
      </div>
    </template>

    <div
      v-if="!loading && settlementList.length === 0"
      class="settlement-empty"
    >
      <div class="settlement-empty__icon">
        <IconifyIcon
          :icon="
            isFiltering
              ? 'mdi:file-search-outline'
              : 'mdi:clipboard-text-outline'
          "
          class="size-6"
        />
      </div>
      <div class="settlement-empty__content">
        <h3>{{ isFiltering ? '未找到匹配的核销单' : '暂无关联核销单' }}</h3>
        <p v-if="isFiltering">换一个核销单号，或清除搜索条件后重试。</p>
        <p v-else>
          当前剩余可核销
          <strong>{{ formatSettlementAmount(remainingAmount) }}</strong>
        </p>
        <div class="settlement-empty__actions">
          <Button v-if="isFiltering" size="small" @click="clearSearch">
            清除搜索
          </Button>
          <template v-else-if="canCreateSettlement">
            <Button size="small" @click="requestCreate('fee')">
              按费用核销
            </Button>
            <Button size="small" @click="requestCreate('invoice')">
              按开票申请核销
            </Button>
          </template>
        </div>
      </div>
    </div>

    <Table
      v-else
      :columns="columns"
      :data-source="settlementList"
      :loading="loading"
      :pagination="tablePagination"
      :custom-row="
        (record) => ({
          onDblclick: () => openSettlement(record),
          title: '双击查看或编辑核销单',
        })
      "
      row-key="id"
      size="small"
      :scroll="{ x: 1150 }"
      class="settlement-table"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'type'">
          <Tag :color="getReceiveSettlementTypeColor(record.type)">
            {{ getReceiveSettlementTypeLabel(record.type) }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'status'">
          <Tag :color="getReceiveSettlementStatusColor(record.status)">
            {{ getReceiveSettlementStatusLabel(record.status) }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'settlementNo'">
          <Tooltip :title="`双击查看或编辑核销单 ${record.settlementNo || ''}`">
            <span class="settlement-no">{{ record.settlementNo || '-' }}</span>
          </Tooltip>
        </template>
        <template v-else-if="column.key === 'totalSettledAmount'">
          <span class="settlement-amount">
            {{ formatSettlementAmount(record.totalSettledAmount) }}
          </span>
        </template>
        <template v-else-if="column.key === 'itemCount'">
          {{ record.itemCount ?? 0 }} 条
        </template>
        <template v-else-if="column.key === 'remark'">
          <Tooltip v-if="record.remark" :title="record.remark">
            <span class="ellipsis-cell">{{ record.remark }}</span>
          </Tooltip>
          <span v-else>-</span>
        </template>
      </template>
    </Table>
  </Card>
</template>

<style scoped lang="scss">
.settlement-card {
  min-width: 0;
  border-color: #e3e8ef;

  :deep(.ant-card-head) {
    min-height: 56px;
    padding-inline: 20px;
    background: #fbfcfe;
  }

  :deep(.ant-card-body) {
    padding: 0;
  }
}

.settlement-card__title {
  display: flex;
  gap: 8px;
  align-items: center;
  font-weight: 600;
  color: #202936;
}

.settlement-card__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 20px;
  padding-inline: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #667487;
  background: #eef2f6;
  border-radius: 10px;
}

.settlement-toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
}

.settlement-search {
  width: 220px;
}

.settlement-empty {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: center;
  min-height: 220px;
  padding: 52px 24px;
  color: #5d6b7c;
}

.settlement-empty__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  color: #7a8797;
  background: #f0f3f7;
  border-radius: 50%;
}

.settlement-empty__content {
  h3 {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 600;
    color: #303b49;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #7a8797;
  }

  strong {
    font-variant-numeric: tabular-nums;
    color: #c56a08;
  }
}

.settlement-empty__actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.settlement-table {
  :deep(.ant-table-thead > tr > th) {
    color: #667487;
    background: #f7f9fb;
  }

  :deep(.ant-table-tbody > tr) {
    cursor: pointer;
  }

  :deep(.ant-table-pagination) {
    margin-inline: 20px;
  }
}

.settlement-no {
  font-weight: 500;
  color: #1677ff;
}

.settlement-amount {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: #283442;
}

.ellipsis-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .settlement-card {
    :deep(.ant-card-head) {
      align-items: flex-start;
      padding-block: 12px;
    }

    :deep(.ant-card-extra) {
      width: 100%;
      padding-top: 8px;
      margin-inline-start: 0;
    }
  }

  .settlement-toolbar {
    width: 100%;
  }

  .settlement-search {
    flex: 1;
    width: auto;
  }
}
</style>
