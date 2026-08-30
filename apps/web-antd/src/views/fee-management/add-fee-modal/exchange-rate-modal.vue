<script lang="ts" setup>
import { ref, watch } from 'vue';

import { InputNumber, message, Modal } from 'ant-design-vue';

import {
  ensureExchangeRateCache,
  peekExchangeRate,
} from '#/utils/exchange-rate-cache';

import type { CurrencyInfo } from './data';
import {
  calcOriginalToSettlementRate,
  currencyRatePairKey,
  fallbackLocalCurrencyRate,
  inverseRate,
  PAYABLE_PAY_SIDE,
  RATE_PRECISION,
} from './exchange-rate-convert';

interface RatePair {
  pairKey: string;
  currencyId: number;
  originalCode: string;
  settlementCode: string;
  asOf?: string;
  /** 1 原币 = ? 结算币（写入费用申请汇率） */
  originalToSettlement: null | number;
  /** 1 结算币 = ? 原币（展示用，与上一字段互为倒数） */
  settlementToOriginal: null | number;
}

const props = defineProps<{
  open: boolean;
  currencies: CurrencyInfo[];
  settlementCurrencyId?: number | null;
  settlementCurrencyName?: string;
  /** 申请主体所属公司本位币；与业务联系单同一套 peek 口径 */
  localCurrencyId?: null | number;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  confirm: [rateMap: Map<string, number>];
}>();

const pairs = ref<RatePair[]>([]);

/** 1 该币 = n 公司本位币：汇率表优先，未维护且是本位币才锁 1 */
function unitLocalRate(
  currencyId?: null | number | string,
  asOf?: Date | null | number | string,
): number | undefined {
  const tableRate = peekExchangeRate(
    currencyId,
    PAYABLE_PAY_SIDE,
    props.localCurrencyId,
    asOf,
  );
  return fallbackLocalCurrencyRate(
    tableRate,
    currencyId,
    props.localCurrencyId,
  );
}

function buildPair(currency: CurrencyInfo): RatePair {
  const settlementCode = props.settlementCurrencyName || '结算币别';
  const asOf = currency.asOf;
  const originalLocal = unitLocalRate(currency.currencyId, asOf);
  const settlementLocal = unitLocalRate(props.settlementCurrencyId, asOf);
  const originalToSettlement = calcOriginalToSettlementRate(
    originalLocal,
    settlementLocal,
  );
  return {
    pairKey: currencyRatePairKey(currency.currencyId, asOf),
    currencyId: currency.currencyId,
    originalCode: currency.currencyCode || '原币',
    settlementCode,
    asOf,
    originalToSettlement: originalToSettlement ?? null,
    settlementToOriginal: inverseRate(originalToSettlement),
  };
}

watch(
  () => [props.open, props.currencies, props.localCurrencyId] as const,
  async ([open]) => {
    if (!open) return;
    // 打开时强制刷新；预填口径与业务联系单一致：公司本位币 + 开船日/今天 + 应付 crValue
    await ensureExchangeRateCache(true);
    if (!props.open) return;
    pairs.value = props.currencies.map((currency) => buildPair(currency));
  },
);

function toRate(val: null | number | string): null | number {
  if (val === null || val === undefined || val === '') return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function onSettlementToOriginalChange(
  pair: RatePair,
  val: null | number | string,
) {
  const rate = toRate(val);
  pair.settlementToOriginal = rate;
  pair.originalToSettlement = inverseRate(rate);
}

function onOriginalToSettlementChange(
  pair: RatePair,
  val: null | number | string,
) {
  const rate = toRate(val);
  pair.originalToSettlement = rate;
  pair.settlementToOriginal = inverseRate(rate);
}

function handleOk() {
  const rateMap = new Map<string, number>();
  for (const pair of pairs.value) {
    const rate = pair.originalToSettlement;
    if (rate == null || rate <= 0) {
      message.warning(
        `请填写 1${pair.originalCode} 兑 ${pair.settlementCode} 的汇率`,
      );
      return;
    }
    rateMap.set(pair.pairKey, rate);
  }
  emit('confirm', rateMap);
  emit('update:open', false);
}

function handleCancel() {
  emit('update:open', false);
}
</script>

<template>
  <Modal
    :open="open"
    title="币别汇率折算"
    :width="480"
    ok-text="确定"
    cancel-text="关闭"
    destroy-on-close
    @ok="handleOk"
    @cancel="handleCancel"
  >
    <div class="py-1">
      <div class="mb-4 text-sm text-gray-500">
        所选费用包含与结算币别不同的币种，请按「1 单位 =」确认汇率（精度
        {{ RATE_PRECISION }} 位，改一侧另一侧自动取倒数）。
      </div>
      <div class="space-y-4">
        <div v-for="pair in pairs" :key="pair.pairKey" class="rate-pair">
          <div v-if="pair.asOf" class="rate-pair__as-of">
            按开船日期 {{ pair.asOf }} 匹配
          </div>
          <div class="rate-row">
            <span class="rate-row__lead">1</span>
            <span class="rate-row__code">{{ pair.settlementCode }}</span>
            <span class="rate-row__eq">=</span>
            <InputNumber
              :value="pair.settlementToOriginal"
              :min="0"
              :precision="RATE_PRECISION"
              :step="0.000001"
              class="rate-row__input"
              placeholder="请输入汇率"
              @change="(val) => onSettlementToOriginalChange(pair, val)"
            />
            <span class="rate-row__code">{{ pair.originalCode }}</span>
          </div>
          <div class="rate-row">
            <span class="rate-row__lead">1</span>
            <span class="rate-row__code">{{ pair.originalCode }}</span>
            <span class="rate-row__eq">=</span>
            <InputNumber
              :value="pair.originalToSettlement"
              :min="0"
              :precision="RATE_PRECISION"
              :step="0.000001"
              class="rate-row__input"
              placeholder="请输入汇率"
              @change="(val) => onOriginalToSettlementChange(pair, val)"
            />
            <span class="rate-row__code">{{ pair.settlementCode }}</span>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>

<style scoped>
.rate-pair {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  background: #f8fafc;
  border: 1px solid #e8eef6;
  border-radius: 8px;
}

.rate-pair__as-of {
  font-size: 12px;
  color: #64748b;
}

.rate-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rate-row__lead {
  width: 14px;
  font-size: 14px;
  font-weight: 600;
  color: #334155;
  text-align: right;
}

.rate-row__code {
  min-width: 36px;
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}

.rate-row__eq {
  color: #94a3b8;
}

.rate-row__input {
  flex: 1;
}
</style>
