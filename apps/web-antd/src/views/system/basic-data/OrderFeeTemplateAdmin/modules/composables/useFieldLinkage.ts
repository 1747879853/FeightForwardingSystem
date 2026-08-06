import type { OrderFeeTemplateAdminApi } from '#/api/sea-export/order-fee-template-admin';

/**
 * 费用模板表格字段联动逻辑
 */
export function useFieldLinkage(dropdownSources: any) {
  /**
   * 费用代码变更后的联动处理
   */
  const onFeeCodeChange = async (
    rowIndex: number,
    feeCodeId: number,
    hotInstance: any,
    formApi?: any, // ✅ 新增：接收表单API以获取基础信息的收付类型
  ) => {
    const feeDetail = dropdownSources.getFeeCodeDetail(feeCodeId);
    console.log('✅ [onFeeCodeChange] 费用代码详情:', feeDetail);
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

    // ✅ 新增：根据基础信息收付类型和费用代码的默认行业类别，自动填充行业类别
    if (formApi) {
      try {
        // ✅ 修复：formApi.getValues() 是异步方法，需要 await
        const formValues = await formApi.getValues();
        const paySide = formValues?.paySide;
        
        console.log('🔍 [onFeeCodeChange] 基础信息收付类型:', paySide);
        console.log('🔍 [onFeeCodeChange] 费用代码defaultCreditName:', feeDetail.defaultCreditName);
        console.log('🔍 [onFeeCodeChange] 费用代码defaultDebitName:', feeDetail.defaultDebitName);
        
        let industryCategoryValue = '';
        
        // 根据收付类型选择对应的默认行业类别
        if (paySide === 0) {
          // 应收：使用 defaultDebitName
          industryCategoryValue = feeDetail.defaultDebitName || '';
          console.log('✅ [onFeeCodeChange] 应收模式，使用 defaultDebitName:', industryCategoryValue);
        } else if (paySide === 1) {
          // 应付：使用 defaultCreditName
          industryCategoryValue = feeDetail.defaultCreditName || '';
          console.log('✅ [onFeeCodeChange] 应付模式，使用 defaultCreditName:', industryCategoryValue);
        }
        
        // 如果找到了行业类别值，则自动填充
        if (industryCategoryValue) {
          // 查找对应的行业类别选项
          const industryOptions = getIndustryCategoryOptions();
          const industryItem = industryOptions.find(
            (item) => item.value === industryCategoryValue,
          );
          
          if (industryItem) {
            console.log('✅ [onFeeCodeChange] 自动填充行业类别:', industryItem.label, '(value:', industryItem.value, ')');
            // ✅ 修复：使用 setDataAtRowProp 设置行业类别的 Label
            hotInstance.setDataAtRowProp(rowIndex, 'industryCategory', industryItem.label);
            
            // 同时保存 _value 字段
            hotInstance.setDataAtRowProp(rowIndex, 'industryCategory_value', industryItem.value);
          } else {
            console.warn('⚠️ [onFeeCodeChange] 未找到行业类别选项，value:', industryCategoryValue);
          }
        } else {
          console.log('ℹ️ [onFeeCodeChange] 费用代码未配置默认行业类别');
        }
      } catch (error) {
        console.error('❌ [onFeeCodeChange] 获取基础信息失败:', error);
      }
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

// ✅ 新增：导入行业类别选项函数
import { getIndustryCategoryOptions } from '#/views/sea-export-admin/orderFee/data';
