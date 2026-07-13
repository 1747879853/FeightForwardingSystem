<script lang="ts" setup>
import type { BankStatementAdminApi } from '#/api/settlement-management/bank-statement-admin';

import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRouter } from 'vue-router';

import { useAccess } from '@vben/access';

import {
  Button,
  Card,
  Input,
  message,
  Modal,
  Space,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { getBankStatementReceiveSettlementPagedList } from '#/api/settlement-management/bank-statement-admin';
import {
  deleteReceiveSettlement,
  deleteReceiveSettlementItems,
  getReceiveSettlementDetail,
} from '#/api/settlement-management/receive-settlement-admin';
import { createAbpPermission } from '#/utils/abp-permission';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import {
  getReceiveSettlementStatusColor,
  getReceiveSettlementStatusLabel,
  isReceiveSettlementLocked,
  useReceiveSettlementColumns,
  useReceiveSettlementItemReadonlyColumns,
} from '../form-data';
import { mapReceiveSettlementDetailItem } from '../utils';

const props = defineProps<{
  bankStatementId: string;
}>();

const emit = defineEmits<{
  deleted: [];
}>();

const router = useRouter();
const perm = createAbpPermission('Admin.ReceiveSettlement');
const { hasAccessByCodes } = useAccess();

const canDeleteSettlement = computed(() => hasAccessByCodes([perm.delete]));
const canDeleteItems = computed(() => hasAccessByCodes([perm.edit]));
const canDelete = computed(
  () => canDeleteSettlement.value || canDeleteItems.value,
);

const settlementList = ref<BankStatementAdminApi.ReceiveSettlementListDto[]>(
  [],
);
const settlementLoading = ref(false);
const deleteLoading = ref(false);
const settlementTotal = ref(0);
const settlementPage = ref(1);
const settlementPageSize = ref(10);
const settlementNoFilter = ref('');

const expandedRowKeys = ref<string[]>([]);
const selectedSettlementRowKeys = ref<string[]>([]);
const selectedItemIdsBySettlement = ref<Record<string, string[]>>({});
const detailLoadingMap = ref<Record<string, boolean>>({});
const detailItemsMap = ref<
  Record<string, ReturnType<typeof mapReceiveSettlementDetailItem>[]>
>({});

const receiveSettlementColumns = useReceiveSettlementColumns();
const itemReadonlyColumns = useReceiveSettlementItemReadonlyColumns();

const tableWrapRef = ref<HTMLElement>();
const tableScrollY = ref<number>();

let tableWrapResizeObserver: ResizeObserver | undefined;

function syncTableScrollY() {
  const wrap = tableWrapRef.value;
  if (!wrap) return;
  const paginationHeight = 48;
  const tableHeaderHeight = 39;
  tableScrollY.value = Math.max(
    wrap.clientHeight - paginationHeight - tableHeaderHeight,
    120,
  );
}

function setupTableWrapResizeObserver() {
  tableWrapResizeObserver?.disconnect();
  if (!tableWrapRef.value) return;
  tableWrapResizeObserver = new ResizeObserver(() => {
    syncTableScrollY();
  });
  tableWrapResizeObserver.observe(tableWrapRef.value);
  syncTableScrollY();
}

const tableScroll = computed(() =>
  tableScrollY.value ? { y: tableScrollY.value } : undefined,
);

const hasSelectedItems = computed(() =>
  Object.values(selectedItemIdsBySettlement.value).some(
    (ids) => ids.length > 0,
  ),
);

const hasSelection = computed(
  () => hasSelectedItems.value || selectedSettlementRowKeys.value.length > 0,
);

const settlementRowSelection = computed(() => {
  if (!canDeleteSettlement.value) return undefined;
  return {
    selectedRowKeys: selectedSettlementRowKeys.value,
    onChange: (keys: (string | number)[]) => {
      selectedSettlementRowKeys.value = keys.map(String);
    },
    getCheckboxProps: (
      record: BankStatementAdminApi.ReceiveSettlementListDto,
    ) => ({
      disabled: isReceiveSettlementLocked(record.locked),
    }),
  };
});

function getItemRowSelection(settlementId: string, locked?: boolean) {
  if (!canDeleteItems.value || isReceiveSettlementLocked(locked))
    return undefined;
  return {
    selectedRowKeys: selectedItemIdsBySettlement.value[settlementId] ?? [],
    onChange: (keys: (string | number)[]) => {
      selectedItemIdsBySettlement.value = {
        ...selectedItemIdsBySettlement.value,
        [settlementId]: keys.map(String),
      };
    },
  };
}

function clearSelection() {
  selectedSettlementRowKeys.value = [];
  selectedItemIdsBySettlement.value = {};
}

function getItemSelections() {
  return Object.entries(selectedItemIdsBySettlement.value)
    .filter(([, itemIds]) => itemIds.length > 0)
    .map(([settlementId, itemIds]) => ({ settlementId, itemIds }));
}

function markReceiveSettlementRelatedListsShouldRefresh() {
  markListShouldRefresh('ReceiveSettlementList');
  markListShouldRefresh('BankStatementList');
}

async function refreshSettlementDetail(settlementId: string) {
  const detail = await getReceiveSettlementDetail(settlementId);
  detailItemsMap.value = {
    ...detailItemsMap.value,
    [settlementId]: (detail.receiveSettlementItems || []).map((item) =>
      mapReceiveSettlementDetailItem(item),
    ),
  };
}

async function refreshExpandedSettlementDetails(settlementIds: string[]) {
  const expandedIds = settlementIds.filter((id) =>
    expandedRowKeys.value.includes(id),
  );
  if (expandedIds.length === 0) return;

  await Promise.all(
    expandedIds.map(async (settlementId) => {
      detailLoadingMap.value = {
        ...detailLoadingMap.value,
        [settlementId]: true,
      };
      try {
        await refreshSettlementDetail(settlementId);
      } finally {
        detailLoadingMap.value = {
          ...detailLoadingMap.value,
          [settlementId]: false,
        };
      }
    }),
  );
}

function removeSettlementDetailCache(settlementIds: string[]) {
  if (settlementIds.length === 0) return;
  const nextMap = { ...detailItemsMap.value };
  const nextItemSelection = { ...selectedItemIdsBySettlement.value };
  for (const settlementId of settlementIds) {
    delete nextMap[settlementId];
    delete nextItemSelection[settlementId];
  }
  detailItemsMap.value = nextMap;
  selectedItemIdsBySettlement.value = nextItemSelection;
  expandedRowKeys.value = expandedRowKeys.value.filter(
    (id) => !settlementIds.includes(id),
  );
}

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
    await nextTick();
    syncTableScrollY();
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

function shouldIgnoreSettlementRowDblClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return true;

  return Boolean(
    target.closest(
      '.ant-table-row-expand-icon, .ant-table-row-expand-icon-cell, .ant-table-cell-with-append, .ant-checkbox-wrapper, .ant-checkbox',
    ),
  );
}

function handleReceiveSettlementRowDblClick(
  row: BankStatementAdminApi.ReceiveSettlementListDto,
  event: MouseEvent,
) {
  if (shouldIgnoreSettlementRowDblClick(event)) return;
  router.push(`/settlement-management/receive-settlement/edit/${row.id}`);
}

async function handleExpand(expanded: boolean, record: { id: string }) {
  if (!expanded) return;
  if (detailItemsMap.value[record.id]) return;

  detailLoadingMap.value = {
    ...detailLoadingMap.value,
    [record.id]: true,
  };
  try {
    await refreshSettlementDetail(record.id);
  } finally {
    detailLoadingMap.value = {
      ...detailLoadingMap.value,
      [record.id]: false,
    };
  }
}

function handleDelete() {
  const itemSelections = getItemSelections();
  const selectedRows = settlementList.value.filter((row) =>
    selectedSettlementRowKeys.value.includes(row.id),
  );

  if (itemSelections.length === 0 && selectedRows.length === 0) {
    message.warning('请先选择要删除的收费核销或费用明细');
    return;
  }

  if (
    itemSelections.length > 0 &&
    !canDeleteItems.value &&
    selectedRows.length > 0 &&
    !canDeleteSettlement.value
  ) {
    return;
  }

  if (itemSelections.length > 0 && !canDeleteItems.value) {
    message.warning('当前账号无删除费用明细权限');
    return;
  }

  if (selectedRows.length > 0 && !canDeleteSettlement.value) {
    message.warning('当前账号无删除收费核销权限');
    return;
  }

  if (selectedRows.some((row) => isReceiveSettlementLocked(row.locked))) {
    message.warning('选中的记录中有已锁定的收费核销，无法删除');
    return;
  }

  if (
    itemSelections.some(({ settlementId }) => {
      const settlement = settlementList.value.find(
        (row) => row.id === settlementId,
      );
      return settlement && isReceiveSettlementLocked(settlement.locked);
    })
  ) {
    message.warning('已锁定的收费核销不能删除明细');
    return;
  }

  const settlementIdsToDelete = new Set(selectedRows.map((row) => row.id));
  const pendingItemSelections = itemSelections.filter(
    ({ settlementId }) => !settlementIdsToDelete.has(settlementId),
  );
  const pendingItemCount = pendingItemSelections.reduce(
    (sum, item) => sum + item.itemIds.length,
    0,
  );

  const contentParts: string[] = [];
  if (pendingItemCount > 0) {
    contentParts.push(`${pendingItemCount} 条费用明细`);
  }
  if (selectedRows.length > 0) {
    contentParts.push(`${selectedRows.length} 条收费核销`);
  }

  Modal.confirm({
    title: '确认删除',
    content: `确定要删除选中的 ${contentParts.join('和')}吗？`,
    okType: 'danger',
    onOk: async () => {
      deleteLoading.value = true;
      try {
        if (pendingItemSelections.length > 0) {
          await Promise.all(
            pendingItemSelections.map(({ settlementId, itemIds }) =>
              deleteReceiveSettlementItems({
                id: settlementId,
                receiveSettlementItemIds: itemIds,
              }),
            ),
          );
        }

        if (selectedRows.length > 0) {
          await Promise.all(
            selectedRows.map((row) => deleteReceiveSettlement({ id: row.id })),
          );
          removeSettlementDetailCache(selectedRows.map((row) => row.id));
        }

        const affectedSettlementIds = [
          ...new Set([
            ...pendingItemSelections.map(({ settlementId }) => settlementId),
            ...selectedRows.map((row) => row.id),
          ]),
        ];

        clearSelection();
        await loadReceiveSettlements();
        await refreshExpandedSettlementDetails(affectedSettlementIds);
        markReceiveSettlementRelatedListsShouldRefresh();
        emit('deleted');

        if (pendingItemCount > 0 && selectedRows.length > 0) {
          message.success('删除成功');
        } else if (pendingItemCount > 0) {
          message.success('删除明细成功');
        } else {
          message.success('删除成功');
        }
      } catch (error: any) {
        message.error(error.message || '删除失败');
      } finally {
        deleteLoading.value = false;
      }
    },
  });
}

function getOtherSettledAmount() {
  return settlementList.value.reduce(
    (sum, item) => sum + (item.totalSettledAmount || 0),
    0,
  );
}

onMounted(async () => {
  await loadReceiveSettlements();
  await nextTick();
  setupTableWrapResizeObserver();
});

onUnmounted(() => {
  tableWrapResizeObserver?.disconnect();
});

defineExpose({
  refresh: loadReceiveSettlements,
  getOtherSettledAmount,
});
</script>

<template>
  <Card title="关联收费核销" size="small" class="form-panel-card">
    <template #extra>
      <Space>
        <Button
          v-if="canDelete"
          size="small"
          danger
          :disabled="!hasSelection"
          :loading="deleteLoading"
          @click="handleDelete"
        >
          删除
        </Button>
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

    <div ref="tableWrapRef" class="settlement-table-wrap">
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
        :scroll="tableScroll"
        :row-selection="settlementRowSelection"
        :custom-row="
          (record) => ({
            onDblclick: (event) =>
              handleReceiveSettlementRowDblClick(record, event),
          })
        "
        @expand="handleExpand"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <Tag :color="getReceiveSettlementStatusColor(record.status)">
              {{ getReceiveSettlementStatusLabel(record.status) }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'locked'">
            <Tag
              :color="
                isReceiveSettlementLocked(record.locked) ? 'red' : 'green'
              "
            >
              {{
                isReceiveSettlementLocked(record.locked) ? '已锁定' : '未锁定'
              }}
            </Tag>
          </template>
          <template v-else-if="column.key === 'remark'">
            <Tooltip
              v-if="record.remark"
              :title="record.remark"
              placement="topLeft"
            >
              <span class="settlement-ellipsis-cell">{{ record.remark }}</span>
            </Tooltip>
            <span v-else>-</span>
          </template>
          <template v-else-if="column.key === 'settlementNo'">
            <Tooltip
              v-if="record.settlementNo"
              :title="record.settlementNo"
              placement="topLeft"
            >
              <span class="settlement-ellipsis-cell">{{
                record.settlementNo
              }}</span>
            </Tooltip>
            <span v-else>-</span>
          </template>
        </template>

        <template #expandedRowRender="{ record }">
          <Table
            class="settlement-item-table"
            :columns="itemReadonlyColumns"
            :data-source="detailItemsMap[record.id] ?? []"
            :loading="detailLoadingMap[record.id]"
            :pagination="false"
            row-key="id"
            size="small"
            bordered
            :row-selection="
              getItemRowSelection(
                record.id,
                isReceiveSettlementLocked(record.locked),
              )
            "
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
    </div>
  </Card>
</template>

<style scoped lang="scss">
.form-panel-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100%;

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  :deep(.ant-table-wrapper) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.ant-spin-nested-loading),
  :deep(.ant-spin-container) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .settlement-table-wrap {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;

    :deep(.ant-table) {
      table-layout: fixed;
    }

    :deep(.ant-table-content) {
      overflow-x: hidden !important;
    }

    :deep(.ant-table-thead > tr > th) {
      white-space: nowrap;
    }
  }

  :deep(.settlement-item-table .ant-table) {
    table-layout: fixed;
  }

  :deep(.settlement-item-table .ant-table-content) {
    overflow-x: hidden !important;
  }

  :deep(.settlement-item-table .ant-table-thead > tr > th) {
    white-space: nowrap;
  }

  :deep(.ant-table-body) {
    overflow: auto !important;
    overflow-x: hidden !important;
  }

  :deep(.ant-table-pagination) {
    flex-shrink: 0;
    padding-top: 12px;
    margin-top: auto;
  }
}

.settlement-ellipsis-cell {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: bottom;
  white-space: nowrap;
}
</style>
