import type { Ref } from 'vue';

import { computed } from 'vue';

import { getInvoiceTypeOptions } from '../data';

/**
 * 计算属性相关逻辑（税率/发票类型/金额汇总）
 */
export function useComputed(
  goodsDetails: Ref<any[]>,
  formData: Ref<any>,
  invoiceExchangeRate: Ref<number>,
) {
  const taxRateOptions = [
    { label: '免税', value: 0 },
    { label: '6%', value: 6 },
    { label: '9%', value: 9 },
    { label: '13%', value: 13 },
  ];

  /** 与列表/抽屉共用完整发票类型（含纸票） */
  const invoiceTypeOptions = getInvoiceTypeOptions().map(
    ({ label, value }) => ({
      label,
      value,
    }),
  );

  function getTaxRateLabel(value: number | string): string {
    if (value === 0 || value === '0') return '免税';
    if (value === 6 || value === '6') return '6%';
    if (value === 9 || value === '9') return '9%';
    if (value === 13 || value === '13') return '13%';
    return `${value}%`;
  }

  function getInvoiceTitle(invoiceType: string): string {
    const option = invoiceTypeOptions.find((opt) => opt.value === invoiceType);
    return option ? option.label : '增值税电子普通发票';
  }

  const totalInvoiceAmount = computed(() => {
    return goodsDetails.value.reduce(
      (sum, item) => sum + (item.amount || 0),
      0,
    );
  });

  const totalTaxAmount = computed(() => {
    return goodsDetails.value.reduce(
      (sum, item) => sum + (item.taxAmount || 0),
      0,
    );
  });

  const totalAppliedAmountOriginal = computed(() => {
    const items = formData.value.invoiceApplicationItems || [];
    return items.reduce(
      (sum: number, item: any) => sum + (item.appliedAmount || 0),
      0,
    );
  });

  const totalAppliedAmount = computed(() => {
    if (formData.value.currencyId === 1) {
      return totalAppliedAmountOriginal.value;
    }
    return totalAppliedAmountOriginal.value * (invoiceExchangeRate.value || 1);
  });

  const hasAmountDifference = computed(() => {
    return Math.abs(totalInvoiceAmount.value - totalAppliedAmount.value) > 0.01;
  });

  const foreignCurrencyAmount = computed(() => {
    if (formData.value.currencyId === 1) {
      return null;
    }
    return totalAppliedAmountOriginal.value;
  });

  return {
    taxRateOptions,
    invoiceTypeOptions,
    getTaxRateLabel,
    getInvoiceTitle,
    totalInvoiceAmount,
    totalTaxAmount,
    totalAppliedAmountOriginal,
    totalAppliedAmount,
    hasAmountDifference,
    foreignCurrencyAmount,
  };
}
