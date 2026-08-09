<script lang="ts" setup>
import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';

import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import { Alert, Empty, Spin, Table, Tag } from 'ant-design-vue';

import { getAirExportDetail } from '#/api/air-export/air-export-admin';
import { $t } from '#/locales';

/**
 * 只读费用总览。
 *
 * 空运出口本期不做费用增删改，详情接口已经把该票全部费用（含改单费用）带回来了，
 * 所以这里直接复用详情结果分方向展示，不再单独调费用模块的接口。
 */
defineOptions({ name: 'AirExportOrderFee' });

/** 编辑页保存成功后下发的最新详情：直接整体替换费用列表 */
const props = defineProps<{
  latestDetail?: AirExportAdminApi.AirExportDto;
}>();

const PAY_SIDE = { receive: 0, pay: 1 } as const;

const route = useRoute();
const loading = ref(false);
const fees = ref<AirExportAdminApi.OrderFeeDto[]>([]);

const airExportId = computed<string>(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] || '';
  return id ? String(id) : '';
});

const receivableFees = computed(() =>
  fees.value.filter((item) => item.paySide === PAY_SIDE.receive),
);
const payableFees = computed(() =>
  fees.value.filter((item) => item.paySide === PAY_SIDE.pay),
);

const optionLabel = (
  options: Array<{ label: string; value: number }>,
  value: null | number | undefined,
) => options.find((item) => item.value === value)?.label ?? '';

const feeStatusOptions = () => [
  {
    value: 0,
    label: $t('airExport.export.orderFee.feeStatusOptions.entering'),
  },
  {
    value: 1,
    label: $t('airExport.export.orderFee.feeStatusOptions.submitted'),
  },
  {
    value: 2,
    label: $t('airExport.export.orderFee.feeStatusOptions.approved'),
  },
  {
    value: 3,
    label: $t('airExport.export.orderFee.feeStatusOptions.rejected'),
  },
];

const settlementStatusOptions = () => [
  {
    value: 0,
    label: $t('airExport.export.orderFee.settlementStatusOptions.unsettled'),
  },
  {
    value: 1,
    label: $t('airExport.export.orderFee.settlementStatusOptions.partSettled'),
  },
  {
    value: 2,
    label: $t('airExport.export.orderFee.settlementStatusOptions.settled'),
  },
];

const invoiceStatusOptions = () => [
  {
    value: 0,
    label: $t('airExport.export.orderFee.invoiceStatusOptions.uninvoiced'),
  },
  {
    value: 1,
    label: $t('airExport.export.orderFee.invoiceStatusOptions.partInvoiced'),
  },
  {
    value: 2,
    label: $t('airExport.export.orderFee.invoiceStatusOptions.invoiced'),
  },
];

const dataEntryMethodOptions = () => [
  {
    value: 0,
    label: $t('airExport.export.orderFee.dataEntryMethodOptions.manual'),
  },
  {
    value: 1,
    label: $t('airExport.export.orderFee.dataEntryMethodOptions.history'),
  },
  {
    value: 2,
    label: $t('airExport.export.orderFee.dataEntryMethodOptions.receiveToPay'),
  },
  {
    value: 3,
    label: $t('airExport.export.orderFee.dataEntryMethodOptions.payToReceive'),
  },
  {
    value: 4,
    label: $t('airExport.export.orderFee.dataEntryMethodOptions.template'),
  },
  {
    value: 5,
    label: $t('airExport.export.orderFee.dataEntryMethodOptions.copy'),
  },
  {
    value: 6,
    label: $t('airExport.export.orderFee.dataEntryMethodOptions.preOrder'),
  },
];

const formatAmount = (value: null | number | undefined) => {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '';
  }
  return value.toFixed(2);
};

const formatMonth = (value: null | string | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;
};

/** 分方向合计：按币别分组，避免把不同币别的金额直接相加 */
const sumByCurrency = (items: AirExportAdminApi.OrderFeeDto[]) => {
  const totals = new Map<string, number>();
  for (const item of items) {
    const amount = Number(item.amount);
    if (!Number.isFinite(amount)) continue;
    const currency =
      item.currency?.cnName?.trim() || item.currency?.code?.trim() || '-';
    totals.set(currency, (totals.get(currency) ?? 0) + amount);
  }
  return [...totals.entries()].map(
    ([currency, amount]) => `${currency} ${amount.toFixed(2)}`,
  );
};

const receivableTotals = computed(() => sumByCurrency(receivableFees.value));
const payableTotals = computed(() => sumByCurrency(payableFees.value));

const columns = computed(() => [
  {
    key: 'feeCodeName',
    dataIndex: ['feeCode', 'cnName'],
    title: $t('airExport.export.orderFee.feeCodeName'),
    width: 140,
    ellipsis: true,
  },
  {
    key: 'settlementName',
    dataIndex: ['settlement', 'name'],
    title: $t('airExport.export.orderFee.settlementName'),
    width: 160,
    ellipsis: true,
  },
  {
    key: 'currencyName',
    dataIndex: ['currency', 'cnName'],
    title: $t('airExport.export.orderFee.currencyName'),
    width: 80,
  },
  {
    key: 'unitPrice',
    title: $t('airExport.export.orderFee.unitPrice'),
    width: 110,
  },
  {
    key: 'quantity',
    dataIndex: 'quantity',
    title: $t('airExport.export.orderFee.quantity'),
    width: 90,
  },
  {
    key: 'unit',
    dataIndex: 'unit',
    title: $t('airExport.export.orderFee.unit'),
    width: 80,
  },
  { key: 'amount', title: $t('airExport.export.orderFee.amount'), width: 120 },
  {
    key: 'exchangeRate',
    dataIndex: 'exchangeRate',
    title: $t('airExport.export.orderFee.exchangeRate'),
    width: 90,
  },
  {
    key: 'feeStatus',
    title: $t('airExport.export.orderFee.feeStatus'),
    width: 100,
  },
  {
    key: 'settlementStatus',
    title: $t('airExport.export.orderFee.settlementStatus'),
    width: 100,
  },
  {
    key: 'invoiceStatus',
    title: $t('airExport.export.orderFee.invoiceStatus'),
    width: 100,
  },
  {
    key: 'settledAmount',
    title: $t('airExport.export.orderFee.settledAmount'),
    width: 120,
  },
  {
    key: 'invoicedAmount',
    title: $t('airExport.export.orderFee.invoicedAmount'),
    width: 120,
  },
  {
    key: 'unInvoicedAmount',
    title: $t('airExport.export.orderFee.unInvoicedAmount'),
    width: 120,
  },
  {
    key: 'dataEntryMethod',
    title: $t('airExport.export.orderFee.dataEntryMethod'),
    width: 130,
  },
  {
    key: 'accountDate',
    title: $t('airExport.export.orderFee.accountDate'),
    width: 100,
  },
  {
    key: 'changeOrderFee',
    title: $t('airExport.export.orderFee.changeOrderFee'),
    width: 90,
    align: 'center' as const,
  },
  {
    key: 'creatorUserName',
    dataIndex: 'creatorUserName',
    title: $t('airExport.export.orderFee.creatorUserName'),
    width: 110,
  },
  {
    key: 'remark',
    dataIndex: 'remark',
    title: $t('airExport.export.orderFee.remark'),
    minWidth: 160,
    ellipsis: true,
  },
]);

const loadFees = async () => {
  if (!airExportId.value) return;
  loading.value = true;
  try {
    const detail = await getAirExportDetail(airExportId.value);
    fees.value = detail.transportOrder?.orderFees ?? [];
  } finally {
    loading.value = false;
  }
};

// 基础信息保存成功后，用最新详情整体替换费用列表（与 loadFees 的取值逻辑一致）
watch(
  () => props.latestDetail,
  (detail) => {
    if (!detail) return;
    fees.value = detail.transportOrder?.orderFees ?? [];
  },
);

onMounted(loadFees);
</script>

<template>
  <div class="air-export-order-fee p-4">
    <Spin :spinning="loading">
      <Alert
        type="info"
        show-icon
        class="mb-3"
        :message="$t('airExport.export.orderFee.readonlyTip')"
      />
      <Empty
        v-if="!loading && fees.length === 0"
        :description="$t('airExport.export.orderFee.empty')"
      />
      <template v-else>
        <div
          v-for="section in [
            {
              key: 'receivable',
              title: $t('airExport.export.orderFee.receivable'),
              totalLabel: $t('airExport.export.orderFee.totalReceivable'),
              rows: receivableFees,
              totals: receivableTotals,
            },
            {
              key: 'payable',
              title: $t('airExport.export.orderFee.payable'),
              totalLabel: $t('airExport.export.orderFee.totalPayable'),
              rows: payableFees,
              totals: payableTotals,
            },
          ]"
          :key="section.key"
          class="mb-6"
        >
          <div class="mb-2 flex items-center gap-3">
            <span class="text-sm font-medium text-[#262626]">
              {{ section.title }}
            </span>
            <span class="text-xs text-gray-500">
              {{ section.totalLabel }}
              {{ section.totals.length ? section.totals.join(' / ') : '-' }}
            </span>
          </div>
          <Table
            :columns="columns"
            :data-source="section.rows"
            :pagination="false"
            :scroll="{ x: 'max-content' }"
            row-key="id"
            size="small"
            bordered
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'unitPrice'">
                {{ formatAmount(record.unitPrice) }}
              </template>
              <template v-else-if="column.key === 'amount'">
                {{ formatAmount(record.amount) }}
              </template>
              <template v-else-if="column.key === 'settledAmount'">
                {{ formatAmount(record.settledAmount) }}
              </template>
              <template v-else-if="column.key === 'invoicedAmount'">
                {{ formatAmount(record.invoicedAmount) }}
              </template>
              <template v-else-if="column.key === 'unInvoicedAmount'">
                {{ formatAmount(record.unInvoicedAmount) }}
              </template>
              <template v-else-if="column.key === 'feeStatus'">
                {{ optionLabel(feeStatusOptions(), record.feeStatus) }}
              </template>
              <template v-else-if="column.key === 'settlementStatus'">
                {{
                  optionLabel(
                    settlementStatusOptions(),
                    record.settlementStatus,
                  )
                }}
              </template>
              <template v-else-if="column.key === 'invoiceStatus'">
                {{ optionLabel(invoiceStatusOptions(), record.invoiceStatus) }}
              </template>
              <template v-else-if="column.key === 'dataEntryMethod'">
                {{
                  optionLabel(dataEntryMethodOptions(), record.dataEntryMethod)
                }}
              </template>
              <template v-else-if="column.key === 'accountDate'">
                {{ formatMonth(record.accountDate) }}
              </template>
              <template v-else-if="column.key === 'changeOrderFee'">
                <Tag v-if="record.changeOrderId" color="orange">
                  {{ $t('common.yes') }}
                </Tag>
                <span v-else>-</span>
              </template>
            </template>
          </Table>
        </div>
      </template>
    </Spin>
  </div>
</template>
