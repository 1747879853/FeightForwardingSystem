
import type { Ref } from 'vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
/**
 * 计算属性相关逻辑
 */
export function useComputed(
  goodsDetails: Ref<any[]>,
  formData: Ref<any>,
  invoiceExchangeRate: Ref<number>,
  selectedCurrencyCode: Ref<string>,
) {
  /**
   * 税率选项
   */
  const taxRateOptions = [
    { label: '免税', value: 0 },
    { label: '6%', value: 6 },
    { label: '9%', value: 9 },
    { label: '13%', value: 13 },
  ];

  /**
   * 发票类型选项
   */
  const invoiceTypeOptions = [
    {
      label: '电子发票（普通发票）',
      value: 'NormalElectric',
    },
    {
      label: '电子发票（增值税专用发票）',
      value: 'Special',
    },
  ];

  /**
   * 获取税率显示文本
   */
  function getTaxRateLabel(value: number | string): string {
    if (value === 0 || value === '0') return '免税';
    if (value === 6 || value === '6') return '6%';
    if (value === 9 || value === '9') return '9%';
    if (value === 13 || value === '13') return '13%';
    return `${value}%`;
  }

  /**
   * 根据发票类型获取标题
   */
  function getInvoiceTitle(invoiceType: string): string {
    const option = invoiceTypeOptions.find((opt) => opt.value === invoiceType);
    return option ? option.label : '增值税电子普通发票';
  }

  /**
   * 计算商品明细总金额（人民币）
   */
  const totalInvoiceAmount = computed(() => {
    return goodsDetails.value.reduce((sum, item) => sum + (item.amount || 0), 0);
  });

  /**
   * 计算商品明细总税额（人民币）
   */
  const totalTaxAmount = computed(() => {
    return goodsDetails.value.reduce(
      (sum, item) => sum + (item.taxAmount || 0),
      0,
    );
  });

  /**
   * 计算申请总金额（原币金额）
   */
  const totalAppliedAmountOriginal = computed(() => {
    const items = formData.value.invoiceApplicationItems || [];
    return items.reduce(
      (sum: number, item: any) => sum + (item.appliedAmount || 0),
      0,
    );
  });

  /**
   * 计算申请总金额（转换为人民币）
   */
  const totalAppliedAmount = computed(() => {
    if (formData.value.currencyId === 1) {
      return totalAppliedAmountOriginal.value;
    }

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
