import { message } from 'ant-design-vue';
import type { Ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTabs } from '@vben/hooks';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { ref } from 'vue';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';
import {
  getMissingExchangeRateCurrencyIds,
  toExchangeRateInputs,
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
) {
  const router = useRouter();
  const route = useRoute();
  const { closeTabByKey } = useTabs();
  const { addAsync, editAsync, submitAsync } = InvoiceApplicationApi;

  const submitLoading = ref(false);

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

  /**
   * 校验非主币别汇率
   */
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

  /**
   * 验证表单
   */
  function validateForm(): boolean {
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
    return true;
  }

  /**
   * 同步商品明细数据到 formData
   */
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

  /**
   * 构建批次数据
   */
  function buildBatchData() {
    syncGoodsDetailsToFormData();
    const rates = getExchangeRatePayload();

    return {
      settlementId: formData.value.settlementId!,
      orgId: formData.value.orgId!,
      require: formData.value.require,
      currencyGroups: [
        {
          currencyId: formData.value.currencyId || 1,
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

  /**
   * 保存表单
   */
  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    submitLoading.value = true;
    try {
      if (isEdit.value) {
        syncGoodsDetailsToFormData();
        const rates = getExchangeRatePayload();

        await editAsync({
          ...(formData.value as InvoiceApplicationApi.InvoiceApplicationEditDto),
          invoiceApplicationExchangeRates: rates,
        });
        message.success('修改成功');
      } else {
        const batchData = buildBatchData();
        const ids = await addAsync(batchData);
        message.success('创建成功');

        if (ids && ids.length > 0) {
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

  /**
   * 提交成功后关闭当前编辑/新建页签，打开该开票申请的只读查看页。
   * 失败时不调用本函数，留在当前页。
   */
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

  /**
   * 直接提交（先保存再提交）
   */
  async function handleDirectSubmit() {
    if (!validateForm()) {
      return;
    }

    const items = formData.value.invoiceApplicationItems || [];
    if (items.length === 0) {
      message.warning('请先添加费用明细后再提交');
      return;
    }

    submitLoading.value = true;
    try {
      let applicationId: string | undefined;

      if (!isEdit.value) {
        const batchData = buildBatchData();
        const ids = await addAsync(batchData);

        if (ids && ids.length > 0) {
          applicationId = ids[0];
        }
      } else {
        syncGoodsDetailsToFormData();
        const rates = getExchangeRatePayload();

        await editAsync({
          ...(formData.value as InvoiceApplicationApi.InvoiceApplicationEditDto),
          invoiceApplicationExchangeRates: rates,
        });
        applicationId = editId.value;
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

  /**
   * 提交审核
   */
  async function handleSubmitForAudit() {
    if (!validateForm()) {
      return;
    }

    const items = formData.value.invoiceApplicationItems || [];
    if (items.length === 0) {
      message.warning('请先添加费用明细后再提交');
      return;
    }

    submitLoading.value = true;
    try {
      if (!isEdit.value) {
        const batchData = buildBatchData();
        const ids = await addAsync(batchData);

        if (ids && ids.length > 0) {
          const applicationId = ids[0]!;
          await submitAsync({ id: applicationId });
          message.success('创建并提交成功');
          await navigateToViewAfterSubmit(applicationId);
        }
      } else {
        syncGoodsDetailsToFormData();

        const applicationId = editId.value!;
        await submitAsync({ id: applicationId });
        message.success('提交成功');
        await navigateToViewAfterSubmit(applicationId);
      }
    } catch (error) {
      console.error('提交失败:', error);
      message.error('提交失败');
    } finally {
      submitLoading.value = false;
    }
  }

  /**
   * 取消
   */
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
