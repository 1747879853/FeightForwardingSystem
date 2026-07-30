import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';

/**
 * 费用模板表格字段联动逻辑
 */
export function useFieldLinkage(dropdownSources: any) {
  /**
   * 费用代码变更后的联动处理
   */
  const onFeeCodeChange = (
    rowIndex: number,
    feeCodeId: number,
    hotInstance: any,
  ) => {
    const feeDetail = dropdownSources.getFeeCodeDetail(feeCodeId);
    if (!feeDetail) return;

    // 自动填充币别
    if (feeDetail.currencyId) {
      const currencyLabel = dropdownSources.currencyList.value.find(
        (c: any) => c.value === feeDetail.currencyId,
      )?.label;
      if (currencyLabel) {
        hotInstance.setDataAtCell(rowIndex, 'currencyId', currencyLabel);
      }
    }

    // 自动填充单位
    if (feeDetail.unit) {
      hotInstance.setDataAtCell(rowIndex, 'unit', feeDetail.unit);
    }

    // 自动填充税率
    if (feeDetail.taxRate !== undefined && feeDetail.taxRate !== null) {
      hotInstance.setDataAtCell(rowIndex, 'taxRate', feeDetail.taxRate);
    }
  };

  /**
   * 行业类别变更后的联动处理
   */
  const onIndustryCategoryChange = (
    rowIndex: number,
    industryCategory: string,
    hotInstance: any,
  ) => {
    // 清空结算对象
    hotInstance.setDataAtCell(rowIndex, 'settlementId', '');

    // 更新结算对象的下拉选项（在 afterBeginEditing 中处理）
  };

  /**
   * 含税单价变更后的联动处理
   */
  const onUnitPriceChange = (
    rowIndex: number,
    unitPrice: number,
    taxRate: number,
    hotInstance: any,
  ) => {
    if (!unitPrice || !taxRate) return;

    // 计算不含税单价：不含税单价 = 含税单价 / (1 + 税率/100)
    const noTaxUnitPrice = unitPrice / (1 + taxRate / 100);
    hotInstance.setDataAtCell(
      rowIndex,
      'noTaxUnitPrice',
      parseFloat(noTaxUnitPrice.toFixed(2)),
    );
  };

  return {
    onFeeCodeChange,
    onIndustryCategoryChange,
    onUnitPriceChange,
  };
}
