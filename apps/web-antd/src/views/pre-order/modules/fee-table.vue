<script lang="ts" setup>
import type { PreOrderAdminApi } from '#/api/pre-order/pre-order-admin';

import type { PreOrderCtnRow } from './ctn-table.vue';

import { computed, ref, watch } from 'vue';

import {
  Button,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Tooltip,
} from 'ant-design-vue';

import CurrencySelect from '#/adapter/component/biz-select/currency-select.vue';
import FeeCodeSelect from '#/adapter/component/biz-select/fee-code-select.vue';
import ClientSelect from '#/adapter/component/biz-select/client-select.vue';

import { PAY_SIDE_OPTIONS } from '../form-data';

export interface PreOrderFeeRow extends PreOrderAdminApi.PreOrderFeeDto {
  rowKey: string;
}

const props = withDefaults(
  defineProps<{
    /** 箱型箱量行，用于「应收 + 单位=箱型」带出卖价与箱量 */
    ctns?: PreOrderCtnRow[];
    readonly?: boolean;
  }>(),
  { ctns: () => [], readonly: false },
);

const modelValue = defineModel<PreOrderFeeRow[]>({ default: () => [] });

const selectedRowKeys = ref<string[]>([]);

const dataSource = computed({
  get: () => modelValue.value ?? [],
  set: (val) => {
    modelValue.value = val;
  },
});

let rowSeed = 0;
const createRowKey = () => `fee-${Date.now()}-${(rowSeed += 1)}`;

/** a-table 插槽的 record 为 Record<string, any>，在模板边界收敛为费用行 */
const asRow = (record: unknown) => record as PreOrderFeeRow;

/** 非箱型的通用单位；其余单位视为箱型名 */
const GENERIC_UNITS = ['票', '重量', '体积', 'TEU'];

const unitOptions = computed(() => {
  const ctnUnits = (props.ctns ?? [])
    .map((row) => row.ctnCodeName)
    .filter((name): name is string => !!name);
  return [...new Set([...GENERIC_UNITS, ...ctnUnits])].map((unit) => ({
    label: unit,
    value: unit,
  }));
});

const findCtnByUnit = (unit?: null | string) => {
  if (!unit) return undefined;
  return (props.ctns ?? []).find((row) => row.ctnCodeName === unit);
};

/** 应收 + 单位命中箱型时，含税单价与数量由箱型卖价/箱量决定，禁止手改 */
const isCtnDrivenRow = (row: PreOrderFeeRow) =>
  Number(row.paySide) === 0 && !!findCtnByUnit(row.unit);

const round = (value: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

/** 金额与不含税金额随单价/数量/税率联动，口径与业务费用一致 */
function recalcAmount(row: PreOrderFeeRow) {
  const unitPrice = Number(row.unitPrice ?? 0);
  const quantity = Number(row.quantity ?? 0);
  const taxRate = Number(row.taxRate ?? 0);
  row.amount = round(unitPrice * quantity, 2);
  row.noTaxUnitPrice = round(unitPrice / (1 + taxRate / 100), 4);
  return row;
}

/** 把箱型卖价与箱量刷进受箱型驱动的应收行 */
function syncCtnDrivenRows() {
  let changed = false;
  for (const row of dataSource.value) {
    const ctn = findCtnByUnit(row.unit);
    if (!ctn || Number(row.paySide) !== 0) continue;
    const nextPrice = ctn.price ?? undefined;
    const nextQuantity = ctn.count ?? undefined;
    if (row.unitPrice !== nextPrice || row.quantity !== nextQuantity) {
      row.unitPrice = nextPrice;
      row.quantity = nextQuantity;
      recalcAmount(row);
      changed = true;
    }
  }
  if (changed) {
    dataSource.value = [...dataSource.value];
  }
}

/** 箱型卖价 / 箱量变化后由父组件调用 */
defineExpose({ syncCtnDrivenRows });

watch(
  () =>
    props.ctns
      ?.map((row) => `${row.ctnCodeName}:${row.price}:${row.count}`)
      .join('|'),
  () => {
    syncCtnDrivenRows();
  },
);

function handleUnitChange(row: PreOrderFeeRow, unit: string) {
  row.unit = unit;
  const ctn = findCtnByUnit(unit);
  if (ctn && Number(row.paySide) === 0) {
    row.unitPrice = ctn.price ?? undefined;
    row.quantity = ctn.count ?? undefined;
  } else if (unit === '票') {
    row.quantity = row.quantity ?? 1;
  }
  recalcAmount(row);
}

function handlePaySideChange(row: PreOrderFeeRow, paySide: number) {
  row.paySide = paySide;
  // 切到应收且单位是箱型时立即带价；切到应付时保留当前值改为手填
  if (paySide === 0) {
    const ctn = findCtnByUnit(row.unit);
    if (ctn) {
      row.unitPrice = ctn.price ?? undefined;
      row.quantity = ctn.count ?? undefined;
    }
  }
  recalcAmount(row);
}

function handleAdd(paySide: number) {
  dataSource.value = [
    ...dataSource.value,
    {
      rowKey: createRowKey(),
      paySide,
      unit: '票',
      quantity: 1,
      taxRate: 0,
      invoiceBlocked: false,
      isConfidential: false,
    } as PreOrderFeeRow,
  ];
}

function handleRemove() {
  if (selectedRowKeys.value.length === 0) return;
  const removing = new Set(selectedRowKeys.value);
  dataSource.value = dataSource.value.filter(
    (row) => !removing.has(row.rowKey),
  );
  selectedRowKeys.value = [];
}

const columns = [
  { title: '收付', dataIndex: 'paySide', width: 90 },
  { title: '费用代码', dataIndex: 'feeCodeId', width: 180 },
  { title: '结算对象', dataIndex: 'settlementId', width: 180 },
  { title: '币别', dataIndex: 'currencyId', width: 120 },
  { title: '单位', dataIndex: 'unit', width: 120 },
  { title: '数量', dataIndex: 'quantity', width: 110 },
  { title: '含税单价', dataIndex: 'unitPrice', width: 130 },
  { title: '税率(%)', dataIndex: 'taxRate', width: 100 },
  { title: '金额', dataIndex: 'amount', width: 130 },
  { title: '备注', dataIndex: 'remark', width: 180 },
];

const totals = computed(() => {
  let receive = 0;
  let pay = 0;
  for (const row of dataSource.value) {
    const amount = Number(row.amount ?? 0);
    if (Number(row.paySide) === 1) pay += amount;
    else receive += amount;
  }
  return { receive: round(receive, 2), pay: round(pay, 2) };
});
</script>

<template>
  <div>
    <Space v-if="!props.readonly" class="mb-2">
      <Button size="small" type="primary" @click="handleAdd(0)">
        添加应收
      </Button>
      <Button size="small" @click="handleAdd(1)">添加应付</Button>
      <Button
        size="small"
        danger
        :disabled="selectedRowKeys.length === 0"
        @click="handleRemove"
      >
        删除
      </Button>
      <span class="text-xs text-gray-500">
        应收费用单位选箱型时，含税单价取该箱型卖价、数量取箱量，均不可修改
      </span>
    </Space>
    <Table
      size="small"
      :columns="columns"
      :data-source="dataSource"
      :pagination="false"
      row-key="rowKey"
      :scroll="{ x: 1400 }"
      :row-selection="
        props.readonly
          ? undefined
          : {
              selectedRowKeys,
              onChange: (keys: any[]) => (selectedRowKeys = keys as string[]),
            }
      "
      bordered
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.dataIndex === 'paySide'">
          <Select
            :value="record.paySide"
            :disabled="props.readonly"
            size="small"
            class="w-full"
            :options="PAY_SIDE_OPTIONS"
            @change="(v: any) => handlePaySideChange(asRow(record), Number(v))"
          />
        </template>
        <template v-else-if="column.dataIndex === 'feeCodeId'">
          <FeeCodeSelect
            v-model="record.feeCodeId"
            :disabled="props.readonly"
            size="small"
          />
        </template>
        <template v-else-if="column.dataIndex === 'settlementId'">
          <ClientSelect
            v-model="record.settlementId"
            :disabled="props.readonly"
            size="small"
          />
        </template>
        <template v-else-if="column.dataIndex === 'currencyId'">
          <CurrencySelect
            v-model="record.currencyId"
            :disabled="props.readonly"
            size="small"
          />
        </template>
        <template v-else-if="column.dataIndex === 'unit'">
          <Select
            :value="record.unit"
            :disabled="props.readonly"
            size="small"
            class="w-full"
            show-search
            :options="unitOptions"
            @change="(v: any) => handleUnitChange(asRow(record), String(v))"
          />
        </template>
        <template v-else-if="column.dataIndex === 'quantity'">
          <Tooltip
            :title="isCtnDrivenRow(asRow(record)) ? '数量取自箱型箱量' : ''"
          >
            <InputNumber
              v-model:value="record.quantity"
              :disabled="props.readonly || isCtnDrivenRow(asRow(record))"
              size="small"
              class="w-full"
              :min="0"
              :precision="2"
              @change="recalcAmount(asRow(record))"
            />
          </Tooltip>
        </template>
        <template v-else-if="column.dataIndex === 'unitPrice'">
          <Tooltip
            :title="isCtnDrivenRow(asRow(record)) ? '含税单价取自箱型卖价' : ''"
          >
            <InputNumber
              v-model:value="record.unitPrice"
              :disabled="props.readonly || isCtnDrivenRow(asRow(record))"
              size="small"
              class="w-full"
              :min="0"
              :precision="2"
              @change="recalcAmount(asRow(record))"
            />
          </Tooltip>
        </template>
        <template v-else-if="column.dataIndex === 'taxRate'">
          <InputNumber
            v-model:value="record.taxRate"
            :disabled="props.readonly"
            size="small"
            class="w-full"
            :min="0"
            :precision="2"
            @change="recalcAmount(asRow(record))"
          />
        </template>
        <template v-else-if="column.dataIndex === 'amount'">
          <InputNumber
            v-model:value="record.amount"
            :disabled="true"
            size="small"
            class="w-full"
            :precision="2"
          />
        </template>
        <template v-else-if="column.dataIndex === 'remark'">
          <Input
            v-model:value="record.remark"
            :disabled="props.readonly"
            size="small"
            :maxlength="4096"
          />
        </template>
      </template>
    </Table>
    <div class="mt-2 flex justify-end gap-6 text-sm">
      <span>应收合计：{{ totals.receive.toFixed(2) }}</span>
      <span>应付合计：{{ totals.pay.toFixed(2) }}</span>
    </div>
  </div>
</template>
