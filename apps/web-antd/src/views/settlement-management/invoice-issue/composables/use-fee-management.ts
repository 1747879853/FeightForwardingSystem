import { message } from 'ant-design-vue';
import { removeApplicationsFromInvoiceIssue } from '#/api/Invoice/InvoiceIssue';

/**
 * 费用管理逻辑
 */
export function useFeeManagement(
  formData: any,
  applicationGroupsData: any,
  goodsDetails: any,
  invoiceExchangeRate: any,
  codeInvoiceList: any,
  flattenTreeData: (data: any[]) => any[],
  editId: any,
) {
  /**
   * 将选中的申请添加到表单
   */
  function addSelectedApplicationsToForm(selectedApps: any[]) {
    const existingAppIds = getAddedAppIds();

    // 过滤掉已存在的申请，只添加新的申请
    const newApps = selectedApps.filter((app: any) => {
      return !existingAppIds.has(app.id);
    });

    if (newApps.length === 0) {
      console.log('⚠️ 所有选择的申请都已存在，无需重复添加');
      message.warning('所选申请已全部添加，无新增申请');
      return;
    }

    // 将选中的申请转换为 InvoiceIssueItemInputDto
    const items = newApps.map((app: any) => ({
      invoiceApplicationId: app.id,
      remark: app.remark || '',
    }));

    // 添加到 formData
    if (!formData.value.invoiceIssueItems) {
      formData.value.invoiceIssueItems = [];
    }

    formData.value.invoiceIssueItems.push(...items);

    console.log(
      `✅ 添加了 ${items.length} 条新申请明细（已过滤 ${selectedApps.length - newApps.length} 条重复申请）`,
    );
    message.success(`成功添加 ${items.length} 条新申请`);
  }

  /**
   * 获取已添加的申请ID列表
   */
  function getAddedAppIds(): Set<string> {
    const items = formData.value.invoiceIssueItems || [];
    return new Set(items.map((item: any) => String(item.invoiceApplicationId)));
  }

  /**
   * 处理删除选中的发票
   */
  async function handleDeleteSelectedInvoices(selectedIds: string[]) {
    console.log('🗑️ 准备删除的发票ID:', selectedIds);

    if (!editId.value) {
      message.error('发票ID不存在');
      return;
    }

    try {
      // 调用删除接口
      await removeApplicationsFromInvoiceIssue({
        id: editId.value,
        invoiceApplicationIds: selectedIds,
        invoiceIssueGoodsDtls: goodsDetails.value.map((item: any) => ({
          codeInvoiceId: item.codeInvoiceId,
          specification: item.specification,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.amount,
          noTaxAmount: item.noTaxAmount,
          taxRate: item.taxRate,
          taxAmount: item.taxAmount,
          remark: item.remark,
        })),
      });

      message.success(`成功删除 ${selectedIds.length} 条发票`);

      // 从 applicationGroupsData 中移除选中的申请组
      applicationGroupsData.value = applicationGroupsData.value.filter(
        (group: any) => !selectedIds.includes(String(group.id)),
      );

      // 从 formData.invoiceIssueItems 中移除对应的项
      if (
        formData.value.invoiceIssueItems &&
        formData.value.invoiceIssueItems.length > 0
      ) {
        formData.value.invoiceIssueItems =
          formData.value.invoiceIssueItems.filter(
            (item: any) =>
              !selectedIds.includes(String(item.invoiceApplicationId)),
          );
      }

      console.log(
        '✅ 删除完成，剩余申请组数量:',
        applicationGroupsData.value.length,
      );
    } catch (error) {
      console.error('❌ 删除发票失败:', error);
      message.error('删除发票失败');
      throw error;
    }
  }

  /**
   * 重新计算商品明细金额（委托给 use-goods-details）
   */
  async function recalculateGoodsDetails() {
    // 这个方法会在主页面中通过 useGoodsDetails 调用
    // 这里保留作为接口，实际逻辑在 use-goods-details.ts 中
    console.log('⚠️ recalculateGoodsDetails 应该在 use-goods-details 中实现');
  }

  return {
    addSelectedApplicationsToForm,
    getAddedAppIds,
    handleDeleteSelectedInvoices,
    recalculateGoodsDetails,
  };
}
