<script lang="ts" setup>
import { PaymentApplicationAdminApi } from '#/api/settlement-management/payment-application-admin';

import { computed, nextTick, reactive, ref } from 'vue';

import { useThrottleFn } from '@vueuse/core';
import dayjs from 'dayjs';
import {
  Button,
  Checkbox,
  Drawer,
  InputNumber,
  message,
  Pagination,
  Table,
  Tag,
} from 'ant-design-vue';

import { CurrencySelect } from '#/adapter/component';
import { useVbenForm } from '#/adapter/form';
import { getOrderFeeGroupAsync } from '#/api/settlement-management/payment-application-admin';
import { $t } from '#/locales';

import ExchangeRateModal from './exchange-rate-modal.vue';

import {
  type AddFeeDrawerProps,
  buildDynamicCurrencyColumns,
  buildFeeGroupKey,
  buildOrderRow,
  collectCurrencies,
  type CurrencyInfo,
  type FeeRowData,
  getPaySideLabel,
  type SelectedFeeItem,
  useAddFeeSearchSchema,
  useOrderFixedColumns,
} from './data';

const emit = defineEmits<{
  confirm: [fees: SelectedFeeItem[]];
  'update:settlementCurrencyId': [value: null | number];
  'update:settlementId': [value: string];
}>();

const open = ref(false);
const loading = ref(false);
const drawerProps = ref<AddFeeDrawerProps>({});

const orderList = ref<PaymentApplicationAdminApi.PayAppFeeGroupDto[]>([]);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);

const currencies = ref<CurrencyInfo[]>([]);
const tableRows = ref<Record<string, any>[]>([]);

/** 选中状态：groupKey -> Set<feeId> */
const selectionMap = reactive(new Map<string, Set<string>>());
/** 费用输入金额：feeId -> appliedAmount */
const appliedAmountMap = reactive(new Map<string, number>());

const expandedRowKeys = ref<string[]>([]);

const exchangeRateModalVisible = ref(false);
const pendingCurrencies = ref<CurrencyInfo[]>([]);
const settlementCurrencyName = ref('');
const currencySelectRef = ref();

function hasExistingFees(): boolean {
  return (drawerProps.value.selectedFeeIds?.length ?? 0) > 0;
}

const throttledAutoSearch = useThrottleFn(
  async (values: Record<string, any>) => {
    if (hasExistingFees() && !values.SettlementId) return;
    currentPage.value = 1;
    await checkSearchChanged();
    await fetchData(values);
  },
  800,
);

const [SearchForm, searchFormApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelWidth: 64,
  },
  layout: 'horizontal',
  schema: useAddFeeSearchSchema(),
  showDefaultActions: true,
  actionLayout: 'inline',
  actionWrapperClass: 'col-span-2 col-start-4 justify-end',
  actionPosition: 'right',
  submitButtonOptions: {
    content: $t('common.query'),
  },
  submitOnChange: false,
  compact: true,
  wrapperClass: 'grid-cols-5',
  handleSubmit: async (values) => {
    if (hasExistingFees() && !values.SettlementId) {
      message.warning(
        $t('seaExport.export.paymentApplication.noSettlementWarning'),
      );
      return;
    }
    currentPage.value = 1;
    await checkSearchChanged();
    await fetchData(values);
  },
  handleReset: async () => {
    const hasFees = (drawerProps.value.selectedFeeIds?.length ?? 0) > 0;
    const preservedSettlementId = hasFees
      ? drawerProps.value.settlementId
      : undefined;
    await searchFormApi.resetForm();
    clearSelection();
    lastSearchSnapshot = '';
    orderList.value = [];
    totalCount.value = 0;
    currencies.value = [];
    tableRows.value = [];
    expandedRowKeys.value = [];
    currentPage.value = 1;
    if (preservedSettlementId) {
      searchFormApi.setValues({ SettlementId: preservedSettlementId });
      await nextTick();
      await fetchData(await searchFormApi.getValues());
    }
  },
  handleValuesChange: (values) => {
    throttledAutoSearch(values);
  },
});

const fixedColumns = useOrderFixedColumns();

const dynamicColumns = computed(() =>
  buildDynamicCurrencyColumns(currencies.value),
);

const allColumns = computed(() => [...fixedColumns, ...dynamicColumns.value]);

const disabledFeeIds = computed(
  () => new Set(drawerProps.value.selectedFeeIds ?? []),
);
const isSettlementCurrencyLocked = computed(
  () => (drawerProps.value.selectedFeeIds?.length ?? 0) > 0,
);

function isFeeDisabled(feeId: string): boolean {
  return disabledFeeIds.value.has(feeId);
}

function resolveAppliedAmount(
  feeId: string,
  unSettledAmount?: number | null,
): number | undefined {
  if (appliedAmountMap.has(feeId)) {
    return appliedAmountMap.get(feeId);
  }
  if (isFeeDisabled(feeId)) {
    return undefined;
  }
  return unSettledAmount ?? 0;
}

function initDisabledFeeAppliedAmounts() {
  const amounts = drawerProps.value.selectedAppliedAmounts;
  if (!amounts) return;
  for (const feeId of drawerProps.value.selectedFeeIds ?? []) {
    const amount = amounts[feeId];
    if (amount != null) {
      appliedAmountMap.set(feeId, amount);
    }
  }
}

async function openDrawer(props: AddFeeDrawerProps = {}) {
  drawerProps.value = props;
  open.value = true;
  resetState();
  await nextTick();
  await searchFormApi.resetForm();
  await nextTick();
  if (props.settlementId) {
    searchFormApi.setValues({ SettlementId: props.settlementId });
    await nextTick();
  }
  const hasFees = hasExistingFees();
  searchFormApi.updateSchema([
    {
      fieldName: 'SettlementId',
      rules: hasFees ? 'required' : undefined,
      componentProps: {
        disabled: hasFees,
      },
    },
  ]);
  await fetchData(await searchFormApi.getValues());
  initDisabledFeeAppliedAmounts();
}

function resetState() {
  orderList.value = [];
  totalCount.value = 0;
  currentPage.value = 1;
  currencies.value = [];
  tableRows.value = [];
  selectionMap.clear();
  appliedAmountMap.clear();
  expandedRowKeys.value = [];
}

function clearSelection() {
  selectionMap.clear();
  appliedAmountMap.clear();
}

async function fetchData(formValues?: Record<string, any>) {
  const values = formValues ?? (await searchFormApi.getValues());
  if (hasExistingFees() && !values.SettlementId) return;

  const [etdStart, etdEnd] = Array.isArray(values.ETDRange)
    ? values.ETDRange
    : [undefined, undefined];

  const feeCodeMode = values.feeCodeMode ?? 'include';
  const feeCodeIds = values.FeeCodeIds;

  const params: PaymentApplicationAdminApi.GetOrderFeeGroupParams = {
    SettlementId: values.SettlementId,
    OrgId: values.OrgId,
    Keyword: values.Keyword,
    ETDStart: etdStart ? dayjs(etdStart).toISOString() : undefined,
    ETDEnd: etdEnd ? dayjs(etdEnd).toISOString() : undefined,
    CurrencyId: values.CurrencyId,
    FeeCodeIds: feeCodeMode === 'include' ? feeCodeIds : undefined,
    ExceptFeeCodeIds: feeCodeMode === 'exclude' ? feeCodeIds : undefined,
    PageIndex: currentPage.value,
    PageSize: pageSize.value,
  };

  loading.value = true;
  try {
    const result = await getOrderFeeGroupAsync(params);
    orderList.value = result.items ?? [];
    totalCount.value = result.totalCount ?? 0;

    currencies.value = collectCurrencies(orderList.value);
    tableRows.value = orderList.value.map((order) =>
      buildOrderRow(order, currencies.value),
    );
    expandedRowKeys.value = [];
  } finally {
    loading.value = false;
  }
}

async function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  await fetchData();
}

// --- Checkbox 联动逻辑 ---

function resolveGroupKey(
  group: PaymentApplicationAdminApi.PayAppFeeGroupDto,
): string {
  const settlementId =
    group.settlementId ?? group.orderFees?.[0]?.settlementId ?? '';
  return buildFeeGroupKey(group.id, settlementId);
}

function findGroupByKey(
  groupKey: string,
): PaymentApplicationAdminApi.PayAppFeeGroupDto | undefined {
  return orderList.value.find((g) => resolveGroupKey(g) === groupKey);
}

function getGroupFees(
  groupKey: string,
): PaymentApplicationAdminApi.OrderFeeDto[] {
  return findGroupByKey(groupKey)?.orderFees ?? [];
}

function isGroupChecked(groupKey: string): boolean {
  const fees = getGroupFees(groupKey);
  if (fees.length === 0) return false;
  const selected = selectionMap.get(groupKey);
  if (!selected) return false;
  return fees.every((f) => selected.has(f.id));
}

function isGroupIndeterminate(groupKey: string): boolean {
  const fees = getGroupFees(groupKey);
  const selected = selectionMap.get(groupKey);
  if (!selected || selected.size === 0) return false;
  const allChecked = fees.every((f) => selected.has(f.id));
  return !allChecked;
}

function toggleGroup(groupKey: string, checked: boolean) {
  const fees = getGroupFees(groupKey);
  const disabledIds = disabledFeeIds.value;
  if (checked) {
    const set = new Set<string>();
    for (const fee of fees) {
      set.add(fee.id);
      if (!disabledIds.has(fee.id) && !appliedAmountMap.has(fee.id)) {
        appliedAmountMap.set(fee.id, fee.unSettledAmount ?? 0);
      }
    }
    selectionMap.set(groupKey, set);
  } else {
    const existing = selectionMap.get(groupKey);
    if (existing) {
      const kept = new Set<string>();
      for (const feeId of existing) {
        if (disabledIds.has(feeId)) kept.add(feeId);
      }
      if (kept.size > 0) {
        selectionMap.set(groupKey, kept);
      } else {
        selectionMap.delete(groupKey);
      }
    }
  }
}

function isFeeChecked(groupKey: string, feeId: string): boolean {
  return selectionMap.get(groupKey)?.has(feeId) ?? false;
}

function toggleFee(groupKey: string, feeId: string, checked: boolean) {
  if (!selectionMap.has(groupKey)) {
    selectionMap.set(groupKey, new Set());
  }
  const set = selectionMap.get(groupKey)!;
  if (checked) {
    set.add(feeId);
    const fee = getGroupFees(groupKey).find((f) => f.id === feeId);
    if (fee && !isFeeDisabled(feeId) && !appliedAmountMap.has(feeId)) {
      appliedAmountMap.set(feeId, fee.unSettledAmount ?? 0);
    }
  } else {
    set.delete(feeId);
    if (set.size === 0) {
      selectionMap.delete(groupKey);
    }
  }
}

function setAppliedAmount(feeId: string, value: number | null) {
  appliedAmountMap.set(feeId, value ?? 0);
}

function getFeeRows(groupKey: string): FeeRowData[] {
  const fees = getGroupFees(groupKey);
  return fees.map((f) => ({
    ...f,
    appliedAmount: resolveAppliedAmount(f.id, f.unSettledAmount) ?? 0,
  }));
}

// --- 搜索条件变化清空选择 ---
let lastSearchSnapshot = '';

async function checkSearchChanged() {
  const values = await searchFormApi.getValues();
  const snapshot = JSON.stringify({
    SettlementId: values?.SettlementId,
    OrgId: values?.OrgId,
    Keyword: values?.Keyword,
    CurrencyId: values?.CurrencyId,
  });
  if (lastSearchSnapshot && snapshot !== lastSearchSnapshot) {
    clearSelection();
    initDisabledFeeAppliedAmounts();
  }
  lastSearchSnapshot = snapshot;
}

// --- 汇总选中费用 ---

function getSelectedFees(): SelectedFeeItem[] {
  const result: SelectedFeeItem[] = [];
  const disabled = disabledFeeIds.value;
  const seen = new Set<string>();
  const hasUserAttribute = (
    userAttribute: number | undefined,
    target: PaymentApplicationAdminApi.UserAttribute,
  ) => typeof userAttribute === 'number' && (userAttribute & target) === target;
  const getOrderUserNamesByAttribute = (
    orderUsers: PaymentApplicationAdminApi.OrderUserDto[] | undefined,
    target: PaymentApplicationAdminApi.UserAttribute,
  ) =>
    (orderUsers ?? [])
      .filter((user) => hasUserAttribute(user.userAttribute, target))
      .map((user) => user.userNickName)
      .filter((name): name is string => Boolean(name))
      .join('、');
  for (const [groupKey, feeIds] of selectionMap.entries()) {
    const order = findGroupByKey(groupKey);
    const saleUserNames = getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Sale,
    );
    const operationUserNames = getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.Operation,
    );
    const customerServiceUserNames = getOrderUserNamesByAttribute(
      order?.orderUsers,
      PaymentApplicationAdminApi.UserAttribute.CustomerService,
    );
    const fees = getGroupFees(groupKey);
    for (const fee of fees) {
      if (feeIds.has(fee.id) && !disabled.has(fee.id) && !seen.has(fee.id)) {
        seen.add(fee.id);
        result.push({
          feeId: fee.id,
          transportOrderId: fee.transportOrderId,
          commissionNum: order?.commissionNum,
          mblNum: order?.mblNum,
          clientName: order?.clientName,
          accountDate: order?.accountDate,
          etd: order?.etd,
          polName: order?.polName,
          podName: order?.podName,
          saleUserNames,
          operationUserNames,
          customerServiceUserNames,
          paySide: fee.paySide,
          feeCodeId: fee.feeCodeId,
          feeCodeName: fee.feeCodeName,
          currencyId: fee.currencyId,
          currencyCode: fee.currencyCode,
          currencyName: fee.currencyName,
          settlementId: fee.settlementId,
          settlementName: fee.settlementName,
          amount: fee.amount,
          settledAmount: fee.settledAmount,
          unSettledAmount: fee.unSettledAmount,
          appliedAmount: resolveAppliedAmount(fee.id, fee.unSettledAmount) ?? 0,
        });
      }
    }
  }
  return result;
}

function resolveSettlementCurrencyName(targetId: number): string {
  const fromCurrencies = currencies.value.find(
    (c) => c.currencyId === targetId,
  );
  if (fromCurrencies) return fromCurrencies.currencyCode;
  for (const order of orderList.value) {
    for (const fee of order.orderFees ?? []) {
      if (fee.currencyId === targetId) {
        return fee.currencyCode ?? fee.currencyName ?? '';
      }
    }
  }
  if (currencySelectRef.value) {
    const options = currencySelectRef.value.getOptions?.() ?? [];
    const opt = options.find((o: any) => o.value === targetId);
    if (opt) return opt.label;
  }
  return '';
}

function handleConfirm() {
  const selected = getSelectedFees();
  if (selected.length === 0) {
    message.warning('请至少选择一条费用');
    return;
  }

  const curSettlementCurrencyId = drawerProps.value.settlementCurrencyId;
  if (curSettlementCurrencyId != null) {
    const diffCurrencies = new Map<number, string>();
    for (const fee of selected) {
      if (fee.currencyId !== curSettlementCurrencyId) {
        diffCurrencies.set(
          fee.currencyId,
          fee.currencyCode ?? fee.currencyName ?? '',
        );
      }
    }
    if (diffCurrencies.size > 0) {
      pendingCurrencies.value = [...diffCurrencies.entries()].map(
        ([currencyId, currencyCode]) => ({ currencyId, currencyCode }),
      );
      settlementCurrencyName.value = resolveSettlementCurrencyName(
        curSettlementCurrencyId,
      );
      exchangeRateModalVisible.value = true;
      return;
    }
  }

  emitResult(selected);
}

function handleExchangeRateConfirm(rateMap: Map<number, number>) {
  const selected = getSelectedFees();
  for (const fee of selected) {
    const rate = rateMap.get(fee.currencyId);
    if (rate !== undefined) {
      fee.exchangeRate = rate;
    }
  }
  emitResult(selected);
}

async function emitResult(fees: SelectedFeeItem[]) {
  const values = await searchFormApi.getValues();
  const settlementId = values.SettlementId ?? fees[0]?.settlementId;
  if (settlementId) {
    emit('update:settlementId', String(settlementId));
  }
  emit('confirm', fees);
  open.value = false;
}

function handleCancel() {
  open.value = false;
}

function onSettlementCurrencyChange(val: number | string | null) {
  const nextValue =
    val === 'original' || val === null || val === undefined
      ? null
      : Number(val);
  drawerProps.value = {
    ...drawerProps.value,
    settlementCurrencyId: nextValue,
  };
  emit('update:settlementCurrencyId', nextValue);
}

const feeColumns = [
  {
    title: '',
    dataIndex: 'checkbox',
    key: 'checkbox',
    width: 40,
  },
  {
    title: '收付类型',
    dataIndex: 'paySide',
    key: 'paySide',
    width: 80,
  },
  {
    title: '费用名称',
    dataIndex: 'feeCodeName',
    key: 'feeCodeName',
    width: 120,
  },
  {
    title: '币别',
    dataIndex: 'currencyCode',
    key: 'currencyCode',
    width: 80,
  },
  {
    title: '金额',
    dataIndex: 'amount',
    key: 'amount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '未结金额',
    dataIndex: 'unSettledAmount',
    key: 'unSettledAmount',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '本次结算',
    dataIndex: 'appliedAmount',
    key: 'appliedAmount',
    width: 130,
    align: 'right' as const,
  },
];

function formatAmount(val: number | undefined | null): string {
  if (val == null) return '';
  return Number(val).toFixed(2);
}

function formatMonth(val: string | undefined | null): string {
  if (!val) return '';
  return dayjs(val).isValid() ? dayjs(val).format('YYYY-MM') : '';
}

function onFeeCheckChange(groupKey: string, feeId: string, e: any) {
  toggleFee(groupKey, feeId, e.target.checked);
}

function onGroupCheckChange(groupKey: string, e: any) {
  toggleGroup(groupKey, e.target.checked);
}

function onExpandClick(record: any, e: Event, onExpand: Function) {
  e.stopPropagation();
  onExpand(record, e);
}

function onAppliedAmountChange(feeId: string, val: number | null) {
  setAppliedAmount(feeId, val);
}

function onExpandedRowsChange(keys: readonly string[]) {
  expandedRowKeys.value = [...keys];
}

function onPageChange(page: number, size: number) {
  handlePageChange(page, size);
}

defineExpose({ open: openDrawer });
</script>

<template>
  <Drawer
    :open="open"
    title="添加费用"
    :width="1200"
    :destroy-on-close="true"
    placement="right"
    @close="handleCancel"
  >
    <!-- 搜索区域 -->
    <div class="mb-4">
      <SearchForm />
    </div>

    <!-- 主体区域 -->
    <div class="mb-2 flex items-center gap-3">
      <div class="text-base font-semibold">费用明细</div>
      <span class="text-sm text-gray-500">结算币别</span>
      <CurrencySelect
        ref="currencySelectRef"
        :model-value="drawerProps.settlementCurrencyId"
        :extra-options="[{ label: '按原票币', value: null }]"
        :disabled="isSettlementCurrencyLocked"
        size="small"
        style="width: 160px"
        @update:model-value="onSettlementCurrencyChange"
      />
    </div>

    <!-- 主表格（业务列表） -->
    <div class="fee-order-table">
      <Table
        :columns="allColumns"
        :data-source="tableRows"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 'max-content', y: 500 }"
        row-key="groupKey"
        size="small"
        :expanded-row-keys="expandedRowKeys"
        @expanded-rows-change="onExpandedRowsChange"
      >
        <!-- 序号列前加 checkbox -->
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.type === 'seq'">
            {{ index + 1 + (currentPage - 1) * pageSize }}
          </template>
          <template
            v-else-if="column.field && column.field.startsWith('currency_')"
          >
            {{ formatAmount(record[column.field]) }}
          </template>
          <template v-else-if="column.field === 'accountDate'">
            {{ formatMonth(record.accountDate) }}
          </template>
          <template v-else>
            {{ column.field ? record[column.field] : '' }}
          </template>
        </template>

        <!-- 展开行内容：费用子表格 -->
        <template #expandedRowRender="{ record }">
          <div class="expanded-fee-table p-2">
            <Table
              :columns="feeColumns"
              :data-source="getFeeRows(record.groupKey)"
              :pagination="false"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record: feeRecord }">
                <template v-if="column.key === 'checkbox'">
                  <Checkbox
                    :checked="isFeeChecked(record.groupKey, feeRecord.id)"
                    :disabled="disabledFeeIds.has(feeRecord.id)"
                    @change="
                      (e) => onFeeCheckChange(record.groupKey, feeRecord.id, e)
                    "
                  />
                </template>
                <template v-else-if="column.key === 'paySide'">
                  <Tag :color="feeRecord.paySide === 0 ? 'blue' : 'orange'">
                    {{ getPaySideLabel(feeRecord.paySide) }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'currencyCode'">
                  <Tag v-if="feeRecord.currencyCode">
                    {{ feeRecord.currencyCode }}
                  </Tag>
                  <span v-else>{{ feeRecord.currencyName }}</span>
                </template>
                <template v-else-if="column.key === 'amount'">
                  {{ formatAmount(feeRecord.amount) }}
                </template>
                <template v-else-if="column.key === 'unSettledAmount'">
                  {{ formatAmount(feeRecord.unSettledAmount) }}
                </template>
                <template v-else-if="column.key === 'appliedAmount'">
                  <InputNumber
                    :value="
                      resolveAppliedAmount(
                        feeRecord.id,
                        feeRecord.unSettledAmount,
                      )
                    "
                    :disabled="disabledFeeIds.has(feeRecord.id)"
                    :precision="2"
                    size="small"
                    class="w-full"
                    @change="(val) => onAppliedAmountChange(feeRecord.id, val)"
                  />
                </template>
                <template v-else>
                  {{ feeRecord[column.dataIndex] }}
                </template>
              </template>
            </Table>
          </div>
        </template>

        <!-- 展开图标列前加入 checkbox 列 -->
        <template #expandColumnTitle>
          <span />
        </template>
        <template #expandIcon="{ expanded, record, onExpand }">
          <div class="flex items-center gap-1">
            <Checkbox
              :checked="isGroupChecked(record.groupKey)"
              :indeterminate="isGroupIndeterminate(record.groupKey)"
              @change="(e) => onGroupCheckChange(record.groupKey, e)"
            />
            <span
              class="expand-toggle cursor-pointer"
              :class="{ 'expand-toggle--expanded': expanded }"
              @click="(e) => onExpandClick(record, e, onExpand)"
            >
              &#9654;
            </span>
          </div>
        </template>
      </Table>

      <!-- 分页 -->
      <div class="mt-2 flex justify-end">
        <Pagination
          :current="currentPage"
          :page-size="pageSize"
          :total="totalCount"
          size="small"
          show-size-changer
          show-quick-jumper
          @change="onPageChange"
        />
      </div>
    </div>

    <!-- 底部操作栏 -->
    <template #footer>
      <div class="flex justify-end gap-2">
        <Button @click="handleCancel">取消</Button>
        <Button type="primary" @click="handleConfirm">添加到申请单</Button>
      </div>
    </template>

    <!-- 汇率录入弹窗 -->
    <ExchangeRateModal
      :open="exchangeRateModalVisible"
      :currencies="pendingCurrencies"
      :settlement-currency-id="drawerProps.settlementCurrencyId"
      :settlement-currency-name="settlementCurrencyName"
      @confirm="handleExchangeRateConfirm"
      @update:open="(val) => (exchangeRateModalVisible = val)"
    />
  </Drawer>
</template>

<style scoped>
.fee-order-table :deep(.ant-table-container::before),
.fee-order-table :deep(.ant-table-container::after) {
  box-shadow: none !important;
}

.fee-order-table :deep(.ant-table-expanded-row > td) {
  padding: 4px 8px;
  background: #fff;
}

.fee-order-table :deep(.ant-table-body) {
  overflow-y: auto !important;
  scrollbar-gutter: stable;
}

.expanded-fee-table {
  overflow-x: auto;
}

.expanded-fee-table :deep(.ant-table-wrapper) {
  width: max-content;
  max-width: none;
}

.expanded-fee-table :deep(.ant-table-container::before),
.expanded-fee-table :deep(.ant-table-container::after) {
  box-shadow: none !important;
}

.expanded-fee-table :deep(.ant-table-thead > tr > th) {
  background: #fafafa;
}

.expanded-fee-table :deep(.ant-table-tbody > tr > td) {
  background: #fff;
}

.expanded-fee-table :deep(.ant-input-number-input) {
  text-align: right;
}

.expand-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  min-width: 14px;
  line-height: 1;
  transform-origin: center;
  transition: transform 0.15s ease;
}

.expand-toggle--expanded {
  transform: rotate(90deg);
}
</style>
