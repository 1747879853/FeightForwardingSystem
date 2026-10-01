import { message } from 'ant-design-vue';
import type { Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTabs } from '@vben/hooks';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { ref } from 'vue';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
import {
  getMissingExchangeRateCurrencyIds,
  toApplicationCurrency,
  toExchangeRateInputs,
  toInvoiceRmbAmount,
  type InvoiceApplicationExchangeRateRow,
} from '#/utils/invoice-application-amount';

import { collectFeeAppliedItems } from './use-computed';

/**
 * 提交和保存相关逻辑
 */
export function useSubmit(
  formData: Ref<any>,
  goodsDetails: Ref<any[]>,
  isEdit: Ref<boolean>,
  editId: Ref<string | undefined>,
  invoiceApplicationExchangeRates: Ref<InvoiceApplicationExchangeRateRow[]>,
  feeGroupsData: Ref<any[]>,
  flattenTreeData: (data: any[]) => any[],
  invoiceExchangeRate: Ref<number>,
) {
  const router = useRouter();
  const route = useRoute();
  const { closeTabByKey } = useTabs();
  const { addAsync, editAsync, submitAsync } = InvoiceApplicationApi;

  const submitLoading = ref(false);

  /** 已落库 id：优先 formData.id（选费创建后可能尚未跳转编辑路由） */
  function getPersistedId(): string | undefined {
    const fromForm = formData.value.id;
    if (fromForm != null && String(fromForm) !== '') {
      return String(fromForm);
    }
    if (editId.value) return String(editId.value);
    return undefined;
  }

  function isPersisted(): boolean {
    return !!getPersistedId() || isEdit.value;
  }

  function buildMissingRateMessage(missingIds: number[]): string {
    return missingIds
      .map((id) => {
        const row = invoiceApplicationExchangeRates.value.find(
          (r) => r.currencyId === id,
        );
        const label = row?.currencyCode || row?.currencyName || String(id);
        return `币别[${label}]与开票申请币别不同,汇率必填且必须大于0`;
      })
      .join('；');
  }

  function validateExchangeRates(): boolean {
    const appCurrencyId = formData.value.currencyId;
    if (!appCurrencyId) {
      message.warning('请选择开票申请币别');
      return false;
    }
    const feeItems = collectFeeAppliedItems(
      formData.value,
      feeGroupsData.value,
      flattenTreeData,
    );
    if (feeItems.length === 0) return true;

    const missing = getMissingExchangeRateCurrencyIds(
      Number(appCurrencyId),
      feeItems,
      invoiceApplicationExchangeRates.value,
    );
    if (missing.length > 0) {
      message.warning(buildMissingRateMessage(missing));
      return false;
    }
    return true;
  }

  function validateGoodsAndAmount(requireFees: boolean): boolean {
    const items = formData.value.invoiceApplicationItems || [];
    if (requireFees && items.length === 0) {
      message.warning('请先添加费用明细');
      return false;
    }

    if (items.length > 0) {
      if (goodsDetails.value.length === 0) {
        message.warning('请添加商品明细');
        return false;
      }
      if (goodsDetails.value.some((g) => !g.codeInvoiceId)) {
        message.warning('商品明细存在未选择商品编码的行');
        return false;
      }
      if (!formData.value.orgBankAccountId) {
        message.warning('请选择销售方银行');
        return false;
      }
      if (!formData.value.clientInvoiceBankId) {
        message.warning('请选择购买方银行');
        return false;
      }

      const feeItems = collectFeeAppliedItems(
        formData.value,
        feeGroupsData.value,
        flattenTreeData,
      );
      const totalApp = toApplicationCurrency(
        feeItems,
        Number(formData.value.currencyId),
        invoiceApplicationExchangeRates.value,
      );
      const expectedRmb = toInvoiceRmbAmount(
        totalApp,
        invoiceExchangeRate.value || 1,
      );
      if (expectedRmb == null) {
        message.warning('请先补齐费用币别汇率');
        return false;
      }
      const goodsTotal = goodsDetails.value.reduce(
        (sum, item) => sum + (Number(item.amount) || 0),
        0,
      );
      if (Math.abs(goodsTotal - expectedRmb) > 0.01) {
        message.warning(
          `商品明细金额合计(${goodsTotal.toFixed(2)})与费用折算人民币(${expectedRmb.toFixed(2)})不一致，请调整后再保存`,
        );
        return false;
      }
    }

    return true;
  }

  /**
   * @param options.requireFees 提交审核时强制要求费用；普通保存允许空费用草稿
   */
  function validateForm(options?: { requireFees?: boolean }): boolean {
    if (!formData.value.settlementId) {
      message.warning('请选择结算对象');
      return false;
    }
    if (!formData.value.orgId) {
      message.warning('请选择归属组织');
      return false;
    }
    if (!formData.value.currencyId) {
      message.warning('请选择开票申请币别');
      return false;
    }
    if (!validateExchangeRates()) {
      return false;
    }
    if (!validateGoodsAndAmount(!!options?.requireFees)) {
      return false;
    }
    return true;
  }

  function syncGoodsDetailsToFormData() {
    formData.value.invoiceApplicationGoodsDtls = goodsDetails.value.map(
      (item) => ({
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
      }),
    );
  }

  function getExchangeRatePayload() {
    return toExchangeRateInputs(
      Number(formData.value.currencyId),
      invoiceApplicationExchangeRates.value,
      { includeMain: true },
    );
  }

  function buildBatchData() {
    syncGoodsDetailsToFormData();
    const rates = getExchangeRatePayload();

    return {
      settlementId: formData.value.settlementId!,
      orgId: formData.value.orgId!,
      require: formData.value.require,
      currencyGroups: [
        {
          currencyId: formData.value.currencyId,
          invoiceType: formData.value.invoiceType,
          invoiceApplicationItems: formData.value.invoiceApplicationItems || [],
          invoiceApplicationGoodsDtls:
            formData.value.invoiceApplicationGoodsDtls || [],
          invoiceApplicationExchangeRates: rates,
          orgBankAccountId: formData.value.orgBankAccountId,
          clientInvoiceBankId: formData.value.clientInvoiceBankId,
          remark: formData.value.remark,
        },
      ],
    };
  }

  async function persistEdit(applicationId: string) {
    syncGoodsDetailsToFormData();
    const rates = getExchangeRatePayload();
    await editAsync({
      ...(formData.value as InvoiceApplicationApi.InvoiceApplicationEditDto),
      id: applicationId,
      invoiceApplicationExchangeRates: rates,
    });
  }

  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    submitLoading.value = true;
    try {
      const persistedId = getPersistedId();
      if (isPersisted() && persistedId) {
        await persistEdit(persistedId);
        message.success('修改成功');
      } else {
        const batchData = buildBatchData();
        const ids = await addAsync(batchData);
        message.success('创建成功');

        if (ids && ids.length > 0) {
          formData.value.id = ids[0];
          const createTabKey = route.fullPath;
          await router.replace(
            `/fee-management/invoice-application/${ids[0]}/edit`,
          );
          await closeTabByKey(createTabKey);
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      submitLoading.value = false;
    }
  }

  async function navigateToViewAfterSubmit(applicationId: string) {
    markListShouldRefresh('InvoiceApplicationList');
    const currentTabKey = route.fullPath;
    await router.replace(
      `/fee-management/invoice-application/${applicationId}/view`,
    );
    if (currentTabKey !== route.fullPath) {
      await closeTabByKey(currentTabKey);
    }
  }

  /** 先保存再提交（编辑与选费已落库但路由仍为 /add 均走 edit） */
  async function handleDirectSubmit() {
    if (!validateForm({ requireFees: true })) {
      return;
    }

    submitLoading.value = true;
    try {
      let applicationId = getPersistedId();

      if (!applicationId) {
        const batchData = buildBatchData();
        const ids = await addAsync(batchData);
        if (ids && ids.length > 0) {
          applicationId = ids[0];
          formData.value.id = applicationId;
        }
      } else {
        await persistEdit(applicationId);
      }

      if (applicationId) {
        await submitAsync({ id: applicationId });
        message.success('提交成功');
        await navigateToViewAfterSubmit(applicationId);
      }
    } catch (error) {
      console.error('提交失败:', error);
    } finally {
      submitLoading.value = false;
    }
  }

  /** 与 handleDirectSubmit 同路径，避免只提交不落库 */
  async function handleSubmitForAudit() {
    return handleDirectSubmit();
  }

  function handleCancel() {
    router.back();
  }

  return {
    submitLoading,
    handleSubmit,
    handleDirectSubmit,
    handleSubmitForAudit,
    handleCancel,
    validateExchangeRates,
  };
}
