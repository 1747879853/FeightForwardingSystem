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
import dayjs from 'dayjs';

import { useVbenForm } from '#/adapter/form';
import { getInvoiceApplicationGroupForSettlement } from '#/api/settlement-management/receive-settlement-admin';

import { formatAmount, getPaySideColor, getPaySideLabel } from '../form-data';
import {
  type AddInvoiceDrawerProps,
  buildInvoiceGroupRow,
  invoiceGroupColumns,
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
    labelWidth: 72,
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

const itemColumns = [
  {
    dataIndex: 'commissionNum',
    title: '委托编号',
    width: 140,
  },
  {
    dataIndex: 'mblNum',
    title: '主提单号',
    width: 140,
  },
  {
    dataIndex: 'feeCodeName',
    title: '费用名称',
    minWidth: 140,
  },
  {
    dataIndex: 'paySide',
    key: 'paySide',
    title: '收付',
    width: 80,
  },
  {
    dataIndex: 'currencyCode',
    title: '币别',
    width: 80,
  },
  {
    dataIndex: 'amount',
    title: '费用总额',
    width: 110,
    align: 'right' as const,
    customRender: ({ text }: { text: number }) => formatAmount(text),
  },
  {
    dataIndex: 'appliedAmount',
    title: '本单开票额',
    width: 110,
    align: 'right' as const,
    customRender: ({ text }: { text: number }) => formatAmount(text),
  },
  {
    dataIndex: 'invoiceSettleableAmount',
    title: '发票可结算余额',
    width: 130,
    align: 'right' as const,
    customRender: ({ text }: { text: number }) => formatAmount(text),
  },
  {
    dataIndex: 'settledAmount',
    key: 'settledAmount',
    title: '本次结算金额',
    width: 150,
  },
];

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

function getGroup(applicationId: string) {
  return groupList.value.find(
    (group) => group.invoiceApplicationId === applicationId,
  );
}

function handleSelectItem(
  item: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto,
  selected: boolean,
) {
  if (disabledItemIdSet.value.has(item.invoiceApplicationItemId)) return;

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

function handleSelectAllItems(
  selected: boolean,
  rows: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto[],
) {
  for (const item of rows) {
    handleSelectItem(item, selected);
  }
}

function updateSettledAmount(
  item: ReceiveSettlementAdminApi.InvoiceAppSettleItemDto,
  value: unknown,
) {
  if (disabledItemIdSet.value.has(item.invoiceApplicationItemId)) return;

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
        feeCodeName: item.feeCodeName,
        currencyCode: item.currencyCode,
        paySide: item.paySide,
        amount: item.amount,
        invoicedAmount: item.invoicedAmount,
        settledAmount: settledAmountMap.get(item.invoiceApplicationItemId) ?? 0,
        invoiceSettleableAmount: item.invoiceSettleableAmount,
        settlementName: item.settlementName,
        transportOrderId: order?.id,
        commissionNum: order?.commissionNum,
        mblNum: order?.mblNum,
        bookingNum: order?.bookingNum,
        clientName: order?.clientName,
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

defineExpose({ open: openDrawer });
</script>

<template>
  <Drawer
    v-model:open="open"
    title="添加开票结算明细"
    width="1200px"
    destroy-on-close
  >
    <div class="mb-3">
      <SearchForm />
      <div class="drawer-actions">
        <Button @click="handleSearch">查询</Button>
        <Button type="primary" @click="handleConfirm">确认添加</Button>
      </div>
    </div>

    <Table
      :columns="invoiceGroupColumns"
      :data-source="tableRows"
      :loading="loading"
      :pagination="false"
      :row-key="(record) => record.id"
      v-model:expanded-row-keys="expandedRowKeys"
      size="small"
      bordered
      :scroll="{ x: 950 }"
    >
      <template #expandedRowRender="{ record }">
        <Table
          :columns="itemColumns"
          :data-source="getGroup(record.id)?.items ?? []"
          :pagination="false"
          :row-key="(item) => item.invoiceApplicationItemId"
          :row-selection="{
            selectedRowKeys: selectedItemIds,
            getCheckboxProps: (item) => ({
              disabled: disabledItemIdSet.has(item.invoiceApplicationItemId),
            }),
            onSelect: handleSelectItem,
            onSelectAll: handleSelectAllItems,
          }"
          size="small"
          bordered
        >
          <template #bodyCell="{ column, record: item }">
            <template v-if="column.dataIndex === 'commissionNum'">
              {{ item.transportOrder?.commissionNum || '-' }}
            </template>
            <template v-else-if="column.dataIndex === 'mblNum'">
              {{ item.transportOrder?.mblNum || '-' }}
            </template>
            <template v-else-if="column.key === 'paySide'">
              <Tag :color="getPaySideColor(item.paySide)">
                {{ getPaySideLabel(item.paySide) }}
              </Tag>
            </template>
            <template v-else-if="column.dataIndex === 'currencyCode'">
              <Tag v-if="item.currencyCode">{{ item.currencyCode }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.key === 'settledAmount'">
              <InputNumber
                :value="
                  settledAmountMap.get(item.invoiceApplicationItemId) ??
                  item.invoiceSettleableAmount ??
                  0
                "
                :min="0"
                :max="item.invoiceSettleableAmount"
                :precision="2"
                :disabled="disabledItemIdSet.has(item.invoiceApplicationItemId)"
                style="width: 130px"
                @change="
                  (value) =>
                    updateSettledAmount(
                      item as ReceiveSettlementAdminApi.InvoiceAppSettleItemDto,
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
        :show-total="(total) => `共 ${total} 张开票申请`"
        @change="handlePageChange"
      />
    </div>
  </Drawer>
</template>

<style scoped lang="scss">
.drawer-actions {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
