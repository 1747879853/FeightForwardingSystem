import { message } from 'ant-design-vue';
import type { Ref } from 'vue';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { InvoiceApplicationAdminApi } from '#/api/settlement-management/invoice-application-admin';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
/**
 * 费用管理相关逻辑
 */
export function useFeeManagement(
  formData: Ref<any>,
  feeGroupsData: Ref<any[]>,
  goodsDetails: Ref<any[]>,
  invoiceExchangeRate: Ref<number>,
  codeInvoiceList: Ref<any[]>,
  flattenTreeData: (data: any[]) => any[],
) {
  /**
   * 添加选中的费用到表单
   */
  function addSelectedFeesToForm(selectedFees: any[]) {
    const existingFeeIds = getAddedFeeIds();

    // 过滤掉已存在的费用
    const newFees = selectedFees.filter((fee: any) => {
      const feeId = String(fee.orderFee.id);
      return !existingFeeIds.has(feeId);
    });

    if (newFees.length === 0) {
      message.warning('所选费用已全部添加，无新增费用');
      return;
    }

    // 转换为 InvoiceApplicationItemAddDto
    const items = newFees.map((fee: any) => ({
      orderFeeId: fee.orderFee.id,
      appliedAmount: fee.appliedAmount || fee.orderFee.remainingInvoiceAmount,
      remark: '',
    }));

    if (!formData.value.invoiceApplicationItems) {
      formData.value.invoiceApplicationItems = [];
    }

    formData.value.invoiceApplicationItems.push(...items);
    message.success(`成功添加 ${items.length} 条新费用`);
  }

  /**
   * 获取已添加的费用ID集合
   */
  function getAddedFeeIds(): Set<string> {
    const items = formData.value.invoiceApplicationItems || [];
    return new Set(items.map((item: any) => String(item.orderFeeId)));
  }

  /**
   * 删除费用（支持批量删除）
   */
  async function handleDeleteFee(
    itemIds: string | string[], // ✅ 修改参数名：直接接收 invoiceApplicationItemId
    recalculateGoodsDetails: () => Promise<void>,
  ) {
    const idsToDelete = Array.isArray(itemIds) ? itemIds : [itemIds];

    if (idsToDelete.length === 0) {
      message.warning('没有要删除的费用');
      return;
    }

    // ✅ 检查是否有开票ID，只有在编辑状态下才能删除
    if (!formData.value.id) {
      message.error('请先保存开票申请后再删除费用');
      return;
    }

    const items = formData.value.invoiceApplicationItems || [];

    // ✅ 直接通过 itemId 找到对应的 item

    try {
      // ✅ 调用removeItems接口删除费用明细
      const removeData: InvoiceApplicationAdminApi.InvoiceApplicationRemoveItemsDto =
        {
          id: formData.value.id,
          invoiceApplicationItemIds: idsToDelete, // ✅ 直接使用传入的 itemIds
          // 不传商品明细，表示不改商品
          invoiceApplicationGoodsDtls: undefined,
        };

      await InvoiceApplicationAdminApi.removeItems(removeData);
      console.log('✅ 费用明细删除成功');

      // 过滤掉这些费用（前端显示）

      // 重新计算商品明细金额
      await recalculateGoodsDetails();

      message.success(`成功删除 ${idsToDelete.length} 条费用，已重新计算金额`);
    } catch (error) {
      console.error('❌ 删除费用明细失败:', error);
      //message.error('删除费用明细失败');
    }
  }

  /**
   * 重新计算商品明细金额
   */
  async function recalculateGoodsDetails() {
    const items = formData.value.invoiceApplicationItems || [];
    if (items.length === 0) {
      goodsDetails.value = [];
      return;
    }

    if (codeInvoiceList.value.length === 0) {
      return;
    }

    const invoiceCurrencyId = formData.value.currencyId;
    if (!invoiceCurrencyId) {
      return;
    }

    let currencyCode = '';
    try {
      const currencyDetail = await getCurrencyDetail(invoiceCurrencyId);
      currencyCode = currencyDetail.code || '';
    } catch (error) {
      console.error('获取币别详情失败:', error);
      return;
    }

    if (!currencyCode) {
      return;
    }

    const defaultCodeInvoice = codeInvoiceList.value.find(
      (item) => item.isDefault && item.currencyId === currencyCode,
    );

    if (!defaultCodeInvoice) {
      return;
    }

    // 计算所有费用的总金额（转换为人民币）
    let totalRmbAmount = 0;
    const allFees = flattenTreeData(feeGroupsData.value);

    items.forEach((item: any) => {
      const fee = allFees.find((f: any) => f.orderFee?.id === item.orderFeeId);
      if (fee) {
        const appliedAmount = item.appliedAmount || 0;
        const feeCurrencyId = fee.orderFee.currencyId;

        if (feeCurrencyId !== 1) {
          totalRmbAmount += appliedAmount * (invoiceExchangeRate.value || 1);
        } else {
          totalRmbAmount += appliedAmount;
        }
      }
    });

    // 如果只有一行商品明细，更新该行金额
    if (goodsDetails.value.length === 1) {
      const existingItem = goodsDetails.value[0];

      if (existingItem.codeInvoiceId === defaultCodeInvoice.id) {
        const taxRate = existingItem.taxRate || defaultCodeInvoice.taxRate || 0;

        existingItem.amount = totalRmbAmount;
        existingItem.unitPrice = totalRmbAmount;
        existingItem.noTaxAmount = totalRmbAmount / (1 + taxRate / 100);
        existingItem.taxAmount =
          (totalRmbAmount / (1 + taxRate / 100)) * (taxRate / 100);
      } else {
        message.warning('商品明细与当前币别不匹配，请手动调整或重新填充');
      }
    } else if (goodsDetails.value.length > 1) {
      message.warning('当前存在多行商品明细，删除费用后请手动调整各行的金额');
    }
  }

  return {
    addSelectedFeesToForm,
    handleDeleteFee,
    recalculateGoodsDetails,
    getAddedFeeIds,
  };
}
