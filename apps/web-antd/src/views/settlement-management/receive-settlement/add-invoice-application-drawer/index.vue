<script lang="ts" setup>
import { createDrawerSelectionQuery } from '#/utils/drawer-selection-query';

import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { computed, nextTick, reactive, ref } from 'vue';

import {
  Button,
  Checkbox,
  Drawer,
  InputNumber,
  message,
  Pagination,
  Tag,
} from 'ant-design-vue';
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/form';
import { getInvoiceIssueGroupForSettlement } from '#/api/settlement-management/receive-settlement-admin';
import { NestedDataTable } from '#/components/nested-data-table';
import { toIsoEndOfDay, toIsoStartOfDay } from '#/utils/date-range-iso';

import {
  formatAmount,
  getPaySideColor,
  getPaySideLabel,
  toNetAmount,
} from '../form-data';
import {
  findFeeSettleableOverflow,
  remainingSharedSettleable,
} from '../settlement-amount';
import {
  type AddInvoiceDrawerProps,
  buildInvoiceGroupRow,
  invoiceGroupColumns,
  invoiceIssueFeeKey,
  invoiceItemColumns,
  type InvoiceItem,
  type SelectedInvoiceFee,
  useAddInvoiceSearchSchema,
} from './data';

const emit = defineEmits<{
  confirm: [fees: SelectedInvoiceFee[]];
}>();

const open = ref(false);
const loading = ref(false);
const drawerProps = ref<AddInvoiceDrawerProps>({});
const groupList = ref<ReceiveSettlementAdminApi.InvoiceIssueSettleGroupDto[]>(
  [],
);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const expandedRowKeys = ref<string[]>([]);

/** 已勾选的「发票开出 + 费用」键 */
const selectedItemIds = ref<string[]>([]);
const settledAmountMap = reactive(new Map<string, number>());
const remarkMap = reactive(new Map<string, string>());
const selectionQuery =
  createDrawerSelectionQuery<ReceiveSettlementAdminApi.InvoiceIssueSettleGroupDto>(
    (row) => row.invoiceIssueId,
    () => {
      selectedItemIds.value = [];
      settledAmountMap.clear();
      remarkMap.clear();
      groupList.value = [];
    },
  );

const [SearchForm, searchFormApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelWidth: 96,
  },
  layout: 'horizontal',
  schema: useAddInvoiceSearchSchema(),
  showDefaultActions: false,
  compact: true,
  wrapperClass: 'grid-cols-3',
});

const tableRows = computed(() =>
  groupList.value.map((group) => buildInvoiceGroupRow(group)),
);
const disabledItemIdSet = computed(
  () => new Set(drawerProps.value.selectedItemIds ?? []),
);

const selectedFeeCount = computed(() => selectedItemIds.value.length);

function itemKey(invoiceIssueId: string, item: InvoiceItem) {
  return invoiceIssueFeeKey(invoiceIssueId, item.orderFeeId);
}

function listSelectedAmounts() {
  return selectedItemIds.value.map((rowKey) => {
    const [, orderFeeId = ''] = rowKey.split('::');
    return {
      orderFeeId,
      rowKey,
      settledAmount: settledAmountMap.get(rowKey) ?? 0,
    };
  });
}

function defaultSettledAmount(invoiceIssueId: string, item: InvoiceItem) {
  const rowKey = itemKey(invoiceIssueId, item);
  return remainingSharedSettleable(
    listSelectedAmounts(),
    item.orderFeeId,
    item.invoiceSettleableAmount ?? 0,
    rowKey,
  );
}

/** 已选费用按币别汇总本次结算净额（应收为正、应付为负） */
const selectedCurrencyTotals = computed(() => {
  const selectedSet = new Set(selectedItemIds.value);
  const map = new Map<
    string,
    { amount: number; count: number; currencyCode: string }
  >();

  for (const group of selectionQuery.rows) {
    for (const item of group.items ?? []) {
      const rowKey = itemKey(group.invoiceIssueId, item);
      if (!selectedSet.has(rowKey)) continue;
      const settled =
        settledAmountMap.get(rowKey) ?? item.invoiceSettleableAmount ?? 0;
      const signed = toNetAmount(item.paySide, settled);
      const currencyCode = item.currency?.code || '未知';
      const prev = map.get(currencyCode);
      if (prev) {
        prev.amount += signed;
        prev.count += 1;
      } else {
        map.set(currencyCode, { amount: signed, count: 1, currencyCode });
      }
    }
  }

  return [...map.values()];
});

async function openDrawer(props: AddInvoiceDrawerProps = {}) {
  drawerProps.value = props;
  open.value = true;
  resetState();
  await nextTick();
  await searchFormApi.resetForm();
  if (props.settlementId) {
    searchFormApi.setValues({
      settlementName: props.settlementName || '',
      currencyId: props.currencyId,
    });
    await fetchData();
  }
}

function resetState() {
  selectionQuery.reset();
  loading.value = false;
  groupList.value = [];
  totalCount.value = 0;
  currentPage.value = 1;
  expandedRowKeys.value = [];
  selectedItemIds.value = [];
  settledAmountMap.clear();
  remarkMap.clear();
}

async function handleSearch() {
  if (!drawerProps.value.settlementId) {
    message.warning('银行流水未关联结算对象');
    return;
  }
  currentPage.value = 1;
  await fetchData();
}

async function handleReset() {
  selectionQuery.reset();
  loading.value = false;
  await searchFormApi.resetForm();
  if (drawerProps.value.settlementId) {
    searchFormApi.setValues({
      settlementName: drawerProps.value.settlementName || '',
      currencyId: drawerProps.value.currencyId,
    });
  }
  selectedItemIds.value = [];
  settledAmountMap.clear();
  remarkMap.clear();
  currentPage.value = 1;
  await fetchData();
}

async function fetchData() {
  const settlementId = drawerProps.value.settlementId;
  if (!settlementId) return;

  const values = (await searchFormApi.getValues()) || {};
  const [invoiceIssueTimeStart, invoiceIssueTimeEnd] = Array.isArray(
    values.invoiceIssueTimeRange,
  )
    ? values.invoiceIssueTimeRange
    : [undefined, undefined];

  const params = {
    receiveSettlementId: drawerProps.value.receiveSettlementId,
    settlementId,
    currencyId: drawerProps.value.currencyId,
    applicationNo: values.applicationNo || undefined,
    invoiceNo: values.invoiceNo || undefined,
    invoiceIssueTimeStart: toIsoStartOfDay(invoiceIssueTimeStart),
    invoiceIssueTimeEnd: toIsoEndOfDay(invoiceIssueTimeEnd),
    onlySettleable: true,
    pageIndex: currentPage.value,
    pageSize: pageSize.value,
  };
  const request = selectionQuery.begin(params);
  loading.value = true;
  try {
    const result = await getInvoiceIssueGroupForSettlement(params);
    if (!selectionQuery.accept(request, result.items ?? [])) return;
    groupList.value = result.items ?? [];
    totalCount.value = result.totalCount ?? 0;
    expandedRowKeys.value = groupList.value.map(
      (group) => group.invoiceIssueId,
    );
  } finally {
    if (selectionQuery.isCurrent(request)) loading.value = false;
  }
}

async function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  await fetchData();
}

function isItemDisabled(invoiceIssueId: string, item: InvoiceItem) {
  return disabledItemIdSet.value.has(itemKey(invoiceIssueId, item));
}

function isItemChecked(invoiceIssueId: string, item: InvoiceItem) {
  return selectedItemIds.value.includes(itemKey(invoiceIssueId, item));
}

function getSelectableItems(invoiceIssueId: string, items: InvoiceItem[]) {
  return items.filter((item) => !isItemDisabled(invoiceIssueId, item));
}

function isGroupAllChecked(invoiceIssueId: string, items: InvoiceItem[]) {
  const selectable = getSelectableItems(invoiceIssueId, items);
  return (
    selectable.length > 0 &&
    selectable.every((item) => isItemChecked(invoiceIssueId, item))
  );
}

function isGroupIndeterminate(invoiceIssueId: string, items: InvoiceItem[]) {
  const selectable = getSelectableItems(invoiceIssueId, items);
  const checkedCount = selectable.filter((item) =>
    isItemChecked(invoiceIssueId, item),
  ).length;
  return checkedCount > 0 && checkedCount < selectable.length;
}

function handleSelectItem(
  invoiceIssueId: string,
  item: InvoiceItem,
  selected: boolean,
) {
  if (isItemDisabled(invoiceIssueId, item)) return;
  const rowKey = itemKey(invoiceIssueId, item);

  if (selected) {
    selectedItemIds.value = [...new Set([...selectedItemIds.value, rowKey])];
    if (!settledAmountMap.has(rowKey)) {
      settledAmountMap.set(rowKey, defaultSettledAmount(invoiceIssueId, item));
    }
  } else {
    selectedItemIds.value = selectedItemIds.value.filter((id) => id !== rowKey);
    settledAmountMap.delete(rowKey);
    remarkMap.delete(rowKey);
  }
}

function handleSelectGroupItems(
  selected: boolean,
  invoiceIssueId: string,
  items: InvoiceItem[],
) {
  for (const item of getSelectableItems(invoiceIssueId, items)) {
    handleSelectItem(invoiceIssueId, item, selected);
  }
}

function updateSettledAmount(
  invoiceIssueId: string,
  item: InvoiceItem,
  value: unknown,
) {
  if (isItemDisabled(invoiceIssueId, item)) return;
  const rowKey = itemKey(invoiceIssueId, item);

  const numericValue = Number(value ?? 0);
  settledAmountMap.set(
    rowKey,
    Number.isFinite(numericValue) ? numericValue : 0,
  );

  if (!selectedItemIds.value.includes(rowKey)) {
    selectedItemIds.value = [...selectedItemIds.value, rowKey];
  }
}

function buildSelectedFees(): SelectedInvoiceFee[] {
  const selectedSet = new Set(selectedItemIds.value);
  const result: SelectedInvoiceFee[] = [];

  for (const group of selectionQuery.rows) {
    for (const item of group.items ?? []) {
      const rowKey = itemKey(group.invoiceIssueId, item);
      if (!selectedSet.has(rowKey)) continue;
      const order = item.transportOrder;
      result.push({
        invoiceIssueId: group.invoiceIssueId,
        orderFeeId: item.orderFeeId,
        applicationNo: group.applicationNo,
        invoiceNo: group.invoiceNo,
        invoiceIssueTime: group.invoiceIssueTime,
        appliedAmount: item.appliedAmount,
        exchangeRate: item.exchangeRate,
        feeCodeName: item.feeCode?.cnName,
        currencyCode: item.currency?.code,
        paySide: item.paySide,
        amount: item.amount,
        invoicedAmount: item.invoicedAmount,
        settledAmount: settledAmountMap.get(rowKey) ?? 0,
        historySettledAmount: item.settledAmount,
        invoiceSettleableAmount: item.invoiceSettleableAmount,
        settlementName: item.settlement?.name,
        transportOrderId: order?.id,
        commissionNum: order?.commissionNum,
        mblNum: order?.mblNum,
        bookingNum: order?.bookingNum,
        clientName: order?.client?.name,
        remark: remarkMap.get(rowKey) || undefined,
      });
    }
  }

  return result;
}

function handleConfirm() {
  if (loading.value) return;
  const fees = buildSelectedFees();
  if (fees.length === 0) {
    message.warning('请先选择费用');
    return;
  }

  const invalidFee = fees.find(
    (fee) => !fee.settledAmount || fee.settledAmount <= 0,
  );
  if (invalidFee) {
    message.warning(
      `费用「${invalidFee.feeCodeName || '-'}」结算金额必须大于0`,
    );
    return;
  }

  const overflow = findFeeSettleableOverflow(
    fees.map((fee) => ({
      feeName: fee.feeCodeName,
      invoiceSettleableAmount: fee.invoiceSettleableAmount,
      orderFeeId: fee.orderFeeId,
      settledAmount: fee.settledAmount,
    })),
  );
  if (overflow) {
    message.warning(
      `费用「${overflow.feeName}」发票口径可结算余额不足，可用额度 ${formatAmount(overflow.settleable)}`,
    );
    return;
  }

  emit('confirm', fees);
  open.value = false;
}

function formatIssueTime(value?: string) {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

function formatExchangeRate(value?: null | number) {
  if (value === undefined || value === null) return '-';
  return value.toFixed(6);
}

defineExpose({ open: openDrawer });
</script>

<template>
  <Drawer
    v-model:open="open"
    title="添加发票开出结算明细"
    width="1200px"
    destroy-on-close
    class="receive-settlement-add-invoice-drawer"
  >
    <div class="add-invoice-drawer-body">
      <div class="add-invoice-drawer-body__search">
        <SearchForm />
        <div class="search-actions">
          <Button @click="handleReset">重置</Button>
          <Button type="primary" :loading="loading" @click="handleSearch">
            查询
          </Button>
        </div>
      </div>

      <div class="mb-2 flex items-center gap-3">
        <div class="shrink-0 text-base font-semibold">发票开出费用</div>
        <div
          v-if="selectedFeeCount > 0"
          class="selected-fee-summary min-w-0 flex-1"
        >
          <span class="selected-fee-summary__label">
            已选 {{ selectedFeeCount }} 笔
          </span>
          <span
            v-for="item in selectedCurrencyTotals"
            :key="item.currencyCode"
            class="selected-fee-summary__item"
          >
            <span class="selected-fee-summary__code">{{
              item.currencyCode
            }}</span>
            <span class="selected-fee-summary__amount">{{
              formatAmount(item.amount)
            }}</span>
          </span>
        </div>
      </div>

      <div class="add-invoice-drawer-body__table">
        <NestedDataTable
          :columns="invoiceGroupColumns"
          :data-source="tableRows"
          :loading="loading"
          fill-height
          :inner-columns="invoiceItemColumns"
          inner-data-key="items"
          :inner-row-key="(record) => record.orderFeeId"
          row-key="id"
          v-model:expanded-row-keys="expandedRowKeys"
        >
          <template #outerBodyCell="{ column, record, text }">
            <template v-if="column.key === 'invoiceIssueTime'">
              {{ formatIssueTime(record.invoiceIssueTime) }}
            </template>
            <template v-else-if="column.key === 'currencyCode'">
              <Tag v-if="record.currencyCode">{{ record.currencyCode }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'totalSettleableAmount'">
              {{ formatAmount(record.totalSettleableAmount) }}
            </template>
            <template v-else>
              {{ text || '-' }}
            </template>
          </template>

          <template #innerHeaderCell="{ column, parentRecord }">
            <template v-if="column.key === 'checkbox'">
              <Checkbox
                :checked="
                  isGroupAllChecked(
                    parentRecord?.invoiceIssueId ?? '',
                    parentRecord?.items ?? [],
                  )
                "
                :indeterminate="
                  isGroupIndeterminate(
                    parentRecord?.invoiceIssueId ?? '',
                    parentRecord?.items ?? [],
                  )
                "
                @change="
                  (e) =>
                    handleSelectGroupItems(
                      e.target.checked,
                      parentRecord?.invoiceIssueId ?? '',
                      parentRecord?.items ?? [],
                    )
                "
              />
            </template>
            <template v-else>{{ column.title }}</template>
          </template>

          <template #innerBodyCell="{ column, record: item, parentRecord }">
            <template v-if="column.key === 'checkbox'">
              <Checkbox
                :checked="
                  isItemChecked(parentRecord?.invoiceIssueId ?? '', item)
                "
                :disabled="
                  isItemDisabled(parentRecord?.invoiceIssueId ?? '', item)
                "
                @change="
                  (e) =>
                    handleSelectItem(
                      parentRecord?.invoiceIssueId ?? '',
                      item,
                      e.target.checked,
                    )
                "
              />
            </template>
            <template v-else-if="column.key === 'commissionNum'">
              {{ item.transportOrder?.commissionNum || '-' }}
            </template>
            <template v-else-if="column.key === 'mblNum'">
              {{ item.transportOrder?.mblNum || '-' }}
            </template>
            <template v-else-if="column.key === 'feeCodeName'">
              {{ item.feeCode?.cnName || '-' }}
            </template>
            <template v-else-if="column.key === 'paySide'">
              <Tag :color="getPaySideColor(item.paySide)">
                {{ getPaySideLabel(item.paySide) }}
              </Tag>
            </template>
            <template v-else-if="column.key === 'currencyCode'">
              <Tag v-if="item.currency?.code">{{ item.currency.code }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'amount'">
              {{ formatAmount(item.amount) }}
            </template>
            <template v-else-if="column.key === 'appliedAmount'">
              {{ formatAmount(item.appliedAmount) }}
            </template>
            <template v-else-if="column.key === 'exchangeRate'">
              {{ formatExchangeRate(item.exchangeRate) }}
            </template>
            <template v-else-if="column.key === 'historySettledAmount'">
              {{ formatAmount(item.settledAmount) }}
            </template>
            <template v-else-if="column.key === 'invoiceSettleableAmount'">
              {{ formatAmount(item.invoiceSettleableAmount) }}
            </template>
            <template v-else-if="column.key === 'inputSettledAmount'">
              <InputNumber
                size="small"
                :value="
                  settledAmountMap.get(
                    itemKey(parentRecord?.invoiceIssueId ?? '', item),
                  ) ??
                  defaultSettledAmount(parentRecord?.invoiceIssueId ?? '', item)
                "
                :min="0"
                :max="item.invoiceSettleableAmount"
                :precision="2"
                :disabled="
                  isItemDisabled(parentRecord?.invoiceIssueId ?? '', item)
                "
                style="width: 130px"
                @change="
                  (value) =>
                    updateSettledAmount(
                      parentRecord?.invoiceIssueId ?? '',
                      item,
                      value,
                    )
                "
              />
            </template>
            <template v-else>
              {{ column.dataIndex ? item[column.dataIndex] : '' }}
            </template>
          </template>
        </NestedDataTable>
      </div>

      <div class="add-invoice-drawer-body__pagination">
        <Pagination
          :current="currentPage"
          :page-size="pageSize"
          :total="totalCount"
          show-size-changer
          :show-total="(total) => `共 ${total} 张发票开出`"
          @change="handlePageChange"
        />
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <Button type="primary" :disabled="loading" @click="handleConfirm"
          >确认添加</Button
        >
      </div>
    </template>
  </Drawer>
</template>

<style scoped lang="scss">
.receive-settlement-add-invoice-drawer {
  :deep(.ant-drawer-body) {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 16px;
    overflow: hidden;
  }
}

.add-invoice-drawer-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}

.add-invoice-drawer-body__search {
  display: flex;
  gap: 12px;
  align-items: flex-start;

  :deep(.relative.flex.pb-2) {
    padding-bottom: 0;
  }
}

.search-actions {
  display: flex;
  flex: none;
  gap: 8px;
  align-items: center;
  padding-top: 2px;
}

.add-invoice-drawer-body__search :deep(form) {
  flex: 1;
  min-width: 0;
}

.selected-fee-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: center;
  font-size: 13px;
  color: #667487;
}

.selected-fee-summary__label {
  font-weight: 500;
  color: #283442;
}

.selected-fee-summary__item {
  display: inline-flex;
  gap: 4px;
  align-items: baseline;
}

.selected-fee-summary__code {
  color: #8a97a8;
}

.selected-fee-summary__amount {
  font-variant-numeric: tabular-nums;
  color: #283442;
}

.add-invoice-drawer-body__table {
  flex: 1;
  min-height: 0;
}

.add-invoice-drawer-body__pagination {
  display: flex;
  justify-content: flex-end;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
