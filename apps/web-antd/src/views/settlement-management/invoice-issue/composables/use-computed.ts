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
   * 是否存在申请总额缺汇率（totalAppliedAmount 为 null）
   */
  const hasMissingApplicationRate = computed(() => {
    const items = formData.value.invoiceIssueItems || [];
    return items.some((item: any) => {
      const app = applicationGroupsData.value.find(
        (a: any) => String(a.id) === String(item.invoiceApplicationId),
      );
      return app && app.totalAppliedAmount == null;
    });
  });

  /**
   * 计算申请总金额（开票申请主币别合计；有缺汇率则为 null）
   */
  const totalAppliedAmountOriginal = computed(() => {
    const items = formData.value.invoiceIssueItems || [];
    if (items.length === 0) return 0;

    let total = 0;
    for (const item of items) {
      const app = applicationGroupsData.value.find(
        (a: any) => String(a.id) === String(item.invoiceApplicationId),
      );
      if (!app) continue;
      if (app.totalAppliedAmount == null) {
        return null;
      }
      total += Number(app.totalAppliedAmount) || 0;
    }

    return total;
  });

  /**
   * 计算申请总金额（人民币）。优先用 API 的 appliedAmountRmb 累加。
   */
  const totalAppliedAmount = computed(() => {
    const items = formData.value.invoiceIssueItems || [];
    if (items.length === 0) return 0;

    let hasAnyRmb = false;
    let rmbSum = 0;
    let allHaveRmb = true;

    for (const item of items) {
      const app = applicationGroupsData.value.find(
        (a: any) => String(a.id) === String(item.invoiceApplicationId),
      );
      if (!app) continue;

      if (app.appliedAmountRmb != null) {
        hasAnyRmb = true;
        rmbSum += Number(app.appliedAmountRmb) || 0;
      } else {
        allHaveRmb = false;
      }
    }

    if (hasAnyRmb && allHaveRmb) {
      return rmbSum;
    }

    const original = totalAppliedAmountOriginal.value;
    if (original == null) return null;

    if (formData.value.currencyId === 1) {
      return original;
    }

    return original * (invoiceExchangeRate.value || 1);
  });

  /**
   * 判断发票金额与申请金额是否有差异（缺汇率时不判差异）
   */
  const hasAmountDifference = computed(() => {
    if (totalAppliedAmount.value == null) return false;
    return Math.abs(totalInvoiceAmount.value - totalAppliedAmount.value) > 0.01;
  });

  /**
   * 获取原币金额（用于显示）
   */
  const foreignCurrencyAmount = computed(() => {
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
    hasMissingApplicationRate,
    foreignCurrencyAmount,
    filteredClientBanks,
    filteredOrgBanks,
  };
}
