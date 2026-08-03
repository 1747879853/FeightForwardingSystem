import { computed } from 'vue';

/**
 * 计算属性
 */
export function useComputed(
  goodsDetails: any,
  formData: any,
  applicationGroupsData: any,
  invoiceExchangeRate: any,
  selectedClientInvoiceInfo: any,
  orgBankAccounts: any,
) {
  /**
   * 计算商品明细总金额（人民币）
   */
  const totalInvoiceAmount = computed(() => {
    return goodsDetails.value.reduce(
      (sum: number, item: any) => sum + (item.amount || 0),
      0,
    );
  });

  /**
   * 计算商品明细总税额（人民币）
   */
  const totalTaxAmount = computed(() => {
    return goodsDetails.value.reduce(
      (sum: number, item: any) => sum + (item.taxAmount || 0),
      0,
    );
  });

  /**
   * 计算申请总金额（原币金额，从申请明细中获取）
   */
  const totalAppliedAmountOriginal = computed(() => {
    const items = formData.value.invoiceIssueItems || [];

    let total = 0;
    items.forEach((item: any) => {
      const app = applicationGroupsData.value.find(
        (a: any) => a.id === item.invoiceApplicationId,
      );
      if (app) {
        total += app.totalAppliedAmount || 0;
      }
    });

    return total;
  });

  /**
   * 计算申请总金额（转换为人民币）
   */
  const totalAppliedAmount = computed(() => {
    // 如果发票币别是人民币，直接返回
    if (formData.value.currencyId === 1) {
      return totalAppliedAmountOriginal.value;
    }

    // 如果是外币，转换为人民币
    return totalAppliedAmountOriginal.value * (invoiceExchangeRate.value || 1);
  });

  /**
   * 判断发票金额与申请金额是否有差异
   */
  const hasAmountDifference = computed(() => {
    return Math.abs(totalInvoiceAmount.value - totalAppliedAmount.value) > 0.01;
  });

  /**
   * 获取原币金额（用于显示）
   */
  const foreignCurrencyAmount = computed(() => {
    // 只有非人民币才需要显示原币金额
    if (formData.value.currencyId === 1) {
      return null;
    }

    return totalAppliedAmountOriginal.value;
  });

  /**
   * 获取与开票币种一致的银行列表（客户）
   */
  const filteredClientBanks = computed(() => {
    if (!selectedClientInvoiceInfo.value || !formData.value.currencyId) {
      return [];
    }

    const currencyId = formData.value.currencyId;
    const banks = selectedClientInvoiceInfo.value.clientInvoiceBanks || [];

    return banks.filter((bank: any) => bank.currencyId === currencyId);
  });

  /**
   * 获取销售方与开票币种一致的银行列表
   */
  const filteredOrgBanks = computed(() => {
    if (!orgBankAccounts.value.length || !formData.value.currencyId) {
      return [];
    }

    const currencyId = formData.value.currencyId;

    return orgBankAccounts.value.filter(
      (bank: any) => bank.currencyId === currencyId,
    );
  });

  return {
    totalInvoiceAmount,
    totalTaxAmount,
    totalAppliedAmountOriginal,
    totalAppliedAmount,
    hasAmountDifference,
    foreignCurrencyAmount,
    filteredClientBanks,
    filteredOrgBanks,
  };
}
