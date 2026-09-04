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
    <span class="text-gray-400">暂无费用数据</span>
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
/* 响应式设计 */
@media (max-width: 768px) {
  .fee-summary-container {
    flex-direction: column;
    align-items: stretch;
    padding: 10px 5px;
  }

  .currency-card {
    width: 100%;
    min-width: auto;
  }
}

.total-card {
  //background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  //border: 2px solid #007bff;
  //box-shadow: 0 4px 8px rgba(0, 123, 255, 0.2);
}

.total-header {
  font-weight: bold;
  //background-color: #007bff;
  color: white;
}

/* 费用汇总容器 - 横向排列 */
.fee-summary-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
  padding: 10px 5px;
}

.currency-card {
  display: flex;
  flex-direction: column;
  min-width: 280px;
  padding: 10px;
  margin: 0; /* 移除margin，使用gap控制间距 */
  background: linear-gradient(
    180deg,
    rgb(220 238 255 / 80%) 0%,
    rgb(220 238 255 / 40%) 52.1%
  );
  border-radius: 16px;
  box-shadow: 0 2px 8px rgb(0 0 0 / 10%);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.currency-header {
  padding-bottom: 1px;
  margin-bottom: 12px;
  border-bottom: 2px solid rgb(24 144 255 / 10%);
}

.currency-code {
  font-size: 20px;
  font-weight: 700;
  color: #262626;
  letter-spacing: 0.5px;
}

.amount-row {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  padding: 12px 5px;
  margin-bottom: 1rem;
  background: rgb(255 255 255 / 80%);
  border-radius: 8px;

  &:last-child {
    margin-bottom: 0;
  }
}

.blue-row {
  border-left: 3px solid #1890ff;
}

.orange-row {
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

.icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  opacity: 0.8;
}

.amount-value {
  font-family: 'MiSans Latin';
  font-size: 16px;
  font-weight: 600;
  line-height: 16px;
  color: #3d3d3d;
  letter-spacing: 0;
  white-space: nowrap;
}

.amount-label {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.blue-row .amount-label {
  color: #1890ff;
}

.orange-row .amount-label {
  color: #fa8c16;
}

/* 原币折算合计卡片样式 */
</style>
