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
        // ✅ 修复：使用 setDataAtRowProp 而不是 setDataAtCell
        hotInstance.setDataAtRowProp(rowIndex, 'currencyId', currencyLabel);
      }
    }

    // 自动填充单位
    if (feeDetail.unit) {
      // ✅ 修复：使用 setDataAtRowProp 而不是 setDataAtCell
      hotInstance.setDataAtRowProp(rowIndex, 'unit', feeDetail.unit);
    }

    // 自动填充税率
    if (feeDetail.taxRate !== undefined && feeDetail.taxRate !== null) {
      // ✅ 修复：使用 setDataAtRowProp 而不是 setDataAtCell
      hotInstance.setDataAtRowProp(rowIndex, 'taxRate', feeDetail.taxRate);
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
    // ✅ 修复：使用 setDataAtRowProp 而不是 setDataAtCell
    hotInstance.setDataAtRowProp(rowIndex, 'settlementId', '');

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
    if (!unitPrice || isNaN(unitPrice)) return;
    
    // 税率为空或0时，不含税单价等于含税单价
    const effectiveTaxRate = (taxRate !== null && taxRate !== undefined && !isNaN(taxRate)) ? taxRate : 0;
    
    // 计算不含税单价：不含税单价 = 含税单价 / (1 + 税率/100)
    const noTaxUnitPrice = unitPrice / (1 + effectiveTaxRate / 100);
    // ✅ 修复：使用 setDataAtRowProp 而不是 setDataAtCell
    hotInstance.setDataAtRowProp(
      rowIndex,
      'noTaxUnitPrice',
      parseFloat(noTaxUnitPrice.toFixed(2)),
    );
  };

  /**
   * ✅ 新增：税率变更后的联动处理
   */
  const onTaxRateChange = (
    rowIndex: number,
    unitPrice: number,
    taxRate: number,
    hotInstance: any,
  ) => {
    if (!unitPrice || isNaN(unitPrice)) return;
    
    // 税率为空或0时，不含税单价等于含税单价
    const effectiveTaxRate = (taxRate !== null && taxRate !== undefined && !isNaN(taxRate)) ? taxRate : 0;
    
    // 计算不含税单价：不含税单价 = 含税单价 / (1 + 税率/100)
    const noTaxUnitPrice = unitPrice / (1 + effectiveTaxRate / 100);
    // ✅ 修复：使用 setDataAtRowProp 而不是 setDataAtCell
    hotInstance.setDataAtRowProp(
      rowIndex,
      'noTaxUnitPrice',
      parseFloat(noTaxUnitPrice.toFixed(2)),
    );
  };

  return {
    onFeeCodeChange,
    onIndustryCategoryChange,
    onUnitPriceChange,
    onTaxRateChange, // ✅ 新增：导出税率变更处理函数
  };
}
