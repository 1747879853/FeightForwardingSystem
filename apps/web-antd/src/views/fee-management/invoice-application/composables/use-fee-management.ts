import { message } from 'ant-design-vue';
import type { Ref } from 'vue';
import { getCurrencyDetail } from '#/api/system/base-data/currency-admin';
import { InvoiceApplicationAdminApi } from '#/api/settlement-management/invoice-application-admin';
import {
  buildExchangeRateRows,
  toApplicationCurrency,
  toInvoiceRmbAmount,
  type InvoiceApplicationExchangeRateRow,
} from '#/utils/invoice-application-amount';

import { collectFeeAppliedItems } from './use-computed';

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
  invoiceApplicationExchangeRates: Ref<InvoiceApplicationExchangeRateRow[]>,
) {
  /**
   * 根据当前费用明细重建汇率行（保留已填汇率）
   */
  function syncExchangeRateRows() {
    const appCurrencyId = formData.value.currencyId;
    if (!appCurrencyId) {
      invoiceApplicationExchangeRates.value = [];
      return;
    }

    const items = collectFeeAppliedItems(
      formData.value,
      feeGroupsData.value,
      flattenTreeData,
    );

    const currencyMeta = new Map<
      number,
      { code?: string; cnName?: string; enName?: string }
    >();
    const allFees = flattenTreeData(feeGroupsData.value);
    allFees.forEach((fee: any) => {
      const currency = fee.orderFee?.currency;
      const cid = fee.orderFee?.currencyId;
      if (cid && currency) {
        currencyMeta.set(Number(cid), {
          code: currency.code,
          cnName: currency.cnName,
          enName: currency.enName,
        });
      }
    });

    invoiceApplicationExchangeRates.value = buildExchangeRateRows({
      applicationCurrencyId: Number(appCurrencyId),
      items,
      existingRates: invoiceApplicationExchangeRates.value,
      currencyMeta,
    });
  }

  /**
   * 添加选中的费用到表单
   */
  function addSelectedFeesToForm(selectedFees: any[]) {
    const existingFeeIds = getAddedFeeIds();

    const newFees = selectedFees.filter((fee: any) => {
      const feeId = String(fee.orderFee.id);
      return !existingFeeIds.has(feeId);
    });

    if (newFees.length === 0) {
      message.warning('所选费用已全部添加，无新增费用');
      return;
    }

    const items = newFees.map((fee: any) => ({
      orderFeeId: fee.orderFee.id,
      appliedAmount: fee.appliedAmount ?? fee.orderFee.remainingInvoiceAmount,
      remark: '',
    }));

    if (!formData.value.invoiceApplicationItems) {
      formData.value.invoiceApplicationItems = [];
    }

    formData.value.invoiceApplicationItems.push(...items);
    syncExchangeRateRows();
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
    itemIds: string | string[],
    recalculateGoodsDetails: () => Promise<void>,
  ) {
    const idsToDelete = Array.isArray(itemIds) ? itemIds : [itemIds];

    if (idsToDelete.length === 0) {
      message.warning('没有要删除的费用');
      return;
    }

    if (!formData.value.id) {
      message.error('请先保存开票申请后再删除费用');
      return;
    }

    try {
      const removeData: InvoiceApplicationAdminApi.InvoiceApplicationRemoveItemsDto =
        {
          id: formData.value.id,
          invoiceApplicationItemIds: idsToDelete,
          invoiceApplicationGoodsDtls: undefined,
        };

      await InvoiceApplicationAdminApi.removeItems(removeData);
      await recalculateGoodsDetails();
      message.success(`成功删除 ${idsToDelete.length} 条费用，已重新计算金额`);
    } catch (error) {
      console.error('❌ 删除费用明细失败:', error);
    }
  }

  /**
   * 重新计算商品明细金额（折主币别后再 × 发票汇率）。
   * 商品为空且汇率已齐时自动生成默认一行（补汇率场景）。
   */
  async function recalculateGoodsDetails() {
    syncExchangeRateRows();

    const items = formData.value.invoiceApplicationItems || [];
    if (items.length === 0) {
      goodsDetails.value = [];
      return;
    }

    if (codeInvoiceList.value.length === 0) {
      try {
        const { getCodeInvoicePagedList } =
          await import('#/api/system/base-data/code-invoice-admin');
        const result = await getCodeInvoicePagedList({
          PageIndex: 1,
          PageSize: 1000,
        });
        codeInvoiceList.value = result.items || [];
      } catch (error) {
        console.error('加载发票商品编码失败:', error);
        return;
      }
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
      (item) =>
        !!item.isDefault &&
        (item.currency?.code === currencyCode ||
          item.defaultCurrency === currencyCode),
    );

    if (!defaultCodeInvoice) {
      if (goodsDetails.value.length === 0) {
        message.warning(
          `未找到币别 ${currencyCode} 对应的默认商品编码，请手动添加商品明细`,
        );
      }
      return;
    }

    const feeItems = collectFeeAppliedItems(
      formData.value,
      feeGroupsData.value,
      flattenTreeData,
    );
    const totalApp = toApplicationCurrency(
      feeItems,
      Number(invoiceCurrencyId),
      invoiceApplicationExchangeRates.value,
    );
    const totalRmbAmount = toInvoiceRmbAmount(
      totalApp,
      invoiceExchangeRate.value || 1,
    );

    if (totalRmbAmount == null) {
      return;
    }

    const taxRate = defaultCodeInvoice.taxRate || 0;

    if (goodsDetails.value.length === 0) {
      goodsDetails.value = [
        {
          id: Date.now().toString() + Math.random().toString(36).slice(2, 11),
          codeInvoiceId: defaultCodeInvoice.id,
          specification: defaultCodeInvoice.specification || '',
          unit: defaultCodeInvoice.unit || '票',
          quantity: 1,
          unitPrice: totalRmbAmount,
          amount: totalRmbAmount,
          noTaxAmount: totalRmbAmount / (1 + taxRate / 100),
          taxRate,
          taxAmount: (totalRmbAmount / (1 + taxRate / 100)) * (taxRate / 100),
          remark: '',
        },
      ];
      return;
    }

    if (goodsDetails.value.length === 1) {
      const existingItem = goodsDetails.value[0];

      if (existingItem.codeInvoiceId === defaultCodeInvoice.id) {
        const rowTaxRate = existingItem.taxRate || taxRate;

        existingItem.amount = totalRmbAmount;
        existingItem.unitPrice = totalRmbAmount;
        existingItem.noTaxAmount = totalRmbAmount / (1 + rowTaxRate / 100);
        existingItem.taxAmount =
          (totalRmbAmount / (1 + rowTaxRate / 100)) * (rowTaxRate / 100);
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
    syncExchangeRateRows,
  };
}
