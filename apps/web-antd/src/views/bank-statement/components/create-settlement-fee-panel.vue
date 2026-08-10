<script lang="ts" setup>
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue';

import dayjs from 'dayjs';

import {
  Button,
  Card,
  InputNumber,
  message,
  Pagination,
  Table,
  Tag,
} from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import {
  addReceiveSettlement,
  getOrderFeeGroupForReceiveSettlement,
} from '#/api/settlement-management/receive-settlement-admin';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import {
  buildOrderRow,
  orderColumns,
  type SelectedReceiveFee,
  useAddFeeSearchSchema,
} from '../../settlement-management/receive-settlement/add-fee-drawer/data';
import { formatAmount } from '../../settlement-management/receive-settlement/form-data';

function useBankStatementFeeSearchSchema() {
  return useAddFeeSearchSchema().map((item) => {
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
const orderList = ref<ReceiveSettlementAdminApi.ReceiveSettlementFeeGroupDto[]>(
  [],
);
const totalCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const expandedRowKeys = ref<string[]>([]);

const selectedFeeIds = ref<string[]>([]);
const settledAmountMap = reactive(new Map<string, number>());

const [SearchForm, searchFormApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
    labelClass: 'text-xs text-gray-500 !justify-start',
    labelWidth: 64,
  },
  layout: 'horizontal',
  schema: useBankStatementFeeSearchSchema(),
  showDefaultActions: false,
  submitOnChange: false,
  compact: true,
  wrapperClass: 'grid-cols-2 gap-x-3',
});

const tableRows = computed(() =>
  orderList.value.map((group) => buildOrderRow(group)),
);

const currentSelectionTotal = computed(() =>
  selectedFeeIds.value.reduce(
    (sum, feeId) => sum + (settledAmountMap.get(feeId) ?? 0),
    0,
  ),
);

const remainingSettleAmount = computed(
  () =>
    props.bankStatementAmount -
    props.otherSettledAmount -
    currentSelectionTotal.value,
);

const isRemainingOverLimit = computed(() => remainingSettleAmount.value < 0);

const feeColumns = [
  {
    dataIndex: 'feeCodeName',
    title: '费用名称',
    minWidth: 160,
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

function formatBankAmount(value: number | undefined | null) {
  if (value === undefined || value === null) return '-';
  const amountText = formatAmount(value);
  return props.currencyCode
    ? `${amountText} ${props.currencyCode}`
    : amountText;
}

function resetSelection() {
  selectedFeeIds.value = [];
  settledAmountMap.clear();
}

function resetState() {
  orderList.value = [];
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
    commissionNum: '',
    mblNum: '',
  });
}

async function initSearchForm() {
  await nextTick();
  await searchFormApi.resetForm();
  await syncSearchFormFromProps();
}

async function fetchData(formValues?: Record<string, any>) {
  const settlementId = props.settlementId;
  const currencyId = props.currencyId;
  if (!settlementId || !currencyId) return;

  const values = formValues ?? ((await searchFormApi.getValues()) || {});

  loading.value = true;
  try {
    const result = await getOrderFeeGroupForReceiveSettlement({
      settlementId,
      currencyId,
      commissionNum: values.commissionNum || undefined,
      mblNum: values.mblNum || undefined,
      pageIndex: currentPage.value,
      pageSize: pageSize.value,
    });
    orderList.value = result.items ?? [];
    totalCount.value = result.totalCount ?? 0;
    expandedRowKeys.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleSearch() {
  if (!props.settlementId) {
    message.warning('银行流水未关联结算对象');
    return;
  }
  if (!props.currencyId) {
    message.warning('银行流水未关联币别');
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
    commissionNum: undefined,
    mblNum: undefined,
  });
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
  if (selected) {
    selectedFeeIds.value = [...new Set([...selectedFeeIds.value, fee.id])];
    if (!settledAmountMap.has(fee.id)) {
      settledAmountMap.set(fee.id, fee.remainingAmount ?? 0);
    }
  } else {
    selectedFeeIds.value = selectedFeeIds.value.filter((id) => id !== fee.id);
    settledAmountMap.delete(fee.id);
  }
}

function handleSelectAllFees(
  selected: boolean,
  rows: ReceiveSettlementAdminApi.ReceiveSettlementFeeDto[],
) {
  for (const fee of rows) {
    handleSelectFee(fee, selected);
  }
}

function updateSettledAmount(
  fee: ReceiveSettlementAdminApi.ReceiveSettlementFeeDto,
  value: unknown,
) {
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

  for (const group of orderList.value) {
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
        currencyCode: fee.currency?.code,
        amount: fee.amount,
        remainingAmount: fee.remainingAmount,
        settlementName: fee.settlement?.name,
        settledAmount,
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
      `费用「${invalidFee.feeCodeName || '-'}」结算金额必须大于0`,
    );
    return false;
  }

  const overLimitFee = fees.find(
    (fee) => fee.settledAmount > fee.remainingAmount,
  );
  if (overLimitFee) {
    message.warning(
      `费用「${overLimitFee.feeCodeName || '-'}」结算金额不能超过剩余额度 ${formatAmount(overLimitFee.remainingAmount)}`,
    );
    return false;
  }

  if (isRemainingOverLimit.value) {
    const availableAmount =
      props.bankStatementAmount - props.otherSettledAmount;
    message.warning(
      `本单结算合计 ${formatBankAmount(currentSelectionTotal.value)} 已超过流水剩余可结算金额 ${formatBankAmount(availableAmount)}`,
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

  creating.value = true;
  try {
    await addReceiveSettlement({
      orgId: props.orgId,
      bankStatementId: props.bankStatementId,
      settlementTime: dayjs().toISOString(),
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
  if (props.settlementId && props.currencyId) {
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
  if (props.settlementId && props.currencyId) {
    await fetchData();
  }
});

defineExpose({ reload });
</script>

<template>
  <Card
    title="选择费用并创建结算单"
    size="small"
    class="create-settlement-fee-panel"
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

    <Table
      :columns="orderColumns"
      :data-source="tableRows"
      :loading="loading"
      :pagination="false"
      :row-key="(record) => record.id"
      v-model:expanded-row-keys="expandedRowKeys"
      size="small"
      bordered
      :scroll="{ x: 900 }"
    >
      <template #expandedRowRender="{ record }">
        <Table
          :columns="feeColumns"
          :data-source="getGroup(record.id)?.orderFees ?? []"
          :pagination="false"
          :row-key="(fee) => fee.id"
          :row-selection="{
            selectedRowKeys: selectedFeeIds,
            onSelect: handleSelectFee,
            onSelectAll: handleSelectAllFees,
          }"
          size="small"
          bordered
        >
          <template #bodyCell="{ column, record: fee }">
            <template v-if="column.dataIndex === 'currencyCode'">
              <Tag v-if="fee.currencyCode">{{ fee.currencyCode }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-if="column.key === 'settledAmount'">
              <InputNumber
                :value="
                  settledAmountMap.get(fee.id) ?? fee.remainingAmount ?? 0
                "
                :min="0"
                :max="fee.remainingAmount"
                :precision="2"
                style="width: 130px"
                @change="
                  (value) =>
                    updateSettledAmount(
                      fee as ReceiveSettlementAdminApi.ReceiveSettlementFeeDto,
                      value,
                    )
                "
              />
            </template>
          </template>
        </Table>
      </template>
    </Table>

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
        <span>已选择 {{ selectedFeeIds.length }} 条</span>
        <span>
          本次核销
          <strong>{{ formatBankAmount(currentSelectionTotal) }}</strong>
        </span>
        <span :class="{ 'text-red-600': isRemainingOverLimit }">
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
.create-settlement-fee-panel {
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
  gap: 16px;
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
</style>
