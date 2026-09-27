import type { Ref } from 'vue';

import { computed } from 'vue';

import {
  toApplicationCurrency,
  toInvoiceRmbAmount,
  type InvoiceApplicationExchangeRateRow,
} from '#/utils/invoice-application-amount';

import { getInvoiceTypeOptions } from '../data';

/**
 * 从费用明细 + 费用组推导带 currencyId 的申请金额项
 */
export function collectFeeAppliedItems(
  formData: { invoiceApplicationItems?: any[] },
  feeGroupsData: any[],
  flattenTreeData: (data: any[]) => any[],
): Array<{ currencyId: number; appliedAmount: number }> {
  const items = formData.invoiceApplicationItems || [];
  const allFees = flattenTreeData(feeGroupsData);
  const result: Array<{ currencyId: number; appliedAmount: number }> = [];

  for (const item of items) {
    const fee = allFees.find(
      (f: any) =>
        f.orderFee?.id === item.orderFeeId ||
        String(f.orderFee?.id) === String(item.orderFeeId),
    );
    const currencyId =
      fee?.orderFee?.currencyId ?? item.orderFee?.currencyId ?? item.currencyId;
    if (!currencyId) continue;
    result.push({
      currencyId: Number(currencyId),
      appliedAmount: Number(item.appliedAmount) || 0,
    });
  }
  return result;
}

/**
 * 计算属性相关逻辑（税率/发票类型/金额汇总）
 */
export function useComputed(
  goodsDetails: Ref<any[]>,
  formData: Ref<any>,
  invoiceExchangeRate: Ref<number>,
  invoiceApplicationExchangeRates: Ref<InvoiceApplicationExchangeRateRow[]>,
  feeGroupsData: Ref<any[]>,
  flattenTreeData: (data: any[]) => any[],
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

  const feeAppliedItems = computed(() =>
    collectFeeAppliedItems(
      formData.value,
      feeGroupsData.value,
      flattenTreeData,
    ),
  );

  /** 申请总额（折主币别）；缺汇率时为 null */
  const totalAppliedAmountOriginal = computed(() => {
    const appCurrencyId = formData.value.currencyId;
    if (!appCurrencyId) return null;
    return toApplicationCurrency(
      feeAppliedItems.value,
      Number(appCurrencyId),
      invoiceApplicationExchangeRates.value,
    );
  });

  /** 折算人民币参考金额 = round(申请总额 × 发票汇率, 2)；缺汇率时为 null */
  const totalAppliedAmount = computed(() => {
    return toInvoiceRmbAmount(
      totalAppliedAmountOriginal.value,
      invoiceExchangeRate.value || 1,
    );
  });

  const hasAmountDifference = computed(() => {
    if (totalAppliedAmount.value == null) return false;
    return Math.abs(totalInvoiceAmount.value - totalAppliedAmount.value) > 0.01;
  });

  /** 有非主币别缺汇率 */
  const hasMissingExchangeRates = computed(
    () =>
      totalAppliedAmountOriginal.value == null &&
      feeAppliedItems.value.length > 0,
  );

  const foreignCurrencyAmount = computed(() => {
    // 多币别下「原币合计」不再单一展示；改由汇率行展示各币别原币合计
    return null as null | number;
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
    hasMissingExchangeRates,
    foreignCurrencyAmount,
    feeAppliedItems,
  };
}
