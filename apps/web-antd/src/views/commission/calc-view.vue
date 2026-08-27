<script lang="ts" setup>
import { CommissionOrderAdminApi } from '#/api/commission/commission-order-admin';

import { computed } from 'vue';

import { Alert, Descriptions, Table } from 'ant-design-vue';

import { $t } from '#/locales';

import { formatAmount, getBaseSalaryModeLabel, useStepColumns } from './data';

defineOptions({ name: 'CommissionCalcView' });

const props = defineProps<{
  /** 计算结果，命中不到配置/汇率缺失时为 null */
  calculation?: CommissionOrderAdminApi.CommissionCalculationDto | null;
}>();

const stepColumns = useStepColumns();

const thresholdText = computed(() => {
  const calc = props.calculation;
  if (calc?.profitThreshold == null) return '-';
  const operator =
    calc.profitThresholdOperator ===
    CommissionOrderAdminApi.ProfitThresholdOperator.GreaterThanOrEqual
      ? '≥'
      : '>';
  return `${operator} ${formatAmount(calc.profitThreshold)}`;
});

const baseSalaryText = computed(() => {
  const calc = props.calculation;
  if (!calc?.isBaseSalaryEnabled) return '-';
  const mode = getBaseSalaryModeLabel(calc.baseSalaryMode);
  const modeText = mode ? `（${mode}）` : '';
  return `${formatAmount(calc.baseSalary)}${modeText}`;
});
</script>

<template>
  <Alert
    v-if="!calculation"
    type="warning"
    show-icon
    :message="$t('commissionOrder.calc.notAvailable')"
  />
  <div v-else class="space-y-3">
    <Descriptions bordered :column="3" size="small">
      <Descriptions.Item :span="3" :label="$t('commissionOrder.calc.config')">
        {{ calculation.commissionConfig?.name ?? '-' }}
      </Descriptions.Item>
      <Descriptions.Item
        v-if="calculation.profitThreshold != null"
        :label="$t('commissionOrder.calc.profitThreshold')"
      >
        {{ thresholdText }}
      </Descriptions.Item>
      <Descriptions.Item
        v-if="calculation.totalProfit != null"
        :label="$t('commissionOrder.calc.totalProfit')"
      >
        {{ formatAmount(calculation.totalProfit) }}
      </Descriptions.Item>
      <Descriptions.Item
        v-if="calculation.countedItemCount != null"
        :label="$t('commissionOrder.calc.countedItems')"
      >
        {{ calculation.countedItemCount }}
      </Descriptions.Item>
      <Descriptions.Item
        v-if="calculation.negativeProfit != null"
        :label="$t('commissionOrder.calc.negativeProfit')"
      >
        {{ formatAmount(calculation.negativeProfit) }}
      </Descriptions.Item>
      <Descriptions.Item
        v-if="calculation.negativeItemCount != null"
        :label="$t('commissionOrder.calc.negativeItems')"
      >
        {{ calculation.negativeItemCount }}
      </Descriptions.Item>
      <Descriptions.Item
        v-if="calculation.negativeDeduction != null"
        :label="$t('commissionOrder.calc.negativeDeduction')"
      >
        {{ formatAmount(calculation.negativeDeduction) }}
      </Descriptions.Item>
      <Descriptions.Item :label="$t('commissionOrder.calc.commissionAmount')">
        {{ formatAmount(calculation.commissionAmount) }}
      </Descriptions.Item>
      <Descriptions.Item :label="$t('commissionOrder.calc.baseSalary')">
        {{ baseSalaryText }}
      </Descriptions.Item>
      <Descriptions.Item :label="$t('commissionOrder.calc.finalAmount')">
        <span class="font-medium text-primary">
          {{ formatAmount(calculation.finalAmount) }}
        </span>
      </Descriptions.Item>
    </Descriptions>
    <div>
      <div class="mb-2 font-medium">
        {{ $t('commissionOrder.calc.stepTitle') }}
      </div>
      <Table
        bordered
        size="small"
        row-key="sortId"
        :columns="stepColumns"
        :data-source="calculation.steps"
        :pagination="false"
      />
    </div>
  </div>
</template>
