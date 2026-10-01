<script lang="ts" setup>
import type { FeeDetailRow } from '../form-data';
import { computed } from 'vue';
import {
  getCurrencyEnumOptions,
  getCurrencyEnumSymbolOptions,
} from '#/views/sea-export-admin/orderFee/data';

interface CurrencySummaryCard {
  currencyId: number;
  currencyName: string;
  receivableAmount: number; // 应收
  payAmount: number; // 应付
  totalAmount: number; // 合计
  receivableUnSettledAmount: number; // 未收
  payUnSettledAmount: number; // 未付
  unsettledTotal: number; // 未结算合计
}

const props = defineProps<{
  feeDetails: FeeDetailRow[];
}>();

// 按币别分组计算费用汇总
const currencySummaries = computed<CurrencySummaryCard[]>(() => {
  const map = new Map<number, CurrencySummaryCard>();

  for (const fee of props.feeDetails) {
    if (!fee.currencyId || !fee.currencyName) continue;

    if (!map.has(fee.currencyId)) {
      map.set(fee.currencyId, {
        currencyId: fee.currencyId,
        currencyName: fee.currencyName,
        receivableAmount: 0,
        payAmount: 0,
        totalAmount: 0,
        receivableUnSettledAmount: 0,
        payUnSettledAmount: 0,
        unsettledTotal: 0,
      });
    }

    const summary = map.get(fee.currencyId)!;

    if (fee.paySide === 0) {
      // 应收
      summary.receivableAmount += fee.amount || 0;
      summary.receivableUnSettledAmount += fee.unSettledAmount || 0;
    } else if (fee.paySide === 1) {
      // 应付
      summary.payAmount += fee.amount || 0;
      summary.payUnSettledAmount += fee.unSettledAmount || 0;
    }
  }

  // 计算合计
  return Array.from(map.values()).map((summary) => ({
    ...summary,
    totalAmount: summary.receivableAmount - summary.payAmount,
    unsettledTotal:
      summary.receivableUnSettledAmount - summary.payUnSettledAmount,
  }));
});

// 计算原币折算合计（人民币）
const totalSummary = computed(() => {
  let totalReceivableRMB = 0;
  let totalPayRMB = 0;
  let totalUnReceivableRMB = 0;
  let totalUnPayRMB = 0;

  for (const fee of props.feeDetails) {
    const exchangeRate = fee.exchangeRate || 1;
    const amountRMB = (fee.amount || 0) * exchangeRate;
    const unSettledAmountRMB = (fee.unSettledAmount || 0) * exchangeRate;

    if (fee.paySide === 0) {
      // 应收
      totalReceivableRMB += amountRMB;
      totalUnReceivableRMB += unSettledAmountRMB;
    } else if (fee.paySide === 1) {
      // 应付
      totalPayRMB += amountRMB;
      totalUnPayRMB += unSettledAmountRMB;
    }
  }

  return {
    receivableAmount: totalReceivableRMB,
    payAmount: totalPayRMB,
    totalAmount: totalReceivableRMB - totalPayRMB,
    receivableUnSettledAmount: totalUnReceivableRMB,
    payUnSettledAmount: totalUnPayRMB,
    unsettledTotal: totalUnReceivableRMB - totalUnPayRMB,
  };
});

// 格式化金额
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

// 获取币别符号
function getCurrencySymbol(currencyId: number): string {
  const option = getCurrencyEnumSymbolOptions().find(
    (o) => o.value === currencyId,
  );
  return option ? option.label : '¥';
}

// 获取币别名称
function getCurrencyLabel(currencyId: number): string {
  const option = getCurrencyEnumOptions().find((o) => o.value === currencyId);
  return option ? option.label : '';
}
</script>

<template>
  <div v-if="currencySummaries.length === 0" class="empty-state">
    <span>暂无费用数据</span>
  </div>

  <div v-else class="fee-summary-container">
    <!-- 原币折算合计卡片 -->
    <div class="currency-card total-card">
      <!-- 币别标题 -->
      <div class="currency-header total-header">
        <span class="currency-code">原币折算合计</span>
      </div>

      <!-- 第一行：应收、应付（蓝色系） -->
      <div class="amount-row blue-row">
        <div class="amount-item">
          <div class="amount-value">
            {{ getCurrencySymbol(1)
            }}{{ formatAmount(totalSummary.receivableAmount) }}
          </div>
          <div class="amount-label">应收</div>
        </div>
        <div class="amount-item">
          <div class="amount-value">
            {{ getCurrencySymbol(1) }}{{ formatAmount(totalSummary.payAmount) }}
          </div>
          <div class="amount-label">应付</div>
        </div>
      </div>

      <!-- 第二行：未收、未付（橙色系） -->
      <div class="amount-row orange-row">
        <div class="amount-item">
          <div class="amount-value">
            {{ getCurrencySymbol(1)
            }}{{ formatAmount(totalSummary.receivableUnSettledAmount) }}
          </div>
          <div class="amount-label">未收</div>
        </div>
        <div class="amount-item">
          <div class="amount-value">
            {{ getCurrencySymbol(1)
            }}{{ formatAmount(totalSummary.payUnSettledAmount) }}
          </div>
          <div class="amount-label">未付</div>
        </div>
      </div>
    </div>

    <!-- 各币别卡片 -->
    <div
      v-for="summary in currencySummaries"
      :key="summary.currencyId"
      class="currency-card"
    >
      <!-- 币别标题 -->
      <div class="currency-header">
        <span class="currency-code">{{
          getCurrencyLabel(summary.currencyId)
        }}</span>
      </div>

      <!-- 第一行：应收、应付（蓝色系） -->
      <div class="amount-row blue-row">
        <div class="amount-item">
          <div class="amount-value">
            {{ getCurrencySymbol(summary.currencyId)
            }}{{ formatAmount(summary.receivableAmount) }}
          </div>
          <div class="amount-label">应收</div>
        </div>
        <div class="amount-item">
          <div class="amount-value">
            {{ getCurrencySymbol(summary.currencyId)
            }}{{ formatAmount(summary.payAmount) }}
          </div>
          <div class="amount-label">应付</div>
        </div>
      </div>

      <!-- 第二行：未收、未付（橙色系） -->
      <div class="amount-row orange-row">
        <div class="amount-item">
          <div class="amount-value">
            {{ getCurrencySymbol(summary.currencyId)
            }}{{ formatAmount(summary.receivableUnSettledAmount) }}
          </div>
          <div class="amount-label">未收</div>
        </div>
        <div class="amount-item">
          <div class="amount-value">
            {{ getCurrencySymbol(summary.currencyId)
            }}{{ formatAmount(summary.payUnSettledAmount) }}
          </div>
          <div class="amount-label">未付</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@media (max-width: 768px) {
  .fee-summary-container {
    flex-direction: column;
    align-items: stretch;
    height: auto;
    padding: 10px 5px;
    overflow-x: hidden;
  }

  .currency-card {
    width: 100%;
    min-width: auto;
  }
}

.fee-summary-container {
  display: flex;
  flex-wrap: nowrap;
  gap: 12px;
  align-items: flex-start;
  padding: 10px 5px;
  overflow: auto hidden;
}

.currency-card {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  min-width: 200px;
  padding: 12px;
  margin: 0;
  background: linear-gradient(
    165deg,
    hsl(var(--primary) / 12%) 0%,
    hsl(var(--primary) / 5%) 48%,
    hsl(var(--background)) 100%
  );
  border: 1px solid hsl(var(--primary) / 14%);
  border-radius: 16px;
  box-shadow: 0 2px 10px hsl(var(--primary) / 8%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.currency-card:hover {
  box-shadow: 0 6px 18px hsl(var(--primary) / 14%);
  transform: translateY(-1px);
}

.total-card {
  background: linear-gradient(
    145deg,
    hsl(var(--primary) / 20%) 0%,
    hsl(var(--primary) / 8%) 45%,
    hsl(var(--primary) / 3%) 100%
  );
  border: 1px solid hsl(var(--primary) / 22%);
  box-shadow: 0 4px 16px hsl(var(--primary) / 14%);
}

.total-header .currency-code {
  color: transparent;
  background: linear-gradient(
    90deg,
    hsl(var(--primary)) 0%,
    hsl(var(--primary) / 70%) 100%
  );
  background-clip: text;
}

.currency-header {
  padding-bottom: 6px;
  margin-bottom: 12px;
  border-bottom: 2px solid hsl(var(--primary) / 12%);
}

.currency-code {
  font-size: 18px;
  font-weight: 700;
  color: #252a31;
  letter-spacing: 0.5px;
}

.amount-row {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: 12px 8px;
  margin-bottom: 0.75rem;
  background: rgb(255 255 255 / 88%);
  border-radius: 10px;
  box-shadow: inset 0 0 0 1px hsl(var(--primary) / 4%);

  &:last-child {
    margin-bottom: 0;
  }
}

.blue-row {
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 6%) 0%,
    rgb(255 255 255 / 90%) 55%
  );
  border-left: 3px solid hsl(var(--primary));
}

.orange-row {
  background: linear-gradient(
    90deg,
    rgb(250 140 22 / 8%) 0%,
    rgb(255 255 255 / 90%) 55%
  );
  border-left: 3px solid #fa8c16;
}

.amount-item {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  text-align: center;
}

.amount-value {
  font-family: 'MiSans Latin', 'DIN Alternate', Roboto, sans-serif;
  font-size: 16px;
  font-weight: 600;
  line-height: 16px;
  color: #3d3d3d;
  letter-spacing: 0;
  white-space: nowrap;
}

.amount-label {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.blue-row .amount-label {
  color: hsl(var(--primary));
}

.orange-row .amount-label {
  color: #fa8c16;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  padding: 16px;
  color: #94a3b8;
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 4%) 0%,
    hsl(var(--background)) 100%
  );
  border: 1px dashed hsl(var(--primary) / 18%);
  border-radius: 12px;
}
</style>
