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
  getInvoiceApplicationGroupForSettlement,
} from '#/api/settlement-management/receive-settlement-admin';
import { NestedDataTable } from '#/components/nested-data-table';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import {
  buildInvoiceGroupRow,
  invoiceGroupColumns,
  invoiceItemColumns,
  useAddInvoiceSearchSchema,
} from '../../settlement-management/receive-settlement/add-invoice-application-drawer/data';
import {
  formatAmount,
  getPaySideColor,
  getPaySideLabel,
  toNetAmount,
} from '../../settlement-management/receive-settlement/form-data';

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
const groupList = ref<ReceiveSettlementAdminApi.InvoiceAppSettleGroupDto[]>([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const expandedRowKeys = ref<string[]>([]);

const selectedItemIds = ref<string[]>([]);
const settledAmountMap = reactive(new Map<string, number>());

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

/** 已选明细（供校验与净额计算） */
const selectedItems = computed(() => {
  const selectedSet = new Set(selectedItemIds.value);
  const result: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto[] = [];
  for (const group of groupList.value) {
    for (const item of group.items ?? []) {
      if (selectedSet.has(item.invoiceApplicationItemId)) {
        result.push(item);
      }
    }
  }
  return result;
});

const currentSelectionNet = computed(() =>
  selectedItems.value.reduce(
    (sum, item) =>
      sum +
      toNetAmount(
        item.paySide,
        settledAmountMap.get(item.invoiceApplicationItemId) ?? 0,
      ),
    0,
  ),
);

const currentSelectionReceived = computed(() =>
  selectedItems.value.reduce((sum, item) => {
    const netAmount = toNetAmount(
      item.paySide,
      settledAmountMap.get(item.invoiceApplicationItemId) ?? 0,
    );
    return sum + Math.max(netAmount, 0);
  }, 0),
);

const currentSelectionPaid = computed(() =>
  selectedItems.value.reduce((sum, item) => {
    const netAmount = toNetAmount(
      item.paySide,
      settledAmountMap.get(item.invoiceApplicationItemId) ?? 0,
    );
    return sum + Math.abs(Math.min(netAmount, 0));
  }, 0),
);

const remainingSettleAmount = computed(
  () =>
    props.bankStatementAmount -
    props.otherSettledAmount -
    currentSelectionNet.value,
);

const isRemainingOverLimit = computed(() => remainingSettleAmount.value < 0);

function formatBankAmount(value: number | undefined | null) {
  if (value === undefined || value === null) return '-';
  const amountText = formatAmount(value);
  return props.currencyCode
    ? `${amountText} ${props.currencyCode}`
    : amountText;
}

function formatApplyTime(value?: string) {
  if (!value) return '-';
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

function resetSelection() {
  selectedItemIds.value = [];
  settledAmountMap.clear();
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
    applyTimeRange: undefined,
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
  const [applyTimeStart, applyTimeEnd] = Array.isArray(values.applyTimeRange)
    ? values.applyTimeRange
    : [undefined, undefined];

  loading.value = true;
  try {
    const result = await getInvoiceApplicationGroupForSettlement({
      settlementId,
      currencyId: props.currencyId,
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
    applyTimeRange: undefined,
  });
}

async function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  await fetchData();
}

function isItemChecked(
  item: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto,
) {
  return selectedItemIds.value.includes(item.invoiceApplicationItemId);
}

function isGroupAllChecked(
  items: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto[],
) {
  return items.length > 0 && items.every((item) => isItemChecked(item));
}

function isGroupIndeterminate(
  items: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto[],
) {
  const checkedCount = items.filter((item) => isItemChecked(item)).length;
  return checkedCount > 0 && checkedCount < items.length;
}

function handleSelectItem(
  item: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto,
  selected: boolean,
) {
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
  }
}

function handleSelectGroupItems(
  selected: boolean,
  items: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto[],
) {
  for (const item of items) {
    handleSelectItem(item, selected);
  }
}

function updateSettledAmount(
  item: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto,
  value: unknown,
) {
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

function validateSelection(): boolean {
  const items = selectedItems.value;
  if (items.length === 0) {
    message.warning('请先选择开票明细');
    return false;
  }

  const invalidItem = items.find((item) => {
    const amount = settledAmountMap.get(item.invoiceApplicationItemId) ?? 0;
    return !amount || amount <= 0;
  });
  if (invalidItem) {
    message.warning(
      `费用「${invalidItem.feeCode?.cnName || '-'}」结算金额必须大于0`,
    );
    return false;
  }

  // 同一费用在多张已开票申请间共享发票口径可结算余额，按费用聚合校验
  const consumedByFee = new Map<string, number>();
  const settleableByFee = new Map<string, number>();
  for (const item of items) {
    const amount = settledAmountMap.get(item.invoiceApplicationItemId) ?? 0;
    consumedByFee.set(
      item.orderFeeId,
      (consumedByFee.get(item.orderFeeId) ?? 0) + amount,
    );
    settleableByFee.set(item.orderFeeId, item.invoiceSettleableAmount ?? 0);
  }
  for (const [orderFeeId, consumed] of consumedByFee) {
    const settleable = settleableByFee.get(orderFeeId) ?? 0;
    if (consumed > settleable + 1e-6) {
      const item = items.find((i) => i.orderFeeId === orderFeeId);
      message.warning(
        `费用「${item?.feeCode?.cnName || '-'}」发票口径可结算余额不足，可用额度 ${formatAmount(settleable)}`,
      );
      return false;
    }
  }

  if (isRemainingOverLimit.value) {
    const availableAmount =
      props.bankStatementAmount - props.otherSettledAmount;
    message.warning(
      `本单结算净额 ${formatBankAmount(currentSelectionNet.value)} 已超过流水剩余可结算金额 ${formatBankAmount(availableAmount)}`,
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
      items: selectedItems.value.map((item) => ({
        invoiceApplicationItemId: item.invoiceApplicationItemId,
        settledAmount: settledAmountMap.get(item.invoiceApplicationItemId) ?? 0,
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
    title="选择开票申请并创建发票结算"
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
            style="width: 130px"
            @change="(value) => updateSettledAmount(item, value)"
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
        :show-total="(total) => `共 ${total} 张开票申请`"
        @change="handlePageChange"
      />
    </div>

    <div class="settlement-submit-bar">
      <div class="settlement-submit-bar__summary">
        <span>已选择 {{ selectedItemIds.length }} 条</span>
        <span
          >收款合计
          <strong>{{
            formatBankAmount(currentSelectionReceived)
          }}</strong></span
        >
        <span
          >付款合计
          <strong>{{ formatBankAmount(currentSelectionPaid) }}</strong></span
        >
        <span
          >本次净额
          <strong>{{ formatBankAmount(currentSelectionNet) }}</strong></span
        >
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
</style>
