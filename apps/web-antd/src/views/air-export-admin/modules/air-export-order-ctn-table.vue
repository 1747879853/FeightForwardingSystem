<script lang="ts" setup>
import type { AirExportAdminApi } from '#/api/air-export/air-export-admin';

import { computed, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Button, InputNumber, Table, Tooltip } from 'ant-design-vue';

import { $t } from '#/locales';

import {
  calcChargeWeight,
  calcCtnCbm,
  calcVolumeWeight,
  sumCtnDecimal,
} from '../basic-info-form/air-export-detail-mapper';
import { AIR_DECIMAL_PRECISION } from '../data';

/**
 * 货物明细可编辑表格。
 *
 * 一行里的单位是混着的：件数、重量、长、宽、高、体积是**单件**值，
 * 体积重与计费重是**整行合计**值，表头必须标清楚，否则用户会把重量当合计填。
 *
 * 体积 / 体积重 / 计费重默认自动算出且允许手改；改了上游基准列会再次覆盖手改结果。
 * 后端对这张表既不校验也不重算，界面算错就原样存进库里。
 */
const modelValue = defineModel<AirExportAdminApi.AirExportOrderCtnEditDto[]>({
  default: () => [],
});

const selectedRowKeys = ref<(number | string)[]>([]);

const dataSource = computed({
  get: () => modelValue.value ?? [],
  set: (val) => {
    modelValue.value = val;
  },
});

const formatSummaryNumber = (value: number | undefined) => {
  if (value === undefined || !Number.isFinite(value)) return '-';
  return String(Number.parseFloat(value.toFixed(AIR_DECIMAL_PRECISION)));
};

const ctnSummary = computed(() => {
  const list = dataSource.value ?? [];
  let totalPkgs = 0;
  let hasPkgs = false;
  for (const row of list) {
    const pkgs = Number(row.pkgs);
    if (Number.isFinite(pkgs)) {
      hasPkgs = true;
      totalPkgs += pkgs;
    }
  }
  return {
    rowCount: list.length,
    totalPkgs: hasPkgs ? String(totalPkgs) : '-',
    totalVolumeWeight: formatSummaryNumber(
      sumCtnDecimal(list as any[], 'volumeWeight'),
    ),
    totalChargeWeight: formatSummaryNumber(
      sumCtnDecimal(list as any[], 'chargeWeight'),
    ),
  };
});

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (number | string)[]) => {
    selectedRowKeys.value = keys;
  },
}));

let rowKeyCounter = 0;
const makeRowKey = () => `air_ctn_${++rowKeyCounter}_${Date.now()}`;

const addRow = () => {
  modelValue.value = [
    ...(modelValue.value ?? []),
    { _rowKey: makeRowKey() } as any,
  ];
};

const removeSelectedRows = () => {
  if (selectedRowKeys.value.length === 0) return;
  const keysSet = new Set(selectedRowKeys.value);
  modelValue.value = (modelValue.value ?? []).filter(
    (row) => !keysSet.has((row as any)._rowKey),
  );
  selectedRowKeys.value = [];
};

/** 行序即提交时的 SortId 顺序，整表在提交前重排，所以移动行只需换位置 */
const moveRow = (index: number, offset: number) => {
  const list = [...(modelValue.value ?? [])];
  const target = index + offset;
  if (target < 0 || target >= list.length) return;
  const current = list[index];
  const swap = list[target];
  if (!current || !swap) return;
  list[index] = swap;
  list[target] = current;
  modelValue.value = list;
};

type CtnField = keyof AirExportAdminApi.AirExportOrderCtnEditDto;

/** 基准列变化时按界面联动链重算下游派生值 */
const applyDerived = (
  row: Record<string, any>,
  field: CtnField,
): Record<string, any> => {
  const next = { ...row };
  const sizeChanged =
    field === 'length' || field === 'width' || field === 'height';
  if (sizeChanged) {
    next.cbm = calcCtnCbm(next.length, next.width, next.height);
  }
  if (sizeChanged || field === 'cbm' || field === 'pkgs') {
    next.volumeWeight = calcVolumeWeight(next.cbm, next.pkgs);
  }
  if (field !== 'chargeWeight') {
    next.chargeWeight = calcChargeWeight(
      next.volumeWeight,
      next.kgs,
      next.pkgs,
    );
  }
  return next;
};

const updateRow = (index: number, field: CtnField, value: any) => {
  const list = [...(modelValue.value ?? [])];
  if (!list[index]) {
    list[index] = { _rowKey: makeRowKey() } as any;
  }
  list[index] = applyDerived(
    { ...list[index], [field]: value ?? undefined },
    field,
  ) as any;
  modelValue.value = list;
};

watch(
  () => modelValue.value,
  (val) => {
    if (val === undefined || val === null) {
      modelValue.value = [];
      return;
    }
    for (const row of val) {
      if (!(row as any)._rowKey) {
        (row as any)._rowKey = makeRowKey();
      }
    }
    const keys = new Set(val.map((row) => (row as any)._rowKey));
    selectedRowKeys.value = selectedRowKeys.value.filter((key) =>
      keys.has(key),
    );
  },
  { immediate: true },
);

const numberProps = {
  class: 'w-full',
  controls: false,
  precision: AIR_DECIMAL_PRECISION,
};
</script>

<template>
  <div class="air-export-order-ctn-table">
    <div class="mb-2 flex items-center gap-2">
      <span class="text-sm font-medium text-gray-600">
        {{ $t('airExport.export.orderCtns') }}
      </span>
      <Tooltip :title="$t('airExport.export.addCtn')">
        <Button
          type="text"
          size="small"
          class="!flex !h-7 !w-7 !items-center !justify-center !rounded-md !bg-[#e6f4ff] !p-0 transition-all hover:scale-105 hover:!bg-[#bae0ff]"
          @click="addRow"
        >
          <IconifyIcon icon="mdi:add-box" class="text-[18px] text-[#1677ff]" />
        </Button>
      </Tooltip>
      <Tooltip :title="$t('common.delete')">
        <Button
          type="text"
          size="small"
          :class="[
            '!flex !h-7 !w-7 !items-center !justify-center !rounded-md !p-0 transition-all',
            selectedRowKeys.length
              ? '!bg-[#fff1f0] hover:scale-105 hover:!bg-[#ffccc7]'
              : '!bg-[#f5f5f5]',
          ]"
          :disabled="!selectedRowKeys.length"
          @click="removeSelectedRows"
        >
          <IconifyIcon
            icon="mdi:close-box"
            :class="[
              'text-[18px]',
              selectedRowKeys.length ? 'text-[#ff4d4f]' : 'text-[#bfbfbf]',
            ]"
          />
        </Button>
      </Tooltip>
      <span class="text-xs text-gray-400">
        {{ $t('airExport.export.ctnUnitTip') }}
      </span>
      <Tooltip :title="$t('airExport.export.ctnCalcTip')">
        <IconifyIcon
          icon="mdi:information-outline"
          class="text-[14px] text-gray-400"
        />
      </Tooltip>
    </div>
    <Table
      :data-source="dataSource"
      :row-selection="rowSelection"
      :pagination="false"
      size="small"
      bordered
      row-key="_rowKey"
    >
      <template #bodyCell="{ column, record, index }">
        <template v-if="column.key === 'pkgs'">
          <InputNumber
            :value="record.pkgs"
            class="w-full"
            :controls="false"
            :precision="0"
            :min="0"
            @update:value="(v) => updateRow(index, 'pkgs', v)"
          />
        </template>
        <template v-else-if="column.key === 'kgs'">
          <InputNumber
            :value="record.kgs"
            v-bind="numberProps"
            @update:value="(v) => updateRow(index, 'kgs', v)"
          />
        </template>
        <template v-else-if="column.key === 'length'">
          <InputNumber
            :value="record.length"
            v-bind="numberProps"
            @update:value="(v) => updateRow(index, 'length', v)"
          />
        </template>
        <template v-else-if="column.key === 'width'">
          <InputNumber
            :value="record.width"
            v-bind="numberProps"
            @update:value="(v) => updateRow(index, 'width', v)"
          />
        </template>
        <template v-else-if="column.key === 'height'">
          <InputNumber
            :value="record.height"
            v-bind="numberProps"
            @update:value="(v) => updateRow(index, 'height', v)"
          />
        </template>
        <template v-else-if="column.key === 'cbm'">
          <InputNumber
            :value="record.cbm"
            v-bind="numberProps"
            @update:value="(v) => updateRow(index, 'cbm', v)"
          />
        </template>
        <template v-else-if="column.key === 'volumeWeight'">
          <InputNumber
            :value="record.volumeWeight"
            v-bind="numberProps"
            @update:value="(v) => updateRow(index, 'volumeWeight', v)"
          />
        </template>
        <template v-else-if="column.key === 'chargeWeight'">
          <InputNumber
            :value="record.chargeWeight"
            v-bind="numberProps"
            @update:value="(v) => updateRow(index, 'chargeWeight', v)"
          />
        </template>
        <template v-else-if="column.key === 'sort'">
          <span class="flex items-center justify-center gap-1">
            <Tooltip :title="$t('airExport.export.moveUp')">
              <Button
                type="text"
                size="small"
                :disabled="index === 0"
                @click="moveRow(index, -1)"
              >
                <IconifyIcon icon="mdi:arrow-up" />
              </Button>
            </Tooltip>
            <Tooltip :title="$t('airExport.export.moveDown')">
              <Button
                type="text"
                size="small"
                :disabled="index === dataSource.length - 1"
                @click="moveRow(index, 1)"
              >
                <IconifyIcon icon="mdi:arrow-down" />
              </Button>
            </Tooltip>
          </span>
        </template>
      </template>
      <Table.Column
        key="pkgs"
        :title="$t('airExport.export.ctnPkgs')"
        width="90"
      />
      <Table.Column
        key="kgs"
        :title="$t('airExport.export.ctnKgs')"
        width="130"
      />
      <Table.Column
        key="length"
        :title="$t('airExport.export.ctnLength')"
        width="110"
      />
      <Table.Column
        key="width"
        :title="$t('airExport.export.ctnWidth')"
        width="110"
      />
      <Table.Column
        key="height"
        :title="$t('airExport.export.ctnHeight')"
        width="110"
      />
      <Table.Column
        key="cbm"
        :title="$t('airExport.export.ctnCbm')"
        width="130"
      />
      <Table.Column
        key="volumeWeight"
        :title="$t('airExport.export.ctnVolumeWeight')"
        width="150"
      />
      <Table.Column
        key="chargeWeight"
        :title="$t('airExport.export.ctnChargeWeight')"
        width="150"
      />
      <Table.Column key="sort" title="" width="90" align="center" />
    </Table>
    <div
      class="mt-2 flex items-center gap-6 rounded border border-[#f0f0f0] bg-[#fafafa] px-3 py-2 text-sm text-[#595959]"
    >
      <span class="font-medium text-[#262626]">
        {{ $t('airExport.export.ctnSummaryLabel') }}
      </span>
      <span>
        {{ $t('airExport.export.ctnRowCount') }} {{ ctnSummary.rowCount }}
      </span>
      <span>
        {{ $t('airExport.export.ctnPkgs') }} {{ ctnSummary.totalPkgs }}
      </span>
      <span>
        {{ $t('airExport.export.volumeWeightTotal') }}
        {{ ctnSummary.totalVolumeWeight }}
      </span>
      <span>
        {{ $t('airExport.export.chargeWeightTotal') }}
        {{ ctnSummary.totalChargeWeight }}
      </span>
    </div>
  </div>
</template>
