import { computed, ref } from 'vue';

/**
 * 备注模板管理
 */
export function useTemplate(
  formData: any,
  applicationGroupsData: any,
  invoiceExchangeRate: any,
  flattenTreeData: (data: any[]) => any[],
) {
  // 备注模板管理弹窗相关状态
  const remarkTemplateModalVisible = ref(false);
  const selectRemarkTemplateModalVisible = ref(false);

  /**
   * 打开备注模板管理弹窗
   */
  function handleOpenRemarkTemplateModal() {
    remarkTemplateModalVisible.value = true;
  }

  /**
   * 打开选择备注模板弹窗
   */
  function handleOpenSelectRemarkTemplateModal() {
    selectRemarkTemplateModalVisible.value = true;
  }

  /**
   * 使用备注模板
   */
  function handleUseRemarkTemplate(template: string) {
    formData.value.remark = template;
  }

  /**
   * 为备注模板生成占位符数据
   */
  const remarkTemplateData = computed(() => {
    const items = formData.value.invoiceIssueItems || [];

    if (items.length === 0) {
      return {
        commissionNum: '',
        mblNum: '',
        invoiceExchangeRate: invoiceExchangeRate.value,
        foreignCurrencyAmount: '0.00',
        rmbAmount: '0.00',
        clientBankName: '',
        clientBankAccount: '',
        orgBankName: '',
        orgBankAccount: '',
      };
    }

    // 从 applicationGroupsData 中获取完整的费用信息
    const allApplications = flattenTreeData(applicationGroupsData.value);

    // 收集委托编号和主提单号
    const commissionNums = new Set<string>();
    const mblNums = new Set<string>();

    // 统计金额（按币别）
    let totalForeignAmount = 0;
    let totalRmbAmount = 0;

    items.forEach((item: any) => {
      const app = allApplications.find(
        (a: any) => a.id === item.invoiceApplicationId,
      );

      if (app) {
        // 收集委托编号
        if (app.commissionNum) {
          commissionNums.add(app.commissionNum);
        }

        // 收集主提单号
        if (app.mblNum) {
          mblNums.add(app.mblNum);
        }

        // 统计金额
        const appliedAmount = app.totalAppliedAmount || 0;
        const appCurrencyId = app.currencyId;

        // 如果是发票币别，累加外币金额
        if (appCurrencyId === formData.value.currencyId) {
          totalForeignAmount += appliedAmount;
        }

        // 转换为人民币
        if (appCurrencyId !== 1) {
          totalRmbAmount += appliedAmount * (invoiceExchangeRate.value || 1);
        } else {
          totalRmbAmount += appliedAmount;
        }
      }
    });

    // 获取客户银行信息
    const clientBank = formData.value.clientInvoiceBankId
      ? applicationGroupsData.value
          .find((g: any) => g.id === items[0]?.invoiceApplicationId)
          ?.clientInvoiceInfo?.clientInvoiceBanks?.find(
            (b: any) => b.id === formData.value.clientInvoiceBankId,
          )
      : null;

    // 获取销售方银行信息
    const orgBank = formData.value.orgBankAccountId
      ? applicationGroupsData.value
          .find((g: any) => g.id === items[0]?.invoiceApplicationId)
          ?.orgBankAccounts?.find(
            (b: any) => b.id === formData.value.orgBankAccountId,
          )
      : null;

    const templateData = {
      commissionNum: Array.from(commissionNums).join('、'),
      mblNum: Array.from(mblNums).join('、'),
      invoiceExchangeRate: invoiceExchangeRate.value,
      foreignCurrencyAmount: totalForeignAmount.toFixed(2),
      rmbAmount: totalRmbAmount.toFixed(2),
      clientBankName: clientBank?.bankName || '',
      clientBankAccount: clientBank?.bankAccount || '',
      orgBankName: orgBank?.bankName || '',
      orgBankAccount: orgBank?.bankAccount || '',
    };

    return templateData;
  });

  return {
    remarkTemplateModalVisible,
    selectRemarkTemplateModalVisible,
    remarkTemplateData,
    handleOpenRemarkTemplateModal,
    handleOpenSelectRemarkTemplateModal,
    handleUseRemarkTemplate,
  };
}
