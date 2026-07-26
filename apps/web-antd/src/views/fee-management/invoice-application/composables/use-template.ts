import { message } from 'ant-design-vue';
import type { Ref, ComputedRef } from 'vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
/**
 * 备注模板相关逻辑
 */
export function useTemplate(
  formData: Ref<any>,
  feeGroupsData: Ref<any[]>,
  invoiceExchangeRate: Ref<number>,
  filteredClientBanks: ComputedRef<any[]>,
  filteredOrgBanks: ComputedRef<any[]>,
  flattenTreeData: (data: any[]) => any[],
) {
  /**
   * 打开备注模板管理弹窗
   */
  function handleOpenRemarkTemplateModal() {
    // 由父组件控制弹窗显示
  }

  /**
   * 打开选择备注模板弹窗
   */
  function handleOpenSelectRemarkTemplateModal() {
    const items = formData.value.invoiceApplicationItems || [];

    if (items.length === 0) {
      message.warning(
        '请先点击"从开票申请导入费用"按钮，从抽屉中添加费用后再使用模板功能',
      );
      return false;
    }

    if (feeGroupsData.value.length === 0) {
      message.error('费用数据不完整，请重新添加费用');
      return false;
    }

    return true;
  }

  /**
   * 接收模板内容并填充到备注字段
   */
  function handleUseTemplate(template: string) {
    if (template) {
      formData.value.remark = template;
    }
  }

  /**
   * 从费用明细中提取备注信息
   */
  function handleExtractRemark() {
    const items = formData.value.invoiceApplicationItems || [];

    if (items.length === 0) {
      message.warning('请先添加费用明细');
      return;
    }

    try {
      const commissionNums = new Set<string>();
      const mblNums = new Set<string>();
      const amountByCurrency: Record<number, { code: string; total: number }> =
        {};

      items.forEach((item: any) => {
        if (item.commissionNum) {
          commissionNums.add(item.commissionNum);
        }

        if (item.mblNum) {
          mblNums.add(item.mblNum);
        }

        const currencyId = item.currencyId || formData.value.currencyId;
        const appliedAmount = item.appliedAmount || 0;

        if (!amountByCurrency[currencyId]) {
          amountByCurrency[currencyId] = {
            code: item.currencyCode || 'CNY',
            total: 0,
          };
        }
        amountByCurrency[currencyId].total += appliedAmount;
      });

      let remark = '';

      if (commissionNums.size > 0) {
        remark += `委托编号：${Array.from(commissionNums).join('、')}\n`;
      }

      if (mblNums.size > 0) {
        remark += `主提单号：${Array.from(mblNums).join('、')}\n`;
      }

      remark += '\n';
      Object.values(amountByCurrency).forEach(({ code, total }) => {
        remark += `${code}金额(总计)：${total.toFixed(2)}\n`;
      });

      formData.value.remark = remark;
      message.success(`已从 ${items.length} 条费用明细中提取备注信息`);
    } catch (error) {
      console.error('提取备注失败:', error);
    }
  }

  /**
   * 备注模板占位符数据对象（计算属性）
   */
  const remarkTemplateData = computed(() => {
    const items = formData.value.invoiceApplicationItems || [];
    const commissionNums = new Set<string>();
    const mblNums = new Set<string>();

    console.log(
      '🔍 remarkTemplateData 计算 - invoiceApplicationItems 数量:',
      items.length,
    );
    console.log(
      '🔍 remarkTemplateData 计算 - feeGroupsData 数量:',
      feeGroupsData.value?.length || 0,
    );

    if (feeGroupsData.value && feeGroupsData.value.length > 0) {
      const allFees = flattenTreeData(feeGroupsData.value);
      console.log('🔍 flattenTreeData 结果数量:', allFees.length);

      items.forEach((item: any, index: number) => {
        console.log(
          `🔍 处理第 ${index + 1} 个费用项 - orderFeeId:`,
          item.orderFeeId,
        );

        const fee = allFees.find(
          (f: any) => f.orderFee?.id === item.orderFeeId,
        );

        if (fee) {
          console.log('  ✅ 找到匹配的费用');
          console.log('  - commissionNum:', fee.transportOrder?.commissionNum);
          console.log('  - mblNum:', fee.transportOrder?.mblNum);

          if (fee.transportOrder?.commissionNum) {
            commissionNums.add(fee.transportOrder.commissionNum);
          }
          // ✅ 修复：移除 mblNum !== '-' 的限制，允许所有值（包括空字符串）
          if (fee.transportOrder?.mblNum) {
            mblNums.add(fee.transportOrder.mblNum);
          }
        } else {
          console.warn('  ❌ 未找到匹配的费用，orderFeeId:', item.orderFeeId);
        }
      });
    }

    const clientBank = filteredClientBanks.value.find(
      (b) => b.id === formData.value.clientInvoiceBankId,
    );

    const orgBank = filteredOrgBanks.value.find(
      (b) => b.id === formData.value.orgBankAccountId,
    );

    const result = {
      commissionNum: Array.from(commissionNums).join('、') || '',
      mblNum: Array.from(mblNums).join('、') || '',
      invoiceExchangeRate: invoiceExchangeRate.value || 1,
      foreignCurrencyAmount: calculateTotalAppliedAmountOriginal().toFixed(2),
      rmbAmount: calculateTotalAppliedAmount().toFixed(2),
      clientBankName: clientBank?.bankName || '',
      clientBankAccount: clientBank?.bankAccount || '',
      orgBankName: orgBank?.bankName || '',
      orgBankAccount: orgBank?.bankAccount || '',
    };

    console.log('✅ remarkTemplateData 最终结果:', {
      commissionNum: result.commissionNum,
      mblNum: result.mblNum,
    });

    return result;
  });

  /**
   * 计算申请总金额（原币金额）
   */
  function calculateTotalAppliedAmountOriginal(): number {
    const items = formData.value.invoiceApplicationItems || [];
    return items.reduce(
      (sum: number, item: any) => sum + (item.appliedAmount || 0),
      0,
    );
  }

  /**
   * 计算申请总金额（转换为人民币）
   */
  function calculateTotalAppliedAmount(): number {
    if (formData.value.currencyId === 1) {
      return calculateTotalAppliedAmountOriginal();
    }

    return (
      calculateTotalAppliedAmountOriginal() * (invoiceExchangeRate.value || 1)
    );
  }

  return {
    handleOpenRemarkTemplateModal,
    handleOpenSelectRemarkTemplateModal,
    handleUseTemplate,
    handleExtractRemark,
    remarkTemplateData,
    calculateTotalAppliedAmountOriginal,
    calculateTotalAppliedAmount,
  };
}
