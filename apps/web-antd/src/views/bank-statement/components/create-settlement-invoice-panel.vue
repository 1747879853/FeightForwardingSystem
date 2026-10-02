<script lang="ts" setup>
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';

import dayjs from 'dayjs';

import {
  Button,
  Card,
  Checkbox,
  InputNumber,
  message,
  Pagination,
  Tag,
} from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addReceiveSettlementByInvoiceApplication,
  getInvoiceIssueGroupForSettlement,
} from '#/api/settlement-management/receive-settlement-admin';
import { NestedDataTable } from '#/components/nested-data-table';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
import { toIsoEndOfDay, toIsoStartOfDay } from '#/utils/date-range-iso';

import {
  buildInvoiceGroupRow,
  invoiceGroupColumns,
  invoiceIssueFeeKey,
  invoiceItemColumns,
  type InvoiceItem,
  useAddInvoiceSearchSchema,
} from '../../settlement-management/receive-settlement/add-invoice-application-drawer/data';
import {
  formatAmount,
  getPaySideColor,
  getPaySideLabel,
} from '../../settlement-management/receive-settlement/form-data';
import {
  hasSharedOrderFee,
  isSettledAmountWithinQuota,
  settledAmountBounds,
  settledAmountQuotaMessage,
  SHARED_FEE_QUOTA_HINT,
  suggestInvoiceActualSettled,
} from '../../settlement-management/receive-settlement/settlement-amount';

/** 复用抽屉搜索项，但隐藏结算对象/币别（随流水固定） */
function useBankStatementInvoiceSearchSchema() {
  return useAddInvoiceSearchSchema().map((item) => {
    if (
      item.fieldName === 'settlementName' ||
      item.fieldName === 'currencyId'
    ) {
      return { ...item, formItemClass: 'hidden' };
    }
    return item;
  });
}

const props = defineProps<{
  bankStatementAmount: number;
  bankStatementId: string;
  currencyCode?: string;
  currencyId?: number;
  orgId?: number;
  otherSettledAmount: number;
  settlementId?: string;
  settlementName?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  created: [];
}>();

const loading = ref(false);
const creating = ref(false);
const groupList = ref<ReceiveSettlementAdminApi.InvoiceIssueSettleGroupDto[]>(
  [],
);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const expandedRowKeys = ref<string[]>([]);

const selectedItemIds = ref<string[]>([]);
const settledAmountMap = reactive(new Map<string, number>());
/** 跨页保留已选费用行，确认时不只认当前页 */
const selectedItemDetailMap = reactive(
  new Map<string, InvoiceItem & { invoiceIssueId: string }>(),
);
const actualSettled = ref<number | null>(null);
const actualSettledTouched = ref(false);

const [SearchForm, searchFormApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelClass: 'text-xs text-gray-500 !justify-start',
    labelWidth: 96,
  },
  layout: 'horizontal',
  schema: useBankStatementInvoiceSearchSchema(),
  showDefaultActions: false,
  submitOnChange: false,
  compact: true,
  wrapperClass: 'grid-cols-3 gap-x-3',
});

const tableRows = computed(() =>
  groupList.value.map((group) => buildInvoiceGroupRow(group)),
);

function itemKey(invoiceIssueId: string, item: InvoiceItem) {
  return invoiceIssueFeeKey(invoiceIssueId, item.orderFeeId);
}

function defaultSettledAmount(_invoiceIssueId: string, item: InvoiceItem) {
  return item.invoiceSettleableAmount ?? 0;
}

/** 已选明细（供校验与参考值），含跨页勾选 */
const selectedItems = computed(() => {
  return selectedItemIds.value
    .map((rowKey) => {
      const detail = selectedItemDetailMap.get(rowKey);
      if (!detail) return null;
      return { ...detail, rowKey };
    })
    .filter(
      (
        item,
      ): item is InvoiceItem & { invoiceIssueId: string; rowKey: string } =>
        item != null,
    );
});

const showSharedFeeHint = computed(() =>
  hasSharedOrderFee(selectedItems.value),
);

const suggestedActualSettled = computed(() =>
  suggestInvoiceActualSettled(
    selectedItems.value.map((item) => ({
      settledAmount: settledAmountMap.get(item.rowKey) ?? 0,
      exchangeRate: item.exchangeRate,
      paySide: item.paySide,
    })),
  ),
);

watch(suggestedActualSettled, (value) => {
  if (actualSettledTouched.value) return;
  actualSettled.value = value;
});

const remainingSettleAmount = computed(
  () =>
    props.bankStatementAmount -
    props.otherSettledAmount -
    (actualSettled.value ?? 0),
);

const isRemainingOverLimit = computed(
  () => actualSettled.value != null && remainingSettleAmount.value < 0,
);

function formatBankAmount(value: number | undefined | null) {
  if (value === undefined || value === null) return '-';
  const amountText = formatAmount(value);
  return props.currencyCode
    ? `${amountText} ${props.currencyCode}`
    : amountText;
}

function formatIssueTime(value?: string) {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

function formatExchangeRate(value?: null | number) {
  if (value === undefined || value === null) return '-';
  return value.toFixed(6);
}

function resetSelection() {
  selectedItemIds.value = [];
  settledAmountMap.clear();
  selectedItemDetailMap.clear();
  actualSettled.value = null;
  actualSettledTouched.value = false;
}

function resetState() {
  groupList.value = [];
  totalCount.value = 0;
  currentPage.value = 1;
  expandedRowKeys.value = [];
  resetSelection();
}

async function syncSearchFormFromProps() {
  await nextTick();
  await searchFormApi.setValues({
    settlementName: props.settlementName || '',
    currencyId: props.currencyId,
  });
}

async function resetSearchFilters() {
  await nextTick();
  await searchFormApi.setValues({
    settlementName: props.settlementName || '',
    currencyId: props.currencyId,
    applicationNo: '',
    invoiceNo: '',
    invoiceIssueTimeRange: undefined,
  });
}

async function initSearchForm() {
  await nextTick();
  await searchFormApi.resetForm();
  await syncSearchFormFromProps();
}

async function fetchData(formValues?: Record<string, any>) {
  const settlementId = props.settlementId;
  if (!settlementId) return;

  const values = formValues ?? ((await searchFormApi.getValues()) || {});
  const [invoiceIssueTimeStart, invoiceIssueTimeEnd] = Array.isArray(
    values.invoiceIssueTimeRange,
  )
    ? values.invoiceIssueTimeRange
    : [undefined, undefined];

  loading.value = true;
  try {
    const result = await getInvoiceIssueGroupForSettlement({
      settlementId,
      currencyId: props.currencyId,
      applicationNo: values.applicationNo || undefined,
      invoiceNo: values.invoiceNo || undefined,
      invoiceIssueTimeStart: toIsoStartOfDay(invoiceIssueTimeStart),
      invoiceIssueTimeEnd: toIsoEndOfDay(invoiceIssueTimeEnd),
      onlySettleable: true,
      pageIndex: currentPage.value,
      pageSize: pageSize.value,
    });
    groupList.value = result.items ?? [];
    totalCount.value = result.totalCount ?? 0;
    expandedRowKeys.value = groupList.value.map(
      (group) => group.invoiceIssueId,
    );
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  if (!props.settlementId) {
    message.warning('银行流水未关联结算对象');
    return;
  }
  const values = (await searchFormApi.getValues()) ?? {};
  currentPage.value = 1;
  await fetchData(values);
}

async function handleReset() {
  currentPage.value = 1;
  await resetSearchFilters();
  await fetchData({
    applicationNo: undefined,
    invoiceNo: undefined,
    invoiceIssueTimeRange: undefined,
  });
}

async function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  await fetchData();
}

function isItemChecked(invoiceIssueId: string, item: InvoiceItem) {
  return selectedItemIds.value.includes(itemKey(invoiceIssueId, item));
}

function isGroupAllChecked(invoiceIssueId: string, items: InvoiceItem[]) {
  return (
    items.length > 0 &&
    items.every((item) => isItemChecked(invoiceIssueId, item))
  );
}

function isGroupIndeterminate(invoiceIssueId: string, items: InvoiceItem[]) {
  const checkedCount = items.filter((item) =>
    isItemChecked(invoiceIssueId, item),
  ).length;
  return checkedCount > 0 && checkedCount < items.length;
}

function handleSelectItem(
  invoiceIssueId: string,
  item: InvoiceItem,
  selected: boolean,
) {
  const rowKey = itemKey(invoiceIssueId, item);
  if (selected) {
    selectedItemIds.value = [...new Set([...selectedItemIds.value, rowKey])];
    selectedItemDetailMap.set(rowKey, { ...item, invoiceIssueId });
    if (!settledAmountMap.has(rowKey)) {
      settledAmountMap.set(rowKey, defaultSettledAmount(invoiceIssueId, item));
    }
  } else {
    selectedItemIds.value = selectedItemIds.value.filter((id) => id !== rowKey);
    settledAmountMap.delete(rowKey);
    selectedItemDetailMap.delete(rowKey);
  }
}

function handleSelectGroupItems(
  selected: boolean,
  invoiceIssueId: string,
  items: InvoiceItem[],
) {
  for (const item of items) {
    handleSelectItem(invoiceIssueId, item, selected);
  }
}

const pageGroups = computed(() =>
  tableRows.value.map((row) => ({
    invoiceIssueId: String(row.invoiceIssueId ?? ''),
    items: (row.items ?? []) as InvoiceItem[],
  })),
);

const isPageAllChecked = computed(
  () =>
    pageGroups.value.some((group) => group.items.length > 0) &&
    pageGroups.value
      .filter((group) => group.items.length > 0)
      .every((group) => isGroupAllChecked(group.invoiceIssueId, group.items)),
);

const isPageIndeterminate = computed(() => {
  if (isPageAllChecked.value) return false;
  return pageGroups.value.some((group) =>
    group.items.some((item) => isItemChecked(group.invoiceIssueId, item)),
  );
});

function handleSelectPage(selected: boolean) {
  for (const group of pageGroups.value) {
    handleSelectGroupItems(selected, group.invoiceIssueId, group.items);
  }
}

function updateSettledAmount(
  invoiceIssueId: string,
  item: InvoiceItem,
  value: unknown,
) {
  const rowKey = itemKey(invoiceIssueId, item);
  const numericValue = Number(value ?? 0);
  settledAmountMap.set(
    rowKey,
    Number.isFinite(numericValue) ? numericValue : 0,
  );

  if (!selectedItemIds.value.includes(rowKey)) {
    selectedItemIds.value = [...selectedItemIds.value, rowKey];
    selectedItemDetailMap.set(rowKey, { ...item, invoiceIssueId });
  }
}

function markActualSettledTouched() {
  actualSettledTouched.value = true;
}

function validateSelection(): boolean {
  const items = selectedItems.value;
  if (items.length === 0) {
    message.warning('请先选择费用');
    return false;
  }

  const invalidItem = items.find((item) => {
    const amount = settledAmountMap.get(item.rowKey) ?? 0;
    return !isSettledAmountWithinQuota(amount, item.invoiceSettleableAmount);
  });
  if (invalidItem) {
    message.warning(
      settledAmountQuotaMessage(
        invalidItem.feeCode?.cnName,
        invalidItem.invoiceSettleableAmount,
      ),
    );
    return false;
  }

  if (actualSettled.value == null) {
    message.warning('请填写本次结算');
    return false;
  }

  if (isRemainingOverLimit.value) {
    const availableAmount =
      props.bankStatementAmount - props.otherSettledAmount;
    message.warning(
      `本次结算 ${formatBankAmount(actualSettled.value)} 已超过流水剩余可结算金额 ${formatBankAmount(availableAmount)}`,
    );
    return false;
  }

  return true;
}

async function handleCreateSettlement() {
  if (!validateSelection()) return;

  if (!props.orgId) {
    message.warning('缺少归属组织，无法创建结算单');
    return;
  }

  creating.value = true;
  try {
    await addReceiveSettlementByInvoiceApplication({
      orgId: props.orgId,
      bankStatementId: props.bankStatementId,
      settlementTime: dayjs().toISOString(),
      actualSettled: actualSettled.value!,
      items: selectedItems.value.map((item) => ({
        invoiceIssueId: item.invoiceIssueId,
        orderFeeId: item.orderFeeId,
        settledAmount: settledAmountMap.get(item.rowKey) ?? 0,
      })),
    });
    message.success('创建发票结算成功');
    markListShouldRefresh('ReceiveSettlementList');
    markListShouldRefresh('BankStatementList');
    resetSelection();
    await fetchData();
    emit('created');
  } catch (error: any) {
    message.error(error.message || '创建发票结算失败');
  } finally {
    creating.value = false;
  }
}

async function reload() {
  resetState();
  await resetSearchFilters();
  if (props.settlementId) {
    await fetchData();
  }
}

watch(
  () => [props.settlementName, props.currencyId] as const,
  () => {
    syncSearchFormFromProps();
  },
);

onMounted(async () => {
  await initSearchForm();
  if (props.settlementId) {
    await fetchData();
  }
});

defineExpose({ reload });
</script>

<template>
  <Card
    title="选择发票开出并创建发票结算"
    size="small"
    class="create-settlement-invoice-panel"
  >
    <div class="fee-toolbar mb-3">
      <div class="fee-toolbar__search">
        <SearchForm />
      </div>
      <div class="fee-toolbar__actions">
        <Button @click="handleReset">重置</Button>
        <Button type="primary" @click="handleSearch">查询</Button>
      </div>
    </div>

    <NestedDataTable
      :columns="invoiceGroupColumns"
      :data-source="tableRows"
      :loading="loading"
      :max-height="480"
      :inner-columns="invoiceItemColumns"
      inner-data-key="items"
      :inner-row-key="(record) => record.orderFeeId"
      row-key="id"
      v-model:expanded-row-keys="expandedRowKeys"
    >
      <template #outerHeaderCell="{ column }">
        <template v-if="column.key === 'checkbox'">
          <Checkbox
            :checked="isPageAllChecked"
            :indeterminate="isPageIndeterminate"
            :disabled="pageGroups.every((group) => group.items.length === 0)"
            @change="(e) => handleSelectPage(e.target.checked)"
          />
        </template>
        <template v-else>{{ column.title }}</template>
      </template>

      <template #outerBodyCell="{ column, record, text }">
        <template v-if="column.key === 'checkbox'">
          <Checkbox
            :checked="
              isGroupAllChecked(record.invoiceIssueId ?? '', record.items ?? [])
            "
            :indeterminate="
              isGroupIndeterminate(
                record.invoiceIssueId ?? '',
                record.items ?? [],
              )
            "
            :disabled="(record.items ?? []).length === 0"
            @change="
              (e) =>
                handleSelectGroupItems(
                  e.target.checked,
                  record.invoiceIssueId ?? '',
                  record.items ?? [],
                )
            "
          />
        </template>
        <template v-else-if="column.key === 'invoiceIssueTime'">
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
            :checked="isItemChecked(parentRecord?.invoiceIssueId ?? '', item)"
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
            :min="settledAmountBounds(item.invoiceSettleableAmount).min"
            :max="settledAmountBounds(item.invoiceSettleableAmount).max"
            :precision="2"
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

    <div class="mt-3 flex justify-end">
      <Pagination
        :current="currentPage"
        :page-size="pageSize"
        :total="totalCount"
        show-size-changer
        :show-total="(total) => `共 ${total} 张发票开出`"
        @change="handlePageChange"
      />
    </div>

    <div class="settlement-submit-bar">
      <div class="settlement-submit-bar__summary">
        <span>已选择 {{ selectedItemIds.length }} 条</span>
        <span v-if="showSharedFeeHint" class="shared-fee-hint">
          {{ SHARED_FEE_QUOTA_HINT }}
        </span>
        <span class="settlement-submit-bar__actual">
          本次结算
          <InputNumber
            v-model:value="actualSettled"
            :precision="2"
            placeholder="流水币别金额"
            style="width: 160px"
            @update:value="markActualSettledTouched"
          />
          <strong>{{ currencyCode || '' }}</strong>
        </span>
        <span
          v-if="suggestedActualSettled != null"
          class="settlement-submit-bar__hint"
        >
          参考 {{ formatBankAmount(suggestedActualSettled) }}
        </span>
        <span v-else-if="selectedItemIds.length > 0" class="summary-danger">
          缺汇率，请手工填写本次结算
        </span>
        <span :class="{ 'summary-danger': isRemainingOverLimit }">
          核销后剩余
          <strong>{{ formatBankAmount(remainingSettleAmount) }}</strong>
        </span>
      </div>
      <div class="settlement-submit-bar__actions">
        <Button @click="emit('cancel')">取消</Button>
        <Button
          type="primary"
          :loading="creating"
          @click="handleCreateSettlement"
        >
          确认核销
        </Button>
      </div>
    </div>
  </Card>
</template>

<style scoped lang="scss">
.create-settlement-invoice-panel {
  :deep(.ant-card-body) {
    padding-top: 12px;
  }

  :deep(.invoice-select-col) {
    padding-right: 4px;
    padding-left: 4px;
    overflow: visible;
  }
}

.fee-toolbar__search {
  flex: 1;
  min-width: 0;

  :deep(.relative.flex.pb-2) {
    padding-bottom: 0;
  }
}

.fee-toolbar {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.fee-toolbar__actions {
  display: flex;
  flex: none;
  gap: 8px;
  align-items: center;
}

.settlement-submit-bar {
  position: sticky;
  bottom: -12px;
  z-index: 2;
  display: flex;
  gap: 20px;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  margin: 16px -12px -12px;
  background: #fbfcfe;
  border-top: 1px solid #e3e8ef;
  box-shadow: 0 -4px 12px rgb(35 50 68 / 6%);
}

.settlement-submit-bar__summary,
.settlement-submit-bar__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
}

.settlement-submit-bar__summary {
  font-size: 13px;
  color: #667487;

  strong {
    margin-left: 4px;
    font-variant-numeric: tabular-nums;
    color: #283442;
  }

  .summary-danger,
  .summary-danger strong {
    color: #cf1322;
  }
}

.settlement-submit-bar__actual {
  display: inline-flex;
  gap: 8px;
  align-items: center;
}

.settlement-submit-bar__hint {
  color: #8a97a8;
}

.shared-fee-hint {
  flex-basis: 100%;
  color: #ad6800;
}
</style>
