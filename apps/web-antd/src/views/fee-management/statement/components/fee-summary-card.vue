<script lang="ts" setup>
import type { FeeDetailRow } from '../form-data';
import { computed } from 'vue';
import { getCurrencyEnumOptions, getCurrencyEnumSymbolOptions } from '#/views/sea-export-admin/orderFee/data';
import reciveIcon from '#/assets/images/statement/reciveIcon.png';
import payIcon from '#/assets/images/statement/payIcon.png';
import allIcon from '#/assets/images/statement/allIcon.png';

interface CurrencySummaryCard {
  currencyId: number;
  currencyName: string;
  receivableAmount: number;      // 应收
  payAmount: number;             // 应付
  totalAmount: number;           // 合计
  receivableUnSettledAmount: number;  // 未收
  payUnSettledAmount: number;         // 未付
  unsettledTotal: number;        // 未结算合计
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
  return Array.from(map.values()).map(summary => ({
    ...summary,
    totalAmount: summary.receivableAmount + summary.payAmount,
    unsettledTotal: summary.receivableUnSettledAmount + summary.payUnSettledAmount,
  }));
});

// 格式化金额
function formatAmount(amount: number): string {
  return amount.toFixed(2);
}

// 获取币别符号
function getCurrencySymbol(currencyId: number): string {
  const option = getCurrencyEnumSymbolOptions().find(o => o.value === currencyId);
  return option ? option.label : '¥';
}

// 获取币别名称
function getCurrencyLabel(currencyId: number): string {
  const option = getCurrencyEnumOptions().find(o => o.value === currencyId);
  return option ? option.label : '';
}
</script>

<template>
  <div v-if="currencySummaries.length === 0" class="empty-state">
    <span class="text-gray-400">暂无费用数据</span>
  </div>
  
  <div v-else class="fee-summary-container">
    <div 
      v-for="summary in currencySummaries" 
      :key="summary.currencyId"
      class="currency-card"
    >
      <!-- 币别标题 -->
      <div class="currency-header">
        <span class="currency-code">{{ getCurrencyLabel(summary.currencyId) }}</span>
      </div>

      <!-- 第一行：应收、应付、合计（蓝色系） -->
      <div class="amount-row blue-row">
        <div class="amount-item">
          <img :src="reciveIcon" alt="应收" class="icon" />
          <div class="amount-value">{{ getCurrencySymbol(summary.currencyId) }}{{ formatAmount(summary.receivableAmount) }}</div>
          <div class="amount-label">应收</div>
        </div>
        <div class="amount-item">
          <img :src="payIcon" alt="应付" class="icon" />
          <div class="amount-value">{{ getCurrencySymbol(summary.currencyId) }}{{ formatAmount(summary.payAmount) }}</div>
          <div class="amount-label">应付</div>
        </div>
        <div class="amount-item">
          <img :src="allIcon" alt="合计" class="icon" />
          <div class="amount-value">{{ getCurrencySymbol(summary.currencyId) }}{{ formatAmount(summary.totalAmount) }}</div>
          <div class="amount-label">合计</div>
        </div>
      </div>

      <!-- 第二行：未收、未付、合计（橙色系） -->
      <div class="amount-row orange-row">
        <div class="amount-item">
          <img :src="reciveIcon" alt="未收" class="icon" />
          <div class="amount-value">{{ getCurrencySymbol(summary.currencyId) }}{{ formatAmount(summary.receivableUnSettledAmount) }}</div>
          <div class="amount-label">未收</div>
        </div>
        <div class="amount-item">
          <img :src="payIcon" alt="未付" class="icon" />
          <div class="amount-value">{{ getCurrencySymbol(summary.currencyId) }}{{ formatAmount(summary.payUnSettledAmount) }}</div>
          <div class="amount-label">未付</div>
        </div>
        <div class="amount-item">
          <img :src="allIcon" alt="合计" class="icon" />
          <div class="amount-value">{{ getCurrencySymbol(summary.currencyId) }}{{ formatAmount(summary.unsettledTotal) }}</div>
          <div class="amount-label">合计</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
}

.fee-summary-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 10px;
  //padding: 8px 0;
}

.currency-card {
  width: 213px;
  height: 213px;
  padding: 10px;
  background: linear-gradient(135deg, #e6f4ff 0%, #f0f7ff 100%);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  flex-shrink: 0;

  // &:hover {
  //   box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  //   transform: translateY(-2px);
  // }
}

.currency-header {
  //margin-bottom: 12px;
  padding-bottom: 1px;
  //border-bottom: 2px solid rgba(24, 144, 255, 0.1);
}

.currency-code {
  font-size: 20px;
  font-weight: 700;
  color: #262626;
  letter-spacing: 0.5px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
  padding: 5px;
  background: rgba(255, 255, 255, 0.8);
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
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  text-align: center;
}

.icon {
  width: 20px;
  height: 20px;
  object-fit: contain;
  opacity: 0.8;
}

.amount-value {
  font-family: Monaco, Consolas, 'Courier New', monospace;
  font-size: 16px;
  font-weight: 700;
  color: #262626;
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.amount-label {
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.blue-row .amount-label {
  color: #1890ff;
}

.orange-row .amount-label {
  color: #fa8c16;
}

/* 响应式设计 */
@media (max-width: 1400px) {
  .fee-summary-container {
    justify-content: flex-start;
  }
}

@media (max-width: 1200px) {
  .currency-card {
    min-width: 260px;
  }
}

@media (max-width: 1200px) {
  .currency-card {
    min-width: 240px;
    padding: 16px;
  }

  .currency-code {
    font-size: 20px;
  }

  .amount-value {
    font-size: 16px;
  }
}

@media (max-width: 768px) {
  .currency-card {
    width: 100%;
    height: auto;
    min-height: 232px;
  }

  .amount-row {
    flex-direction: column;
    gap: 16px;
  }
}
</style>
