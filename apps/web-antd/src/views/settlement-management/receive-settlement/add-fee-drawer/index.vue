<script lang="ts" setup>
import { createDrawerSelectionQuery } from '#/utils/drawer-selection-query';

import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { computed, nextTick, reactive, ref, watch } from 'vue';

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

import { useVbenForm } from '#/adapter/form';
import { getOrderFeeGroupForReceiveSettlement } from '#/api/settlement-management/receive-settlement-admin';
import { useAntTableColumnResize } from '#/utils/table-column-resize';

import { formatAmount, getPaySideColor, getPaySideLabel } from '../form-data';
import {
  buildExchangeRateInputs,
  collectDisplayCurrencies,
  collectForeignCurrencies,
  findMissingExchangeRate,
  missingExchangeRateMessage,
} from '../settlement-amount';
import {
  type AddFeeDrawerProps,
  buildFeeGroupSearchQuery,
  buildOrderRow,
  orderColumns,
  type SelectedReceiveFee,
  useAddFeeSearchSchema,
} from './data';

const emit = defineEmits<{
  confirm: [
    fees: SelectedReceiveFee[],
    exchangeRates: ReturnType<typeof buildExchangeRateInputs>,
  ];
}>();

const open = ref(false);
const loading = ref(false);
const drawerProps = ref<AddFeeDrawerProps>({});
const orderList = ref<ReceiveSettlementAdminApi.ReceiveSettlementFeeGroupDto[]>(
  [],
);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const expandedRowKeys = ref<string[]>([]);

useAntTableColumnResize({
  containerSelector: '.receive-settlement-add-fee-drawer',
  enabled: open,
  dataVersion: orderList,
});

const selectedFeeIds = ref<string[]>([]);
const settledAmountMap = reactive(new Map<string, number>());
const remarkMap = reactive(new Map<string, string>());
const exchangeRates = reactive<Record<string, number | undefined>>({});
const selectionQuery =
  createDrawerSelectionQuery<ReceiveSettlementAdminApi.ReceiveSettlementFeeGroupDto>(
    (row) => row.transportOrder.id,
    () => {
      selectedFeeIds.value = [];
      settledAmountMap.clear();
      remarkMap.clear();
      orderList.value = [];
    },
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
  actionWrapperClass: 'col-start-4 justify-end',
  actionPosition: 'right',
  resetButtonOptions: { show: false },
  submitButtonOptions: { show: false },
  submitOnChange: false,
  compact: true,
  wrapperClass: 'grid-cols-4',
});

const tableRows = computed(() =>
  orderList.value.map((group) => buildOrderRow(group)),
);
const disabledFeeIdSet = computed(
  () => new Set(drawerProps.value.selectedFeeIds ?? []),
);

const businessColumns = [
  {
    key: 'feeSelect',
    title: '',
    width: 48,
    align: 'center' as const,
  },
  ...orderColumns,
];

type FeeRow = ReceiveSettlementAdminApi.ReceiveSettlementFeeDto;

function selectableFees(fees: FeeRow[]) {
  return fees.filter((fee) => !disabledFeeIdSet.value.has(fee.id));
}

const pageSelectableFees = computed(() =>
  selectableFees(orderList.value.flatMap((group) => group.orderFees ?? [])),
);

function isFeesAllChecked(fees: FeeRow[]) {
  return (
    fees.length > 0 &&
    fees.every((fee) => selectedFeeIds.value.includes(fee.id))
  );
}

function isFeesIndeterminate(fees: FeeRow[]) {
  const checkedCount = fees.filter((fee) =>
    selectedFeeIds.value.includes(fee.id),
  ).length;
  return checkedCount > 0 && checkedCount < fees.length;
}

const feeColumns = [
  {
    dataIndex: 'feeCodeName',
    title: '费用名称',
    minWidth: 160,
  },
  {
    dataIndex: 'paySide',
    key: 'paySide',
    title: '收付类别',
    width: 90,
  },
  {
    dataIndex: 'currencyCode',
    title: '币别',
    width: 90,
  },
  {
    dataIndex: 'amount',
    title: '费用总额',
    width: 120,
    align: 'right' as const,
    customRender: ({ text }: { text: number }) => formatAmount(text),
  },
  {
    dataIndex: 'remainingAmount',
    title: '剩余额度',
    width: 120,
    align: 'right' as const,
    customRender: ({ text }: { text: number }) => formatAmount(text),
  },
  {
    dataIndex: 'settlementName',
    title: '结算对象',
    minWidth: 140,
  },
  {
    dataIndex: 'settledAmount',
    key: 'settledAmount',
    title: '本次结算金额',
    width: 160,
  },
];

async function openDrawer(props: AddFeeDrawerProps = {}) {
  drawerProps.value = props;
  open.value = true;
  resetState();
  await nextTick();
  await searchFormApi.resetForm();
  if (props.settlementId) {
    searchFormApi.setValues({
      settlementName: props.settlementName || '',
      currencyId: undefined,
      paySide: 0,
    });
    await fetchData();
  }
}

function resetState() {
  selectionQuery.reset();
  loading.value = false;
  orderList.value = [];
  totalCount.value = 0;
  currentPage.value = 1;
  expandedRowKeys.value = [];
  selectedFeeIds.value = [];
  settledAmountMap.clear();
  remarkMap.clear();
  for (const key of Object.keys(exchangeRates)) {
    delete exchangeRates[key];
  }
}

async function handleSearch() {
  if (!drawerProps.value.settlementId) {
    message.warning('银行流水未关联结算对象');
    return;
  }
  const values = (await searchFormApi.getValues()) ?? {};
  currentPage.value = 1;
  await fetchData(values);
}

async function fetchData(formValues?: Record<string, any>) {
  const settlementId = drawerProps.value.settlementId;
  if (!settlementId) return;

  const values = formValues ?? ((await searchFormApi.getValues()) || {});

  const params = {
    receiveSettlementId: drawerProps.value.receiveSettlementId,
    settlementId,
    ...buildFeeGroupSearchQuery(values),
    pageIndex: currentPage.value,
    pageSize: pageSize.value,
  };
  const request = selectionQuery.begin(params);
  loading.value = true;
  try {
    const result = await getOrderFeeGroupForReceiveSettlement(params);
    if (!selectionQuery.accept(request, result.items ?? [])) return;
    orderList.value = result.items ?? [];
    totalCount.value = result.totalCount ?? 0;
    expandedRowKeys.value = [];
  } finally {
    if (selectionQuery.isCurrent(request)) loading.value = false;
  }
}

async function handlePageChange(page: number, size: number) {
  currentPage.value = page;
  pageSize.value = size;
  await fetchData();
}

function getGroup(orderId: string) {
  return orderList.value.find((group) => group.transportOrder.id === orderId);
}

function handleSelectFee(
  fee: ReceiveSettlementAdminApi.ReceiveSettlementFeeDto,
  selected: boolean,
) {
  const disabledIds = disabledFeeIdSet.value;
  if (disabledIds.has(fee.id)) return;

  if (selected) {
    selectedFeeIds.value = [...new Set([...selectedFeeIds.value, fee.id])];
    if (!settledAmountMap.has(fee.id)) {
      settledAmountMap.set(fee.id, fee.remainingAmount ?? 0);
    }
  } else {
    selectedFeeIds.value = selectedFeeIds.value.filter((id) => id !== fee.id);
    settledAmountMap.delete(fee.id);
    remarkMap.delete(fee.id);
  }
}

function handleSelectAllFees(
  selected: boolean,
  rows: ReceiveSettlementAdminApi.ReceiveSettlementFeeDto[],
) {
  for (const fee of selectableFees(rows)) {
    handleSelectFee(fee, selected);
  }
}

function updateSettledAmount(
  fee: ReceiveSettlementAdminApi.ReceiveSettlementFeeDto,
  value: unknown,
) {
  if (disabledFeeIdSet.value.has(fee.id)) return;

  const numericValue = Number(value ?? 0);
  settledAmountMap.set(
    fee.id,
    Number.isFinite(numericValue) ? numericValue : 0,
  );

  if (!selectedFeeIds.value.includes(fee.id)) {
    selectedFeeIds.value = [...selectedFeeIds.value, fee.id];
  }
}

function buildSelectedFees(): SelectedReceiveFee[] {
  const selectedSet = new Set(selectedFeeIds.value);
  const result: SelectedReceiveFee[] = [];

  for (const group of selectionQuery.rows) {
    for (const fee of group.orderFees ?? []) {
      if (!selectedSet.has(fee.id)) continue;
      const settledAmount = settledAmountMap.get(fee.id) ?? 0;
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
        settledAmount,
        remark: remarkMap.get(fee.id) || undefined,
      });
    }
  }

  return result;
}

const foreignCurrencies = computed(() =>
  collectForeignCurrencies(
    buildSelectedFees(),
    drawerProps.value.currencyId,
    drawerProps.value.currencyCode,
  ),
);

const displayCurrencies = computed(() =>
  collectDisplayCurrencies(
    buildSelectedFees(),
    drawerProps.value.currencyId,
    drawerProps.value.currencyCode,
  ),
);

watch(displayCurrencies, (rows) => {
  for (const row of rows) {
    if (row.locked) continue;
    if (!(row.currencyId in exchangeRates)) {
      exchangeRates[row.currencyId] = undefined;
    }
  }
});

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

  const overLimitFee = fees.find(
    (fee) => fee.settledAmount > fee.remainingAmount,
  );
  if (overLimitFee) {
    message.warning(
      `费用「${overLimitFee.feeCodeName || '-'}」结算金额不能超过剩余额度 ${formatAmount(overLimitFee.remainingAmount)}`,
    );
    return;
  }

  const missingCurrency = fees.find(
    (fee) =>
      fee.currencyCode &&
      drawerProps.value.currencyCode &&
      fee.currencyCode !== drawerProps.value.currencyCode &&
      (fee.currencyId == null || fee.currencyId === ''),
  );
  if (missingCurrency) {
    message.warning(
      `费用「${missingCurrency.feeCodeName || '-'}」缺少币别，无法填写汇率`,
    );
    return;
  }

  const missingRate = findMissingExchangeRate(
    foreignCurrencies.value,
    exchangeRates,
  );
  if (missingRate) {
    message.warning(missingExchangeRateMessage(missingRate.currencyCode));
    return;
  }

  emit(
    'confirm',
    fees,
    buildExchangeRateInputs(foreignCurrencies.value, exchangeRates),
  );
  open.value = false;
}

defineExpose({ open: openDrawer });
</script>

<template>
  <Drawer
    v-model:open="open"
    title="添加结算明细"
    width="1100px"
    destroy-on-close
  >
    <div class="receive-settlement-add-fee-drawer">
      <div class="mb-3">
        <SearchForm>
          <template #expand-after>
            <Button @click="handleSearch">查询</Button>
            <Button type="primary" :disabled="loading" @click="handleConfirm"
              >确认添加</Button
            >
          </template>
        </SearchForm>
      </div>

      <Table
        :columns="businessColumns"
        :data-source="tableRows"
        :loading="loading"
        :pagination="false"
        :row-key="(record) => record.id"
        v-model:expanded-row-keys="expandedRowKeys"
        size="small"
        bordered
        :scroll="{ x: 1680 }"
      >
        <template #headerCell="{ column }">
          <Checkbox
            v-if="column.key === 'feeSelect'"
            :checked="isFeesAllChecked(pageSelectableFees)"
            :indeterminate="isFeesIndeterminate(pageSelectableFees)"
            :disabled="pageSelectableFees.length === 0"
            @change="
              (event) =>
                handleSelectAllFees(event.target.checked, pageSelectableFees)
            "
          />
          <template v-else-if="typeof column.title === 'string'">
            {{ column.title }}
          </template>
        </template>
        <template #bodyCell="{ column, record }">
          <Checkbox
            v-if="column.key === 'feeSelect'"
            :checked="isFeesAllChecked(selectableFees(record.orderFees ?? []))"
            :indeterminate="
              isFeesIndeterminate(selectableFees(record.orderFees ?? []))
            "
            :disabled="selectableFees(record.orderFees ?? []).length === 0"
            @click.stop
            @change="
              (event) =>
                handleSelectAllFees(
                  event.target.checked,
                  record.orderFees ?? [],
                )
            "
          />
          <template v-else-if="column.dataIndex === 'totalRemainingAmount'">
            {{ formatAmount(record.totalRemainingAmount) }}
          </template>
          <template v-else>
            {{ record[column.dataIndex] || '-' }}
          </template>
        </template>
        <template #expandedRowRender="{ record }">
          <Table
            :columns="feeColumns"
            :data-source="getGroup(record.id)?.orderFees ?? []"
            :pagination="false"
            :row-key="(fee) => fee.id"
            :row-selection="{
              selectedRowKeys: selectedFeeIds,
              getCheckboxProps: (fee) => ({
                disabled: disabledFeeIdSet.has(fee.id),
              }),
              onSelect: handleSelectFee,
              onSelectAll: (selected, _selectedRows, changeRows) =>
                handleSelectAllFees(selected, changeRows),
            }"
            size="small"
            bordered
          >
            <template #bodyCell="{ column, record: fee }">
              <template v-if="column.dataIndex === 'feeCodeName'">
                {{ fee.feeCode?.cnName || '-' }}
              </template>
              <template v-else-if="column.key === 'paySide'">
                <Tag :color="getPaySideColor(fee.paySide)">
                  {{ getPaySideLabel(fee.paySide) }}
                </Tag>
              </template>
              <template v-else-if="column.dataIndex === 'currencyCode'">
                <Tag v-if="fee.currency?.code">{{ fee.currency.code }}</Tag>
                <span v-else>-</span>
              </template>
              <template v-else-if="column.dataIndex === 'settlementName'">
                {{ fee.settlement?.name || '-' }}
              </template>
              <template v-else-if="column.key === 'settledAmount'">
                <InputNumber
                  :value="
                    settledAmountMap.get(fee.id) ?? fee.remainingAmount ?? 0
                  "
                  :min="0"
                  :max="fee.remainingAmount"
                  :precision="2"
                  :disabled="disabledFeeIdSet.has(fee.id)"
                  style="width: 130px"
                  @change="(value) => updateSettledAmount(fee, value)"
                />
              </template>
            </template>
          </Table>
        </template>
      </Table>

      <div v-if="displayCurrencies.length" class="exchange-rate-bar">
        <div
          v-for="row in displayCurrencies"
          :key="row.currencyId"
          class="exchange-rate-bar__row"
        >
          <span>1 {{ row.currencyCode }} =</span>
          <InputNumber
            v-if="row.locked"
            :value="1"
            :disabled="true"
            :precision="6"
            style="width: 140px"
          />
          <InputNumber
            v-else
            v-model:value="exchangeRates[row.currencyId]"
            :min="0"
            :precision="6"
            :step="0.000001"
            placeholder="汇率"
            style="width: 140px"
          />
          <span>{{ drawerProps.currencyCode || '流水币别' }}</span>
        </div>
      </div>

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
    </div>
  </Drawer>
</template>

<style scoped>
.exchange-rate-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.exchange-rate-bar__row {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
