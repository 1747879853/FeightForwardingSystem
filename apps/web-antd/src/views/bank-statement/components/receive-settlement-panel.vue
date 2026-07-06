<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';

import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { Button, Card, Input, Space, Table, Tag } from 'ant-design-vue';

import { getBankStatementReceiveSettlementPagedList } from '#/api/settlement-management/bank-statement-admin';
import { getReceiveSettlementDetail } from '#/api/settlement-management/receive-settlement-admin';

import {
  getReceiveSettlementStatusColor,
  getReceiveSettlementStatusLabel,
  useReceiveSettlementColumns,
  useReceiveSettlementItemReadonlyColumns,
} from '../form-data';
import { mapReceiveSettlementDetailItem } from '../utils';

const props = defineProps<{
  bankStatementId: string;
}>();

const router = useRouter();

const settlementList = ref<BankStatementAdminApi.ReceiveSettlementListDto[]>(
  [],
);
const settlementLoading = ref(false);
const settlementTotal = ref(0);
const settlementPage = ref(1);
const settlementPageSize = ref(10);
const settlementNoFilter = ref('');

const expandedRowKeys = ref<string[]>([]);
const detailLoadingMap = ref<Record<string, boolean>>({});
const detailItemsMap = ref<
  Record<string, ReturnType<typeof mapReceiveSettlementDetailItem>[]>
>({});

const receiveSettlementColumns = useReceiveSettlementColumns();
const itemReadonlyColumns = useReceiveSettlementItemReadonlyColumns();

async function loadReceiveSettlements() {
  if (!props.bankStatementId) return;
  settlementLoading.value = true;
  try {
    const res = await getBankStatementReceiveSettlementPagedList({
      bankStatementId: props.bankStatementId,
      settlementNo: settlementNoFilter.value || undefined,
      pageIndex: settlementPage.value,
      pageSize: settlementPageSize.value,
    });
    settlementList.value = res.items || [];
    settlementTotal.value = res.totalCount || 0;
  } finally {
    settlementLoading.value = false;
  }
}

function handleSettlementPageChange(page: number, pageSize: number) {
  settlementPage.value = page;
  settlementPageSize.value = pageSize;
  loadReceiveSettlements();
}

function handleSettlementSearch() {
  settlementPage.value = 1;
  loadReceiveSettlements();
}

function handleReceiveSettlementRowDblClick(
  row: BankStatementAdminApi.ReceiveSettlementListDto,
) {
  router.push(`/settlement-management/receive-settlement/edit/${row.id}`);
}

async function handleExpand(expanded: boolean, record: { id: string }) {
  if (!expanded || detailItemsMap.value[record.id]) return;

  detailLoadingMap.value = {
    ...detailLoadingMap.value,
    [record.id]: true,
  };
  try {
    const detail = await getReceiveSettlementDetail(record.id);
    detailItemsMap.value = {
      ...detailItemsMap.value,
      [record.id]: (detail.receiveSettlementItems || []).map((item) =>
        mapReceiveSettlementDetailItem(item),
      ),
    };
  } finally {
    detailLoadingMap.value = {
      ...detailLoadingMap.value,
      [record.id]: false,
    };
  }
}

function getOtherSettledAmount() {
  return settlementList.value.reduce(
    (sum, item) => sum + (item.totalSettledAmount || 0),
    0,
  );
}

onMounted(() => {
  loadReceiveSettlements();
});

defineExpose({
  refresh: loadReceiveSettlements,
  getOtherSettledAmount,
});
</script>

<template>
  <Card title="关联收费结算" size="small" class="form-panel-card">
    <template #extra>
      <Space>
        <Input
          v-model:value="settlementNoFilter"
          placeholder="结算单号模糊搜索"
          allow-clear
          style="width: 200px"
          @press-enter="handleSettlementSearch"
        />
        <Button size="small" @click="handleSettlementSearch">查询</Button>
      </Space>
    </template>

    <Table
      :columns="receiveSettlementColumns"
      :data-source="settlementList"
      :loading="settlementLoading"
      :pagination="{
        current: settlementPage,
        pageSize: settlementPageSize,
        total: settlementTotal,
        showSizeChanger: true,
        showTotal: (total) => `共 ${total} 条`,
        onChange: handleSettlementPageChange,
      }"
      v-model:expanded-row-keys="expandedRowKeys"
      row-key="id"
      size="small"
      bordered
      :scroll="{ x: 1100 }"
      :custom-row="
        (record) => ({
          onDblclick: () => handleReceiveSettlementRowDblClick(record),
        })
      "
      @expand="handleExpand"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'status'">
          <Tag :color="getReceiveSettlementStatusColor(record.status)">
            {{ getReceiveSettlementStatusLabel(record.status) }}
          </Tag>
        </template>
        <template v-if="column.dataIndex === 'locked'">
          <Tag :color="record.locked ? 'red' : 'green'">
            {{ record.locked ? '已锁定' : '未锁定' }}
          </Tag>
        </template>
      </template>

      <template #expandedRowRender="{ record }">
        <Table
          :columns="itemReadonlyColumns"
          :data-source="detailItemsMap[record.id] ?? []"
          :loading="detailLoadingMap[record.id]"
          :pagination="false"
          row-key="id"
          size="small"
          bordered
          :scroll="{ x: 1210 }"
        >
          <template #bodyCell="{ column, record: item }">
            <template v-if="column.dataIndex === 'currencyCode'">
              <Tag v-if="item.currencyCode">{{ item.currencyCode }}</Tag>
              <span v-else>-</span>
            </template>
          </template>
        </Table>
      </template>
    </Table>
  </Card>
</template>

<style scoped lang="scss">
.form-panel-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
  }
}
</style>
