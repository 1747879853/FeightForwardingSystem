<script lang="ts" setup>
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import {
  computed,
  nextTick,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue';

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
  addReceiveSettlement,
  getOrderFeeGroupForReceiveSettlement,
} from '#/api/settlement-management/receive-settlement-admin';
import { NestedDataTable } from '#/components/nested-data-table';
import {
  ensureExchangeRateCache,
  peekQuotedExchangeRate,
} from '#/utils/exchange-rate-cache';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import {
  ADD_FEE_SEARCH_DEFAULTS,
  buildFeeGroupSearchQuery,
  buildOrderRow,
  orderColumns,
  type SelectedReceiveFee,
  useAddFeeSearchSchema,
} from '../../settlement-management/receive-settlement/add-fee-drawer/data';
import {
  formatAmount,
  getPaySideColor,
  getPaySideLabel,
} from '../../settlement-management/receive-settlement/form-data';
import {
  buildExchangeRateInputs,
  collectForeignCurrencies,
  findMissingExchangeRate,
  isSameCurrencyId,
  missingExchangeRateMessage,
} from '../../settlement-management/receive-settlement/settlement-amount';
import {
  canSettleFeeInFull,
  netStatementUsage,
  roundMoney,
  statementBalance,
  suggestWriteOffAmount,
  toBankAmount,
  toOriginalAmount,
} from './fee-write-off';

function useBankStatementFeeSearchSchema() {
  return useAddFeeSearchSchema().map((item) => {
    if (item.fieldName === 'settlementName') {
      return { ...item, formItemClass: '!hidden' };
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
const orderList = ref<ReceiveSettlementAdminApi.ReceiveSettlementFeeGroupDto[]>(
  [],
);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const expandedRowKeys = ref<string[]>([]);
const tableMaxHeight = ref(640);

const selectedFeeIds = ref<string[]>([]);
/** 本行本次占用的流水币金额。提交时再除以汇率折回原币 */
const bankAmountMap = reactive(new Map<string, number>());
/** 同一原币共用一个结算汇率，和收费结算落库口径一致 */
const exchangeRates = reactive<Record<string, number | undefined>>({});

const [SearchForm, searchFormApi] = useVbenForm({
  actionButtonsReverse: true,
  actionWrapperClass: '!pb-0 !pt-1',
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelClass: 'text-xs text-gray-500 !justify-start',
    labelWidth: 64,
  },
  compact: true,
  handleReset: () => handleReset(),
  handleSubmit: (values) => handleSearch(values),
  layout: 'horizontal',
  resetButtonOptions: { content: '重置' },
  schema: useBankStatementFeeSearchSchema(),
  showDefaultActions: true,
  submitButtonOptions: { content: '查询' },
  submitOnChange: false,
  wrapperClass: 'grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-x-3 gap-y-1',
});

type FeeRow = ReceiveSettlementAdminApi.ReceiveSettlementFeeDto;

const tableRows = computed(() =>
  orderList.value.map((group) => buildOrderRow(group)),
);

const feeOrderColumns = [
  {
    key: 'feeSelect',
    title: '',
    width: 44,
    align: 'center' as const,
    className: 'fee-select-col',
  },
  ...orderColumns,
  {
    key: 'pendingAmount',
    title: '待核金额',
    width: 220,
  },
];

const bankFeeColumns = [
  {
    key: 'checkbox',
    title: '',
    width: 44,
    align: 'center' as const,
    className: 'fee-select-col',
  },
  {
    dataIndex: 'feeCodeName',
    key: 'feeCodeName',
    title: '费用名称',
    width: 140,
  },
  {
    dataIndex: 'paySide',
    key: 'paySide',
    title: '收付',
    width: 72,
  },
  {
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    title: '原币',
    width: 72,
  },
  {
    dataIndex: 'amount',
    key: 'amount',
    title: '费用总额',
    width: 110,
    align: 'right' as const,
  },
  {
    dataIndex: 'remainingAmount',
    key: 'remainingAmount',
    title: '剩余原币',
    width: 110,
    align: 'right' as const,
  },
  {
    key: 'exchangeRate',
    title: '结算汇率',
    width: 132,
  },
  {
    key: 'bankEquivalent',
    title: '折合流水币',
    width: 140,
    align: 'right' as const,
  },
  {
    key: 'bankSettled',
    title: '本次结算',
    width: 280,
    className: 'bank-settled-col',
  },
];

function getRowFees(record: { orderFees?: FeeRow[] }) {
  return record.orderFees ?? [];
}

const pageFees = computed(() =>
  orderList.value.flatMap((group) => group.orderFees ?? []),
);

const availableAmount = computed(() =>
  roundMoney(props.bankStatementAmount - props.otherSettledAmount),
);

const statementCurrencyLabel = computed(() => props.currencyCode || '流水币');

function formatGrouped(value: number | null | undefined) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return '-';
  }
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatWithCode(value: number | null | undefined, code?: string) {
  const text = formatGrouped(value);
  if (text === '-') return text;
  return code ? `${text} ${code}` : text;
}

function feeCurrencyId(fee: FeeRow) {
  const id = fee.currencyId ?? fee.currency?.id;
  if (id == null || id === '') return undefined;
  return String(id);
}

function feeCurrencyCode(fee: FeeRow) {
  return fee.currency?.code || '';
}

function isSameStatementCurrency(fee: FeeRow) {
  if (isSameCurrencyId(feeCurrencyId(fee), props.currencyId)) return true;
  return (
    !props.currencyId &&
    !!feeCurrencyCode(fee) &&
    !!props.currencyCode &&
    feeCurrencyCode(fee) === props.currencyCode
  );
}

function rateInputValue(fee: FeeRow) {
  const id = feeCurrencyId(fee);
  if (!id) return undefined;
  return exchangeRates[id];
}

function lineRate(fee: FeeRow) {
  if (isSameStatementCurrency(fee)) return 1;
  const id = feeCurrencyId(fee);
  if (!id) return undefined;
  const rate = exchangeRates[id];
  return rate != null && rate > 0 ? rate : undefined;
}

function bankCap(fee: FeeRow) {
  const rate = lineRate(fee);
  if (!rate) return null;
  return toBankAmount(fee.remainingAmount ?? 0, rate);
}

function isFeeChecked(fee: FeeRow) {
  return selectedFeeIds.value.includes(fee.id);
}

function walkSelectedFees() {
  const selectedSet = new Set(selectedFeeIds.value);
  const rows: Array<{ fee: FeeRow; groupId?: string }> = [];
  for (const group of orderList.value) {
    for (const fee of group.orderFees ?? []) {
      if (!selectedSet.has(fee.id)) continue;
      rows.push({ fee, groupId: group.transportOrder.id });
    }
  }
  return rows;
}

function statementRoomFor(feeId: string) {
  let used = 0;
  for (const { fee } of walkSelectedFees()) {
    if (fee.id === feeId) continue;
    const amount = bankAmountMap.get(fee.id);
    if (amount == null) continue;
    used += fee.paySide === 1 ? -amount : amount;
  }
  return roundMoney(availableAmount.value - used);
}

const selectedLines = computed(() => {
  return walkSelectedFees().map(({ fee }) => {
    const bankAmount = bankAmountMap.get(fee.id);
    const rate = lineRate(fee);
    const original =
      bankAmount != null && rate ? toOriginalAmount(bankAmount, rate) : null;
    return { fee, bankAmount, rate, original };
  });
});

const activeLines = computed(() =>
  selectedLines.value.filter(
    (line) => line.bankAmount != null && line.bankAmount > 0 && line.rate,
  ),
);

const usedStatementAmount = computed(() =>
  netStatementUsage(
    activeLines.value.map((line) => ({
      paySide: line.fee.paySide,
      bankAmount: line.bankAmount ?? 0,
    })),
  ),
);

const balanceInfo = computed(() =>
  statementBalance(availableAmount.value, usedStatementAmount.value),
);

const originalSummaries = computed(() => {
  const totals = new Map<string, number>();
  for (const line of activeLines.value) {
    if (line.original == null) continue;
    const code = feeCurrencyCode(line.fee) || '原币';
    const signed = line.fee.paySide === 1 ? -line.original : line.original;
    totals.set(code, (totals.get(code) ?? 0) + signed);
  }
  return [...totals.entries()].map(([code, amount]) => ({
    code,
    amount: roundMoney(amount),
  }));
});

const originalSummaryText = computed(() => {
  if (originalSummaries.value.length === 0) return '-';
  return originalSummaries.value
    .map((item) => formatWithCode(item.amount, item.code))
    .join(' · ');
});

const confirmBlocked = computed(() => {
  if (activeLines.value.length === 0) return true;
  if (balanceInfo.value.status === 'over') return true;
  if (!(usedStatementAmount.value > 0)) return true;
  return selectedLines.value.some((line) => {
    const amount = line.bankAmount ?? 0;
    if (!(amount > 0)) return false;
    if (!line.rate || line.original == null || !(line.original > 0))
      return true;
    return line.original > (line.fee.remainingAmount ?? 0) + 0.001;
  });
});

function updateTableMaxHeight() {
  tableMaxHeight.value = Math.max(480, Math.round(window.innerHeight - 300));
}

function resetSelection() {
  selectedFeeIds.value = [];
  bankAmountMap.clear();
}

function resetState() {
  orderList.value = [];
  totalCount.value = 0;
  currentPage.value = 1;
  expandedRowKeys.value = [];
  resetSelection();
  for (const key of Object.keys(exchangeRates)) {
    delete exchangeRates[key];
  }
}

async function syncSearchFormFromProps() {
  await nextTick();
  await searchFormApi.setValues({
    settlementName: props.settlementName || '',
    currencyId: undefined,
    paySide: ADD_FEE_SEARCH_DEFAULTS.paySide,
  });
}

async function resetSearchFilters() {
  await nextTick();
  await searchFormApi.setValues({
    settlementName: props.settlementName || '',
    currencyId: undefined,
    ...ADD_FEE_SEARCH_DEFAULTS,
  });
}

async function initSearchForm() {
  await nextTick();
  await searchFormApi.resetForm();
  await syncSearchFormFromProps();
}

async function primeVisibleRates() {
  await ensureExchangeRateCache();
  for (const fee of pageFees.value) {
    const id = feeCurrencyId(fee);
    if (!id) continue;
    if (isSameStatementCurrency(fee)) {
      exchangeRates[id] = 1;
      continue;
    }
    const currentRate = exchangeRates[id];
    if (currentRate != null && currentRate > 0) continue;
    const quoted = peekQuotedExchangeRate(id, fee.paySide, props.currencyId);
    if (quoted != null && quoted > 0) {
      exchangeRates[id] = quoted;
    }
  }
}

async function fetchData(formValues?: Record<string, any>) {
  const settlementId = props.settlementId;
  if (!settlementId) return;

  const values = formValues ?? ((await searchFormApi.getValues()) || {});

  loading.value = true;
  try {
    const result = await getOrderFeeGroupForReceiveSettlement({
      settlementId,
      ...buildFeeGroupSearchQuery(values),
      pageIndex: currentPage.value,
      pageSize: pageSize.value,
    });
    orderList.value = result.items ?? [];
    totalCount.value = result.totalCount ?? 0;
    expandedRowKeys.value = [];
    resetSelection();
    await primeVisibleRates();
  } finally {
    loading.value = false;
  }
}

async function handleSearch(values?: Record<string, any>) {
  if (!props.settlementId) {
    message.warning('银行流水未关联结算对象');
    return;
  }
  currentPage.value = 1;
  await fetchData(values);
}

async function handleReset() {
  currentPage.value = 1;
  await resetSearchFilters();
  await fetchData();
}

async function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  await fetchData();
}

function isGroupAllChecked(fees: FeeRow[]) {
  return fees.length > 0 && fees.every((fee) => isFeeChecked(fee));
}

function isGroupIndeterminate(fees: FeeRow[]) {
  const checkedCount = fees.filter((fee) => isFeeChecked(fee)).length;
  return checkedCount > 0 && checkedCount < fees.length;
}

const isPageAllChecked = computed(() => isGroupAllChecked(pageFees.value));
const isPageIndeterminate = computed(() =>
  isGroupIndeterminate(pageFees.value),
);

function expandRow(id?: string) {
  if (!id || expandedRowKeys.value.includes(id)) return;
  expandedRowKeys.value = [...expandedRowKeys.value, id];
}

function ensureSelected(fee: FeeRow) {
  if (!selectedFeeIds.value.includes(fee.id)) {
    selectedFeeIds.value = [...selectedFeeIds.value, fee.id];
  }
}

function applySuggestedAmount(fee: FeeRow) {
  const cap = bankCap(fee);
  const fill = suggestWriteOffAmount({
    cap,
    paySide: fee.paySide,
    room: statementRoomFor(fee.id),
  });
  if (fill == null) {
    bankAmountMap.delete(fee.id);
    return;
  }
  bankAmountMap.set(fee.id, fill);
}

function handleSelectFee(fee: FeeRow, selected: boolean) {
  if (selected) {
    ensureSelected(fee);
    if (!bankAmountMap.has(fee.id)) {
      applySuggestedAmount(fee);
    }
    return;
  }
  selectedFeeIds.value = selectedFeeIds.value.filter((id) => id !== fee.id);
  bankAmountMap.delete(fee.id);
}

function handleSelectGroupFees(selected: boolean, fees: FeeRow[]) {
  for (const fee of fees) {
    handleSelectFee(fee, selected);
  }
}

function handleSelectAllPageFees(selected: boolean) {
  if (selected) {
    expandedRowKeys.value = tableRows.value
      .map((row) => row.id)
      .filter((id): id is string => !!id);
  }
  handleSelectGroupFees(selected, pageFees.value);
}

function selectOrder(
  selected: boolean,
  record: { id?: string; orderFees?: FeeRow[] },
) {
  if (selected) expandRow(record.id);
  handleSelectGroupFees(selected, getRowFees(record));
}

function updateBankAmount(fee: FeeRow, value: unknown) {
  const numericValue =
    value == null || value === '' ? undefined : Number(value);
  if (numericValue == null || !Number.isFinite(numericValue)) {
    bankAmountMap.delete(fee.id);
    return;
  }
  ensureSelected(fee);
  const cap = bankCap(fee);
  const next =
    cap != null && numericValue > cap
      ? cap
      : roundMoney(Math.max(0, numericValue));
  bankAmountMap.set(fee.id, next);
}

function onRateChange(fee: FeeRow, value: unknown) {
  const id = feeCurrencyId(fee);
  if (!id || isSameStatementCurrency(fee)) return;
  const numericValue =
    value == null || value === '' ? undefined : Number(value);
  exchangeRates[id] =
    numericValue != null && Number.isFinite(numericValue) && numericValue > 0
      ? numericValue
      : undefined;

  for (const { fee: row } of walkSelectedFees()) {
    if (feeCurrencyId(row) !== id) continue;
    const cap = bankCap(row);
    if (!bankAmountMap.has(row.id)) {
      applySuggestedAmount(row);
      continue;
    }
    const current = bankAmountMap.get(row.id) ?? 0;
    if (cap != null && current > cap) {
      bankAmountMap.set(row.id, cap);
    }
  }
}

function fillRemainder(fee: FeeRow) {
  const cap = bankCap(fee);
  if (cap == null) {
    message.warning('请先填写结算汇率');
    return;
  }
  const fill = suggestWriteOffAmount({
    cap,
    paySide: 0,
    room: statementRoomFor(fee.id),
  });
  if (fill == null) {
    message.warning('流水剩余可用不足');
    return;
  }
  ensureSelected(fee);
  bankAmountMap.set(fee.id, fill);
}

function settleFeeInFull(fee: FeeRow) {
  const cap = bankCap(fee);
  if (cap == null || !(cap > 0)) {
    message.warning('请先填写结算汇率');
    return;
  }
  ensureSelected(fee);
  bankAmountMap.set(fee.id, cap);
}

function canFillRemainder(fee: FeeRow) {
  const cap = bankCap(fee);
  return (
    suggestWriteOffAmount({
      cap,
      paySide: 0,
      room: statementRoomFor(fee.id),
    }) != null
  );
}

function canFillFull(fee: FeeRow) {
  const cap = bankCap(fee);
  if (cap == null) return false;
  return canSettleFeeInFull({
    cap,
    paySide: fee.paySide,
    room: statementRoomFor(fee.id),
  });
}

function originalHint(fee: FeeRow) {
  if (isSameStatementCurrency(fee)) return '';
  const amount = bankAmountMap.get(fee.id);
  const rate = lineRate(fee);
  if (!rate) return '请先填写结算汇率';
  if (amount == null || !(amount > 0)) return '';
  const original = toOriginalAmount(amount, rate);
  if (original == null) return '';
  return `折合 ${feeCurrencyCode(fee) || '原币'}: ${formatGrouped(original)}`;
}

function convertedRemainingText(fee: FeeRow) {
  const converted = bankCap(fee);
  if (converted == null) return '-';
  return formatWithCode(converted, statementCurrencyLabel.value);
}

interface PendingChip {
  amount: number;
  code: string;
  side: string;
}

function pendingChips(fees: FeeRow[]): PendingChip[] {
  const groups = new Map<string, PendingChip>();
  for (const fee of fees) {
    const side = fee.paySide === 1 ? '应付' : '应收';
    const code = feeCurrencyCode(fee) || '原币';
    const key = `${side}|${code}`;
    const current = groups.get(key);
    groups.set(key, {
      side,
      code,
      amount: (current?.amount ?? 0) + (fee.remainingAmount || 0),
    });
  }
  return [...groups.values()];
}

function buildSelectedFees(): SelectedReceiveFee[] {
  const result: SelectedReceiveFee[] = [];
  for (const group of orderList.value) {
    for (const fee of group.orderFees ?? []) {
      if (!selectedFeeIds.value.includes(fee.id)) continue;
      const bankAmount = bankAmountMap.get(fee.id) ?? 0;
      const rate = lineRate(fee);
      const original =
        rate && bankAmount > 0 ? toOriginalAmount(bankAmount, rate) : null;
      if (original == null || !(original > 0)) continue;
      result.push({
        orderFeeId: fee.id,
        transportOrderId: group.transportOrder.id,
        commissionNum: group.transportOrder.commissionNum,
        mblNum: group.transportOrder.mblNum,
        bookingNum: group.transportOrder.bookingNum,
        clientName: group.transportOrder.client?.name,
        feeCodeName: fee.feeCode?.cnName,
        paySide: fee.paySide,
        currencyId: fee.currencyId ?? fee.currency?.id,
        currencyCode: fee.currency?.code,
        amount: fee.amount,
        remainingAmount: fee.remainingAmount,
        settlementName: fee.settlement?.name,
        settledAmount: original ?? 0,
      });
    }
  }
  return result;
}

function validateSelection(fees: SelectedReceiveFee[]): boolean {
  if (fees.length === 0) {
    message.warning('请先选择费用');
    return false;
  }

  const invalidFee = fees.find(
    (fee) => !fee.settledAmount || fee.settledAmount <= 0,
  );
  if (invalidFee) {
    message.warning(
      `费用「${invalidFee.feeCodeName || '-'}」请填写本次结算金额`,
    );
    return false;
  }

  const overLimitFee = fees.find(
    (fee) => fee.settledAmount > fee.remainingAmount + 0.001,
  );
  if (overLimitFee) {
    message.warning(
      `费用「${overLimitFee.feeCodeName || '-'}」折合原币不能超过剩余额度 ${formatAmount(overLimitFee.remainingAmount)}`,
    );
    return false;
  }

  const missingCurrency = fees.find(
    (fee) =>
      fee.currencyCode &&
      props.currencyCode &&
      fee.currencyCode !== props.currencyCode &&
      (fee.currencyId == null || fee.currencyId === ''),
  );
  if (missingCurrency) {
    message.warning(
      `费用「${missingCurrency.feeCodeName || '-'}」缺少币别，无法填写汇率`,
    );
    return false;
  }

  const foreignCurrencies = collectForeignCurrencies(
    fees,
    props.currencyId,
    props.currencyCode,
  );
  const missingRate = findMissingExchangeRate(foreignCurrencies, exchangeRates);
  if (missingRate) {
    message.warning(missingExchangeRateMessage(missingRate.currencyCode));
    return false;
  }

  if (!(usedStatementAmount.value > 0)) {
    message.warning('本次核销金额必须大于 0');
    return false;
  }

  if (balanceInfo.value.status === 'over') {
    message.warning(
      `超出可用流水 ${formatWithCode(Math.abs(balanceInfo.value.balance), statementCurrencyLabel.value)}`,
    );
    return false;
  }

  return true;
}

async function handleCreateSettlement() {
  const fees = buildSelectedFees();
  if (!validateSelection(fees)) return;

  if (!props.orgId) {
    message.warning('缺少归属组织，无法创建结算单');
    return;
  }
  if (!props.currencyId) {
    message.warning('银行流水未关联币别');
    return;
  }

  creating.value = true;
  try {
    const foreignCurrencies = collectForeignCurrencies(
      fees,
      props.currencyId,
      props.currencyCode,
    );
    await addReceiveSettlement({
      orgId: props.orgId,
      bankStatementId: props.bankStatementId,
      settlementTime: dayjs().toISOString(),
      actualSettled: usedStatementAmount.value,
      receiveSettlementExchangeRates: buildExchangeRateInputs(
        foreignCurrencies,
        exchangeRates,
      ),
      receiveSettlementItems: fees.map((fee) => ({
        orderFeeId: fee.orderFeeId,
        settledAmount: fee.settledAmount,
        remark: fee.remark || undefined,
      })),
    });
    message.success('创建结算单成功');
    markListShouldRefresh('ReceiveSettlementList');
    markListShouldRefresh('BankStatementList');
    resetSelection();
    await fetchData();
    emit('created');
  } catch (error: any) {
    message.error(error.message || '创建结算单失败');
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
  updateTableMaxHeight();
  window.addEventListener('resize', updateTableMaxHeight);
  await initSearchForm();
  if (props.settlementId) {
    await fetchData();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', updateTableMaxHeight);
});

defineExpose({ reload });
</script>

<template>
  <Card size="small" class="create-settlement-fee-panel">
    <div class="fee-toolbar">
      <SearchForm />
    </div>

    <NestedDataTable
      :columns="feeOrderColumns"
      :data-source="tableRows"
      :loading="loading"
      :max-height="tableMaxHeight"
      :inner-columns="bankFeeColumns"
      inner-data-key="orderFees"
      :inner-row-key="(record) => record.id"
      row-key="id"
      v-model:expanded-row-keys="expandedRowKeys"
    >
      <template #outerHeaderCell="{ column }">
        <template v-if="column.key === 'feeSelect'">
          <Checkbox
            :checked="isPageAllChecked"
            :indeterminate="isPageIndeterminate"
            :disabled="pageFees.length === 0"
            @change="(e) => handleSelectAllPageFees(e.target.checked)"
          />
        </template>
        <template v-else>{{ column.title }}</template>
      </template>

      <template #outerBodyCell="{ column, record, text }">
        <template v-if="column.key === 'feeSelect'">
          <Checkbox
            :checked="isGroupAllChecked(getRowFees(record))"
            :indeterminate="isGroupIndeterminate(getRowFees(record))"
            :disabled="getRowFees(record).length === 0"
            @change="(e) => selectOrder(e.target.checked, record)"
          />
        </template>
        <template v-else-if="column.key === 'totalRemainingAmount'">
          {{ formatAmount(record.totalRemainingAmount) }}
        </template>
        <template v-else-if="column.key === 'pendingAmount'">
          <div class="pending-capsules">
            <span
              v-for="chip in pendingChips(getRowFees(record))"
              :key="`${chip.side}-${chip.code}`"
              class="pending-capsule"
            >
              待核{{ chip.side }}: {{ formatWithCode(chip.amount, chip.code) }}
            </span>
            <span v-if="pendingChips(getRowFees(record)).length === 0">-</span>
          </div>
        </template>
        <template v-else>
          {{ text || '-' }}
        </template>
      </template>

      <template #innerHeaderCell="{ column }">
        {{ column.title }}
      </template>

      <template #innerBodyCell="{ column, record: fee }">
        <template v-if="column.key === 'checkbox'">
          <Checkbox
            :checked="isFeeChecked(fee)"
            @change="(e) => handleSelectFee(fee, e.target.checked)"
          />
        </template>
        <template v-else-if="column.key === 'feeCodeName'">
          {{ fee.feeCode?.cnName || '-' }}
        </template>
        <template v-else-if="column.key === 'paySide'">
          <Tag :color="getPaySideColor(fee.paySide)">
            {{ getPaySideLabel(fee.paySide) }}
          </Tag>
        </template>
        <template v-else-if="column.key === 'currencyCode'">
          <Tag v-if="fee.currency?.code">{{ fee.currency.code }}</Tag>
          <span v-else>-</span>
        </template>
        <template v-else-if="column.key === 'amount'">
          {{ formatGrouped(fee.amount) }}
        </template>
        <template v-else-if="column.key === 'remainingAmount'">
          {{ formatGrouped(fee.remainingAmount) }}
        </template>
        <template v-else-if="column.key === 'exchangeRate'">
          <InputNumber
            v-if="isSameStatementCurrency(fee)"
            :value="1"
            disabled
            size="small"
            :precision="4"
            class="rate-input"
          />
          <InputNumber
            v-else
            :value="rateInputValue(fee)"
            :min="0"
            :precision="4"
            :step="0.0001"
            size="small"
            placeholder="汇率"
            class="rate-input"
            title="同一币别共用结算汇率"
            @change="(value) => onRateChange(fee, value)"
          />
        </template>
        <template v-else-if="column.key === 'bankEquivalent'">
          {{ convertedRemainingText(fee) }}
        </template>
        <template v-else-if="column.key === 'bankSettled'">
          <div class="settle-cell">
            <div class="settle-cell__row">
              <InputNumber
                :value="
                  bankAmountMap.has(fee.id)
                    ? bankAmountMap.get(fee.id)
                    : undefined
                "
                :min="0"
                :max="bankCap(fee) ?? undefined"
                :precision="2"
                size="small"
                :placeholder="statementCurrencyLabel"
                class="settle-input"
                @change="(value) => updateBankAmount(fee, value)"
              />
              <span class="settle-suffix">{{ statementCurrencyLabel }}</span>
              <button
                type="button"
                class="settle-link"
                :disabled="!canFillRemainder(fee)"
                @click="fillRemainder(fee)"
              >
                填入剩余流水
              </button>
              <button
                type="button"
                class="settle-link"
                :disabled="!canFillFull(fee)"
                @click="settleFeeInFull(fee)"
              >
                全额结清
              </button>
            </div>
            <div v-if="originalHint(fee)" class="settle-hint">
              {{ originalHint(fee) }}
            </div>
          </div>
        </template>
      </template>
    </NestedDataTable>

    <div class="mt-3 flex justify-end">
      <Pagination
        :current="currentPage"
        :page-size="pageSize"
        :total="totalCount"
        show-size-changer
        :show-total="(total) => `共 ${total} 条业务`"
        @change="handlePageChange"
      />
    </div>

    <div class="settlement-submit-bar">
      <div class="settlement-submit-bar__summary">
        <span>已选 {{ activeLines.length }} 笔费用</span>
        <span>
          本次核销
          <strong>{{
            formatWithCode(usedStatementAmount, statementCurrencyLabel)
          }}</strong>
        </span>
        <span class="settlement-submit-bar__split"
          >折合原币 {{ originalSummaryText }}</span
        >
        <span
          class="settlement-submit-bar__balance"
          :class="{
            'is-over': balanceInfo.status === 'over',
            'is-settled': balanceInfo.status === 'settled',
          }"
        >
          <template v-if="balanceInfo.status === 'over'">
            超出可用流水
            {{
              formatWithCode(
                Math.abs(balanceInfo.balance),
                statementCurrencyLabel,
              )
            }}
          </template>
          <template v-else-if="balanceInfo.status === 'settled'">
            流水结余 {{ formatWithCode(0, statementCurrencyLabel) }}
            <em class="balance-tag">完全结清</em>
          </template>
          <template v-else-if="balanceInfo.status === 'partial'">
            部分核销，结余
            {{ formatWithCode(balanceInfo.balance, statementCurrencyLabel) }}
          </template>
          <template v-else>
            流水结余
            {{ formatWithCode(balanceInfo.balance, statementCurrencyLabel) }}
          </template>
        </span>
      </div>
      <div class="settlement-submit-bar__actions">
        <Button @click="emit('cancel')">取消</Button>
        <Button
          type="primary"
          :loading="creating"
          :disabled="confirmBlocked"
          @click="handleCreateSettlement"
        >
          确认核销
        </Button>
      </div>
    </div>
  </Card>
</template>

<style scoped lang="scss">
.create-settlement-fee-panel {
  :deep(.ant-card-body) {
    padding-top: 12px;
  }

  :deep(.nested-data-table__expanded) {
    padding: 8px 10px 10px 88px;
    background: #fafafa;
  }

  :deep(.nested-data-table__expanded-row > td) {
    background: #fafafa;
  }

  :deep(.nested-data-table__inner) {
    background: #fff;
    border: 1px solid #f0f0f0;
    border-radius: 6px;
  }

  :deep(.nested-data-table__inner td) {
    height: auto;
    min-height: 36px;
    padding-top: 6px;
    padding-bottom: 6px;
    overflow: visible;
    vertical-align: middle;
    white-space: normal;
  }

  :deep(td.bank-settled-col) {
    overflow: visible;
  }
}

.fee-toolbar {
  margin-bottom: 8px;

  :deep(.relative.flex.pb-2) {
    padding-bottom: 0;
  }
}

.create-settlement-fee-panel :deep(.fee-select-col) {
  padding-right: 4px;
  padding-left: 4px;
  overflow: visible;
}

.pending-capsules {
  display: flex;
  gap: 6px;
  align-items: center;
}

.pending-capsule {
  padding: 1px 8px;
  font-size: 12px;
  line-height: 20px;
  color: #1d4ed8;
  white-space: nowrap;
  background: #eff6ff;
  border-radius: 999px;
}

.rate-input {
  width: 112px;
}

.settle-cell__row {
  display: flex;
  gap: 6px;
  align-items: center;
}

.settle-input {
  width: 108px;
}

.settle-suffix {
  flex: none;
  font-size: 12px;
  font-weight: 600;
  color: #344054;
}

.settle-link {
  flex: none;
  padding: 0;
  font-size: 12px;
  color: #1677ff;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.settle-link:disabled {
  color: #c5ced6;
  cursor: not-allowed;
}

.settle-hint {
  margin-top: 2px;
  font-size: 12px;
  line-height: 16px;
  color: #98a2b3;
}

.settlement-submit-bar {
  position: sticky;
  bottom: -12px;
  z-index: 2;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  margin: 12px -12px -12px;
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
}

.settlement-submit-bar__split {
  padding-left: 14px;
  border-left: 1px solid #e3e8ef;
}

.settlement-submit-bar__balance {
  padding-left: 14px;
  font-variant-numeric: tabular-nums;
  border-left: 1px solid #e3e8ef;
}

.settlement-submit-bar__balance.is-over {
  font-weight: 600;
  color: #cf1322;
}

.settlement-submit-bar__balance.is-settled {
  color: #15803d;
}

.balance-tag {
  display: inline-block;
  padding: 0 6px;
  margin-left: 6px;
  font-size: 12px;
  font-style: normal;
  line-height: 18px;
  color: #15803d;
  background: #f0fdf4;
  border-radius: 999px;
}
</style>
