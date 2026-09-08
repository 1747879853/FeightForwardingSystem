<script lang="ts" setup>
import { CommissionOrderAdminApi } from '#/api/commission/commission-order-admin';

import { computed } from 'vue';

import { IconifyIcon } from '@vben/icons';

import { Alert, Tag } from 'ant-design-vue';

import { $t } from '#/locales';

import { formatAmount, formatMonthCn, getStepTypeLabel } from './data';

defineOptions({ name: 'CommissionCalcPanels' });

const props = defineProps<{
  /** 未达门槛票数（销售），用于「达标票数」磁贴副文案 */
  belowCount?: number;
  /** 计算结果，命中不到配置/汇率缺失时为 null */
  calculation?: CommissionOrderAdminApi.CommissionCalculationDto | null;
  /** 是否可新建/提交（详情态可改用 headTag 展示单据状态） */
  canSubmit?: boolean;
  /**
   * 左上角状态标签；传入后覆盖 canSubmit 的「可提交/不可提交」文案
   * （详情弹窗用于展示草稿/已审核等单据状态）
   */
  headTag?: null | { color: string; label: string };
  /** 是否销售提成（统计磁贴与亏损汇总仅销售有值） */
  isSales?: boolean;
  /** 提成月，用于面板标题 */
  month?: null | string;
}>();

const { BaseSalaryMode, CommissionStepType, SalesCommissionType } =
  CommissionOrderAdminApi;

const monthLabel = computed(() => formatMonthCn(props.month));

const steps = computed(() => props.calculation?.steps ?? []);

/** 「提成比例」磁贴：比例 + 计算方式副文案 */
const rateTile = computed(() => {
  const calc = props.calculation;
  if (!calc) return null;
  const ladderStep = steps.value.find(
    (step) => step.stepType === CommissionStepType.Ladder,
  );
  const rate = calc.fixedRate ?? ladderStep?.rate ?? null;
  if (rate == null) return null;
  let method = '';
  if (calc.salesCommissionType === SalesCommissionType.FixedRate) {
    method = $t('commissionOrder.calc.salesTypeFixedRate');
  } else if (calc.salesCommissionType === SalesCommissionType.LadderSegment) {
    method = $t('commissionOrder.calc.salesTypeLadderSegment');
  } else if (calc.salesCommissionType === SalesCommissionType.LadderWhole) {
    method = $t('commissionOrder.calc.salesTypeLadderWhole');
  }
  const min = ladderStep?.minAmount;
  const sub =
    method && min != null ? `${method}-${formatAmount(min)}起` : method;
  return { rate, sub };
});

/** 右侧发放口径提示与公式 */
const payHint = computed(() => {
  const calc = props.calculation;
  if (!calc?.isBaseSalaryEnabled) return null;
  const commission = calc.commissionAmount ?? 0;
  const base = calc.baseSalary ?? 0;
  if (calc.baseSalaryMode === BaseSalaryMode.DirectAdd) {
    return {
      formula: `${formatAmount(commission)} + ${formatAmount(base)} = ${formatAmount(calc.finalAmount)}`,
      text: $t('commissionOrder.calc.payHintDirectAdd'),
    };
  }
  return {
    formula: `max(${formatAmount(commission)}, ${formatAmount(base)}) = ${formatAmount(calc.finalAmount)}`,
    text:
      commission >= base
        ? $t('commissionOrder.calc.payHintMaxCommission')
        : $t('commissionOrder.calc.payHintMaxBase'),
  };
});

const stepNo = (sortId: number) => String(sortId).padStart(2, '0');
</script>

<template>
  <Alert
    v-if="!calculation"
    type="warning"
    show-icon
    :message="$t('commissionOrder.calc.notAvailable')"
  />
  <div v-else class="calc-panels">
    <!-- 左：提成计算过程 -->
    <section class="panel panel--process">
      <header class="panel__head">
        <span class="panel__month">{{ monthLabel }}</span>
        <Tag v-if="headTag" :color="headTag.color" class="panel__tag">
          {{ headTag.label }}
        </Tag>
        <Tag
          v-else-if="canSubmit !== undefined"
          :color="canSubmit ? 'success' : 'error'"
          class="panel__tag"
        >
          {{
            canSubmit
              ? $t('commissionOrder.create.canSubmit')
              : $t('commissionOrder.create.cannotSubmit')
          }}
        </Tag>
      </header>

      <!-- 统计磁贴（仅销售） -->
      <div v-if="isSales" class="tiles">
        <div class="tile tile--blue">
          <span class="tile__icon tile__icon--blue">
            <IconifyIcon icon="mdi:coins" />
          </span>
          <div class="tile__body">
            <div class="tile__label">
              {{ $t('commissionOrder.calc.totalProfit') }}
            </div>
            <div class="tile__value">
              ¥{{ formatAmount(calculation.totalProfit) }}
            </div>
            <div class="tile__sub">
              {{
                $t('commissionOrder.calc.countedSub', {
                  count: calculation.countedItemCount ?? 0,
                })
              }}
            </div>
          </div>
        </div>

        <div v-if="rateTile" class="tile tile--green">
          <span class="tile__icon tile__icon--green">
            <IconifyIcon icon="mdi:calculator-variant" />
          </span>
          <div class="tile__body">
            <div class="tile__label">
              {{ $t('commissionOrder.calc.commissionRate') }}
            </div>
            <div class="tile__value">
              {{ rateTile.rate }}<span class="tile__unit">%</span>
            </div>
            <div class="tile__sub">{{ rateTile.sub }}</div>
          </div>
        </div>

        <div class="tile tile--orange">
          <span class="tile__icon tile__icon--orange">
            <IconifyIcon icon="mdi:wallet" />
          </span>
          <div class="tile__body">
            <div class="tile__label">
              {{ $t('commissionOrder.calc.countedItems') }}
            </div>
            <div class="tile__value">
              {{ calculation.countedItemCount ?? 0 }}
            </div>
            <div class="tile__sub">
              {{
                $t('commissionOrder.calc.belowSub', {
                  count: belowCount ?? 0,
                })
              }}
            </div>
          </div>
        </div>
      </div>

      <!-- 计算步骤 -->
      <div class="process">
        <div class="process__title">
          {{ $t('commissionOrder.calc.processTitle') }}
        </div>
        <ol class="steps">
          <li v-for="step in steps" :key="step.sortId" class="step">
            <span class="step__no">{{ stepNo(step.sortId) }}</span>
            <span class="step__label">{{
              getStepTypeLabel(step.stepType)
            }}</span>
            <span class="step__desc">{{ step.description }}</span>
            <span
              class="step__amount"
              :class="{ 'step__amount--neg': step.amount < 0 }"
            >
              ¥{{ formatAmount(step.amount) }}
            </span>
          </li>
        </ol>
      </div>

      <!-- 亏损汇总（仅销售） -->
      <div v-if="isSales" class="summary">
        <div class="summary__item">
          <span class="summary__label">
            {{ $t('commissionOrder.calc.negativeItems') }}
          </span>
          <span class="summary__value">
            {{ calculation.negativeItemCount ?? 0 }}
          </span>
        </div>
        <div class="summary__item">
          <span class="summary__label">
            {{ $t('commissionOrder.calc.negativeProfit') }}
          </span>
          <span class="summary__value">
            ¥{{ formatAmount(calculation.negativeProfit) }}
          </span>
        </div>
        <div class="summary__item">
          <span class="summary__label">
            {{ $t('commissionOrder.calc.negativeDeduction') }}
          </span>
          <span class="summary__value">
            ¥{{ formatAmount(calculation.negativeDeduction) }}
          </span>
        </div>
      </div>
    </section>

    <!-- 右：最终应发 -->
    <aside class="panel panel--final">
      <header class="panel__head">
        <span class="panel__title">
          {{ $t('commissionOrder.calc.finalAmount') }}
        </span>
        <span class="panel__month-sub">{{ monthLabel }}</span>
      </header>

      <div class="final__amount">
        ¥{{ formatAmount(calculation.finalAmount) }}
      </div>

      <ul class="final__rows">
        <li class="final__row">
          <span>{{ $t('commissionOrder.calc.commissionAmount') }}</span>
          <span>¥{{ formatAmount(calculation.commissionAmount) }}</span>
        </li>
        <li v-if="calculation.isBaseSalaryEnabled" class="final__row">
          <span>{{ $t('commissionOrder.calc.baseSalaryGuaranteed') }}</span>
          <span>¥{{ formatAmount(calculation.baseSalary) }}</span>
        </li>
        <li v-if="calculation.negativeDeduction != null" class="final__row">
          <span>{{ $t('commissionOrder.calc.negativeDeduction') }}</span>
          <span>¥{{ formatAmount(calculation.negativeDeduction) }}</span>
        </li>
      </ul>

      <div v-if="payHint" class="final__callout">
        <span class="final__callout-icon">
          <IconifyIcon icon="mdi:exclamation-thick" />
        </span>
        <div class="final__callout-body">
          <div class="final__callout-text">{{ payHint.text }}</div>
          <div class="final__callout-formula">{{ payHint.formula }}</div>
        </div>
      </div>

      <div v-if="calculation.commissionConfig?.name" class="final__config">
        <span class="final__config-label">
          {{ $t('commissionOrder.calc.config') }}：
        </span>
        <span class="final__config-badge">
          {{ calculation.commissionConfig.name }}
        </span>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.calc-panels {
  display: grid;
  grid-template-columns: 922fr 482fr;
  gap: 12px;
  align-items: stretch;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 8px;
}

.panel--final {
  background: linear-gradient(180deg, #e0efff 0%, hsl(var(--card)) 60%);
}

.panel__head {
  display: flex;
  gap: 8px;
  align-items: center;
}

.panel__month,
.panel__title {
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.panel__month-sub {
  font-size: 12px;
  color: #8c95a3;
}

.panel__tag {
  margin-inline-end: 0;
}

/* ---------- 统计磁贴 ---------- */
.tiles {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.tile {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 14px;
  border-radius: 8px;
}

.tile--blue {
  background: #f2f8fe;
}

.tile--green {
  background: #f2fef4;
}

.tile--orange {
  background: #fffaf0;
}

.tile__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  font-size: 22px;
  border-radius: 50%;
}

.tile__icon--blue {
  color: #0f87ff;
  background: #d2e8ff;
}

.tile__icon--green {
  color: #1cc892;
  background: #cdeed2;
}

.tile__icon--orange {
  color: #ffa500;
  background: #fee9be;
}

.tile__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.tile__label {
  font-size: 13px;
  color: #3d3d3d;
}

.tile__value {
  font-size: 18px;
  font-weight: 700;
  color: #3d3d3d;
}

.tile__unit {
  margin-left: 2px;
  font-size: 12px;
  font-weight: 600;
}

.tile__sub {
  font-size: 12px;
  color: #8e9094;
}

/* ---------- 计算步骤 ---------- */
.process__title {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.steps {
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  list-style: none;
}

.step {
  display: grid;
  grid-template-columns: 28px 96px minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f2f2f2;
}

.step:last-child {
  border-bottom: none;
}

.step__no {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 10px;
  font-weight: 600;
  color: #006ce6;
  background: #d2e8ff;
  border-radius: 50%;
}

.step__label {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.step__desc {
  font-size: 12px;
  color: #8c95a3;
}

.step__amount {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

.step__amount--neg {
  color: #f5222d;
}

/* ---------- 亏损汇总 ---------- */
.summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  align-items: center;
  padding: 10px 16px;
  background: #f2f8fe;
  border-radius: 8px;
}

.summary__item {
  display: flex;
  gap: 8px;
  align-items: center;
}

.summary__label {
  font-size: 12px;
  color: #8c95a3;
}

.summary__value {
  font-size: 13px;
  font-weight: 600;
  color: hsl(var(--foreground));
}

/* ---------- 最终应发 ---------- */
.final__amount {
  font-size: 32px;
  font-weight: 800;
  color: #006ce6;
  letter-spacing: 0.5px;
}

.final__rows {
  display: flex;
  flex-direction: column;
  padding: 0;
  margin: 0;
  list-style: none;
}

.final__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  font-size: 13px;
  color: hsl(var(--foreground));
  border-bottom: 1px solid hsl(var(--border));
}

.final__row:last-child {
  border-bottom: none;
}

.final__callout {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 12px;
  background: #f2f8fe;
  border-radius: 8px;
}

.final__callout-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 16px;
  color: #fff;
  background: linear-gradient(135deg, #0f87ff, #69b4ff);
  border-radius: 50%;
}

.final__callout-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.final__callout-text {
  font-size: 12px;
  font-weight: 600;
  color: #006ce6;
}

.final__callout-formula {
  font-size: 11px;
  color: #8c95a3;
}

.final__config {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: auto;
}

.final__config-label {
  font-size: 12px;
  color: #3d3d3d;
}

.final__config-badge {
  padding: 2px 8px;
  font-size: 12px;
  color: #006ce6;
  background: rgb(0 108 230 / 10%);
  border-radius: 4px;
}
</style>
