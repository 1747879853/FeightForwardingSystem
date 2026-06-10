<script lang="ts" setup>
import type { ReceiveSettlementAdminApi } from '#/api/settlement-management/receive-settlement-admin';

import { computed, nextTick, reactive, ref } from 'vue';

import {
  Button,
  Drawer,
  InputNumber,
  message,
  Pagination,
  Table,
  Tag,
} from 'ant-design-vue';

import { useVbenForm } from '#/adapter/form';
import { getOrderFeeGroupForReceiveSettlement } from '#/api/settlement-management/receive-settlement-admin';

import { formatAmount } from '../form-data';
import {
  type AddFeeDrawerProps,
  buildOrderRow,
  orderColumns,
  type SelectedReceiveFee,
  useAddFeeSearchSchema,
} from './data';

const emit = defineEmits<{
  confirm: [fees: SelectedReceiveFee[]];
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

const selectedFeeIds = ref<string[]>([]);
const settledAmountMap = reactive(new Map<string, number>());
const remarkMap = reactive(new Map<string, string>());

const [SearchForm, searchFormApi] = useVbenForm({
  commonConfig: {
    componentProps: { class: 'w-full' },
  },
  layout: 'horizontal',
  schema: useAddFeeSearchSchema(),
  showDefaultActions: false,
  submitOnChange: false,
  compact: true,
  wrapperClass: 'grid-cols-3',
});

const tableRows = computed(() =>
  orderList.value.map((group) => buildOrderRow(group)),
);
const disabledFeeIdSet = computed(
  () => new Set(drawerProps.value.selectedFeeIds ?? []),
);

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
    title: '本次结算金额',
    width: 160,
    slots: { customRender: 'settledAmount' },
  },
];

async function openDrawer(props: AddFeeDrawerProps = {}) {
  drawerProps.value = props;
  open.value = true;
  resetState();
  await nextTick();
  await searchFormApi.resetForm();
  if (props.settlementId) {
    searchFormApi.setValues({ settlementId: props.settlementId });
    await fetchData();
  }
}

function resetState() {
  orderList.value = [];
  totalCount.value = 0;
  currentPage.value = 1;
  expandedRowKeys.value = [];
  selectedFeeIds.value = [];
  settledAmountMap.clear();
  remarkMap.clear();
}

async function handleSearch() {
  const values = (await searchFormApi.getValues()) ?? {};
  if (!values.settlementId) {
    message.warning('请先选择结算对象');
    return;
  }
  currentPage.value = 1;
  await fetchData(values);
}

async function fetchData(formValues?: Record<string, any>) {
  const values = formValues ?? ((await searchFormApi.getValues()) || {});
  if (!values.settlementId) return;

  loading.value = true;
  try {
    const result = await getOrderFeeGroupForReceiveSettlement({
      receiveSettlementId: drawerProps.value.receiveSettlementId,
      settlementId: values.settlementId,
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
  for (const fee of rows) {
    handleSelectFee(fee, selected);
  }
}

function updateSettledAmount(feeId: string, value: unknown) {
  const numericValue = Number(value ?? 0);
  settledAmountMap.set(feeId, Number.isFinite(numericValue) ? numericValue : 0);
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
        clientName: group.transportOrder.clientName,
        feeCodeName: fee.feeCodeName,
        currencyCode: fee.currencyCode,
        amount: fee.amount,
        remainingAmount: fee.remainingAmount,
        settlementName: fee.settlementName,
        settledAmount,
        remark: remarkMap.get(fee.id) || undefined,
      });
    }
  }

  return result;
}

function handleConfirm() {
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

  emit('confirm', fees);
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
    <div class="mb-3">
      <SearchForm />
      <div class="mt-2 flex justify-end gap-2">
        <Button @click="handleSearch">查询</Button>
        <Button type="primary" @click="handleConfirm">确认添加</Button>
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
            getCheckboxProps: (fee) => ({
              disabled: disabledFeeIdSet.has(fee.id),
            }),
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
            <template v-if="column.dataIndex === 'settledAmount'">
              <InputNumber
                :value="settledAmountMap.get(fee.id)"
                :min="0"
                :max="fee.remainingAmount"
                :precision="2"
                :disabled="
                  !selectedFeeIds.includes(fee.id) ||
                  disabledFeeIdSet.has(fee.id)
                "
                style="width: 130px"
                @change="(value) => updateSettledAmount(fee.id, value)"
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
  </Drawer>
</template>
