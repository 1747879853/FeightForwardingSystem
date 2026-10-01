import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTabs } from '@vben/hooks';
import { message } from 'ant-design-vue';
import {
  addInvoiceIssue,
  editInvoiceIssue,
  InvoiceIssueApi,
} from '#/api/Invoice/InvoiceIssue';
import { handleExchangeRateCheck } from './use-exchange-rate-check';

/**
 * 提交逻辑
 */
export function useSubmit(
  formData: any,
  goodsDetails: any,
  invoiceExchangeRate: any,
  invoiceIssueTime: any,
  editId: any,
  isEdit: any,
  options?: {
    hasAmountDifference?: { value: boolean };
    hasMissingApplicationRate?: { value: boolean };
  },
) {
  const router = useRouter();
  const route = useRoute();
  const { closeTabByKey } = useTabs();
  const submitLoading = ref(false);

  function mapGoodsDtls() {
    return goodsDetails.value.map((item: any) => ({
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
    }));
  }

  function validateBeforeSubmit(): boolean {
    if (formData.value.editLocked) {
      message.warning('该发票开出已锁定，只能查询，不能保存');
      return false;
    }
    if (!formData.value.orgId) {
      message.warning('请选择归属组织');
      return false;
    }
    const items = formData.value.invoiceIssueItems || [];
    if (items.length === 0) {
      message.warning('请选择开票申请');
      return false;
    }
    if (!goodsDetails.value.length) {
      message.warning('请添加商品明细');
      return false;
    }
    if (goodsDetails.value.some((g: any) => !g.codeInvoiceId)) {
      message.warning('商品明细存在未选择商品编码的行');
      return false;
    }
    if (options?.hasMissingApplicationRate?.value) {
      message.warning('存在开票申请缺汇率，请先补齐后再保存');
      return false;
    }
    if (options?.hasAmountDifference?.value) {
      message.warning(
        '商品明细金额合计与开票申请折算金额不一致，请调整后再保存',
      );
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validateBeforeSubmit()) {
      return;
    }

    submitLoading.value = true;
    try {
      const goodsDtls = mapGoodsDtls();
      const submitData: InvoiceIssueApi.InvoiceIssueAddDto = {
        orgId: formData.value.orgId,
        invoiceNo: formData.value.invoiceNo,
        invoiceIssueTime: invoiceIssueTime.value,
        invoiceExchangeRate: invoiceExchangeRate.value,
        require: formData.value.require,
        remark: formData.value.remark,
        invoiceIssueItems: formData.value.invoiceIssueItems || [],
        invoiceIssueGoodsDtls: goodsDtls,
      };

      if (isEdit.value) {
        const editData: InvoiceIssueApi.InvoiceIssueEditDto = {
          id: editId.value!,
          ...submitData,
        };

        await editInvoiceIssue(editData);
        message.success('保存成功');
      } else {
        const result = await addInvoiceIssue(submitData);
        const ok = await handleExchangeRateCheck(result);

        if (ok && result.id) {
          message.success('创建成功');
          const createTabKey = route.fullPath;
          await router.replace(
            `/settlement-management/invoice-issue/${result.id}/edit`,
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

  function handleCancel() {
    router.back();
  }

  return {
    submitLoading,
    handleSubmit,
    handleCancel,
  };
}
