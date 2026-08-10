<script lang="ts" setup>
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
import { getInvoiceApplicationGroupForSettlement } from '#/api/settlement-management/receive-settlement-admin';
import { NestedDataTable } from '#/components/nested-data-table';

import {
  formatAmount,
  getPaySideColor,
  getPaySideLabel,
  toNetAmount,
} from '../form-data';
import {
  type AddInvoiceDrawerProps,
  buildInvoiceGroupRow,
  invoiceGroupColumns,
  invoiceItemColumns,
  type SelectedInvoiceFee,
  useAddInvoiceSearchSchema,
} from './data';

const emit = defineEmits<{
  confirm: [fees: SelectedInvoiceFee[]];
}>();

const open = ref(false);
const loading = ref(false);
const drawerProps = ref<AddInvoiceDrawerProps>({});
const groupList = ref<ReceiveSettlementAdminApi.InvoiceAppSettleGroupDto[]>([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const expandedRowKeys = ref<string[]>([]);

/** 已勾选的开票明细ID */
const selectedItemIds = ref<string[]>([]);
const settledAmountMap = reactive(new Map<string, number>());
const remarkMap = reactive(new Map<string, string>());

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

/** 已选费用按币别汇总本次结算净额（应收为正、应付为负） */
const selectedCurrencyTotals = computed(() => {
  const selectedSet = new Set(selectedItemIds.value);
  const map = new Map<
    string,
    { amount: number; count: number; currencyCode: string }
  >();

  for (const group of groupList.value) {
    for (const item of group.items ?? []) {
      if (!selectedSet.has(item.invoiceApplicationItemId)) continue;
      const settled =
        settledAmountMap.get(item.invoiceApplicationItemId) ??
        item.invoiceSettleableAmount ??
        0;
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
  const [applyTimeStart, applyTimeEnd] = Array.isArray(values.applyTimeRange)
    ? values.applyTimeRange
    : [undefined, undefined];

  loading.value = true;
  try {
    const result = await getInvoiceApplicationGroupForSettlement({
      receiveSettlementId: drawerProps.value.receiveSettlementId,
      settlementId,
      currencyId: drawerProps.value.currencyId,
      applicationNo: values.applicationNo || undefined,
      invoiceNo: values.invoiceNo || undefined,
      applyTimeStart: applyTimeStart
        ? dayjs(applyTimeStart).toISOString()
        : undefined,
      applyTimeEnd: applyTimeEnd
        ? dayjs(applyTimeEnd).toISOString()
        : undefined,
      onlySettleable: true,
      pageIndex: currentPage.value,
      pageSize: pageSize.value,
    });
    groupList.value = result.items ?? [];
    totalCount.value = result.totalCount ?? 0;
    expandedRowKeys.value = groupList.value.map(
      (group) => group.invoiceApplicationId,
    );
  } finally {
    loading.value = false;
  }
}

async function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  await fetchData();
}

function isItemDisabled(
  item: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto,
) {
  return disabledItemIdSet.value.has(item.invoiceApplicationItemId);
}

function isItemChecked(
  item: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto,
) {
  return selectedItemIds.value.includes(item.invoiceApplicationItemId);
}

function getSelectableItems(
  items: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto[],
) {
  return items.filter((item) => !isItemDisabled(item));
}

function isGroupAllChecked(
  items: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto[],
) {
  const selectable = getSelectableItems(items);
  return (
    selectable.length > 0 && selectable.every((item) => isItemChecked(item))
  );
}

function isGroupIndeterminate(
  items: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto[],
) {
  const selectable = getSelectableItems(items);
  const checkedCount = selectable.filter((item) => isItemChecked(item)).length;
  return checkedCount > 0 && checkedCount < selectable.length;
}

function handleSelectItem(
  item: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto,
  selected: boolean,
) {
  if (isItemDisabled(item)) return;

  if (selected) {
    selectedItemIds.value = [
      ...new Set([...selectedItemIds.value, item.invoiceApplicationItemId]),
    ];
    if (!settledAmountMap.has(item.invoiceApplicationItemId)) {
      settledAmountMap.set(
        item.invoiceApplicationItemId,
        item.invoiceSettleableAmount ?? 0,
      );
    }
  } else {
    selectedItemIds.value = selectedItemIds.value.filter(
      (id) => id !== item.invoiceApplicationItemId,
    );
    settledAmountMap.delete(item.invoiceApplicationItemId);
    remarkMap.delete(item.invoiceApplicationItemId);
  }
}

function handleSelectGroupItems(
  selected: boolean,
  items: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto[],
) {
  for (const item of getSelectableItems(items)) {
    handleSelectItem(item, selected);
  }
}

function updateSettledAmount(
  item: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto,
  value: unknown,
) {
  if (isItemDisabled(item)) return;

  const numericValue = Number(value ?? 0);
  settledAmountMap.set(
    item.invoiceApplicationItemId,
    Number.isFinite(numericValue) ? numericValue : 0,
  );

  if (!selectedItemIds.value.includes(item.invoiceApplicationItemId)) {
    selectedItemIds.value = [
      ...selectedItemIds.value,
      item.invoiceApplicationItemId,
    ];
  }
}

function buildSelectedFees(): SelectedInvoiceFee[] {
  const selectedSet = new Set(selectedItemIds.value);
  const result: SelectedInvoiceFee[] = [];

  for (const group of groupList.value) {
    for (const item of group.items ?? []) {
      if (!selectedSet.has(item.invoiceApplicationItemId)) continue;
      const order = item.transportOrder;
      result.push({
        invoiceApplicationId: group.invoiceApplicationId,
        invoiceApplicationItemId: item.invoiceApplicationItemId,
        orderFeeId: item.orderFeeId,
        applicationNo: group.applicationNo,
        invoiceNo: group.invoiceNo,
        appliedAmount: item.appliedAmount,
        feeCodeName: item.feeCode?.cnName,
        currencyCode: item.currency?.code,
        paySide: item.paySide,
        amount: item.amount,
        invoicedAmount: item.invoicedAmount,
        settledAmount: settledAmountMap.get(item.invoiceApplicationItemId) ?? 0,
        invoiceSettleableAmount: item.invoiceSettleableAmount,
        settlementName: item.settlement?.name,
        transportOrderId: order?.id,
        commissionNum: order?.commissionNum,
        mblNum: order?.mblNum,
        bookingNum: order?.bookingNum,
        clientName: order?.client?.name,
        remark: remarkMap.get(item.invoiceApplicationItemId) || undefined,
      });
    }
  }

  return result;
}

function handleConfirm() {
  const fees = buildSelectedFees();
  if (fees.length === 0) {
    message.warning('请先选择开票明细');
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

  // 同一费用在多张已开票申请中共享发票口径可结算余额，按费用聚合校验
  const consumedByFee = new Map<string, number>();
  const settleableByFee = new Map<string, number>();
  for (const fee of fees) {
    consumedByFee.set(
      fee.orderFeeId,
      (consumedByFee.get(fee.orderFeeId) ?? 0) + fee.settledAmount,
    );
    settleableByFee.set(fee.orderFeeId, fee.invoiceSettleableAmount ?? 0);
  }
  for (const [orderFeeId, consumed] of consumedByFee) {
    const settleable = settleableByFee.get(orderFeeId) ?? 0;
    if (consumed > settleable + 1e-6) {
      const fee = fees.find((f) => f.orderFeeId === orderFeeId);
      message.warning(
        `费用「${fee?.feeCodeName || '-'}」发票口径可结算余额不足，可用额度 ${formatAmount(settleable)}`,
      );
      return;
    }
  }

  emit('confirm', fees);
  open.value = false;
}

function formatApplyTime(value?: string) {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

defineExpose({ open: openDrawer });
</script>

<template>
  <Drawer
    v-model:open="open"
    title="添加开票结算明细"
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
        <div class="shrink-0 text-base font-semibold">开票费用明细</div>
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
          :inner-row-key="(record) => record.invoiceApplicationItemId"
          row-key="id"
          v-model:expanded-row-keys="expandedRowKeys"
        >
          <template #outerBodyCell="{ column, record, text }">
            <template v-if="column.key === 'applyTime'">
              {{ formatApplyTime(record.applyTime) }}
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
                :checked="isGroupAllChecked(parentRecord?.items ?? [])"
                :indeterminate="isGroupIndeterminate(parentRecord?.items ?? [])"
                @change="
                  (e) =>
                    handleSelectGroupItems(
                      e.target.checked,
                      parentRecord?.items ?? [],
                    )
                "
              />
            </template>
            <template v-else>{{ column.title }}</template>
          </template>

          <template #innerBodyCell="{ column, record: item }">
            <template v-if="column.key === 'checkbox'">
              <Checkbox
                :checked="isItemChecked(item)"
                :disabled="isItemDisabled(item)"
                @change="(e) => handleSelectItem(item, e.target.checked)"
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
            <template v-else-if="column.key === 'invoiceSettleableAmount'">
              {{ formatAmount(item.invoiceSettleableAmount) }}
            </template>
            <template v-else-if="column.key === 'settledAmount'">
              <InputNumber
                size="small"
                :value="
                  settledAmountMap.get(item.invoiceApplicationItemId) ??
                  item.invoiceSettleableAmount ??
                  0
                "
                :min="0"
                :max="item.invoiceSettleableAmount"
                :precision="2"
                :disabled="isItemDisabled(item)"
                style="width: 130px"
                @change="(value) => updateSettledAmount(item, value)"
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
          :show-total="(total) => `共 ${total} 张开票申请`"
          @change="handlePageChange"
        />
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <Button type="primary" @click="handleConfirm">确认添加</Button>
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
  min-height: 0;
  overflow: hidden;

  &__search {
    flex-shrink: 0;
    margin-bottom: 12px;
  }

  &__table {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 200px;
    overflow: hidden;

    :deep(.nested-data-table) {
      display: flex;
      flex: 1;
      flex-direction: column;
    }

    :deep(.nested-data-table__scroll) {
      flex: 1;
      min-height: 0;
    }
  }

  &__pagination {
    display: flex;
    flex-shrink: 0;
    justify-content: flex-end;
    margin-top: 12px;
  }
}

.search-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

.selected-fee-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 12px;
  align-items: center;
  font-size: 12px;
  line-height: 1.4;
  color: #657286;
}

.selected-fee-summary__label {
  font-weight: 600;
  color: #334155;
}

.selected-fee-summary__item {
  display: inline-flex;
  gap: 4px;
  align-items: baseline;
  padding: 2px 8px;
  background: #f0f7ff;
  border-radius: 6px;
}

.selected-fee-summary__code {
  font-weight: 600;
  color: #475569;
}

.selected-fee-summary__amount {
  font-weight: 700;
  color: #1677ff;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
}
</style>
