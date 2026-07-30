import { ref } from 'vue';
import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';

/**
 * 费用模板表格下拉数据源管理
 */
export function useDropdownSources() {
  // 费用代码列表
  const feeCodeList = ref<
    Array<{
      label: string;
      value: number;
      currencyId?: number;
      unit?: string;
      taxRate?: number;
    }>
  >([]);

  // 币别列表
  const currencyList = ref<Array<{ label: string; value: number }>>([]);

  // 客户列表（按行业类别分组）
  const clientListByIndustry = ref<
    Record<string, Array<{ label: string; value: number }>>
  >({});

  /**
   * 根据行业类别获取结算对象列表
   */
  const getSettlementList = (industryCategory: string) => {
    return clientListByIndustry.value[industryCategory] || [];
  };

  /**
   * 根据费用代码ID获取费用详情
   */
  const getFeeCodeDetail = (feeCodeId: number) => {
    return feeCodeList.value.find((item) => item.value === feeCodeId);
  };

  return {
    feeCodeList,
    currencyList,
    clientListByIndustry,
    getSettlementList,
    getFeeCodeDetail,
  };
}
