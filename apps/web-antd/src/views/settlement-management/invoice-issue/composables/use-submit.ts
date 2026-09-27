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
) {
  const router = useRouter();
  const route = useRoute();
  const { closeTabByKey } = useTabs();
  const submitLoading = ref(false);

  /**
   * 提交表单
   */
  async function handleSubmit() {
    // 基本验证
    if (formData.value.invoiceIssueItems.length === 0) {
      message.warning('请选择开票申请');
      return;
    }

    submitLoading.value = true;
    try {
      const submitData: InvoiceIssueApi.InvoiceIssueAddDto = {
        orgId: formData.value.orgId,
        invoiceNo: formData.value.invoiceNo,
        invoiceIssueTime: invoiceIssueTime.value,
        invoiceExchangeRate: invoiceExchangeRate.value,
        require: formData.value.require,
        remark: formData.value.remark,
        invoiceIssueItems: formData.value.invoiceIssueItems || [],
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
      };

      if (isEdit.value) {
        const editData: InvoiceIssueApi.InvoiceIssueEditDto = {
          id: editId.value!,
          orgId: formData.value.orgId,
          invoiceNo: formData.value.invoiceNo,
          invoiceIssueTime: invoiceIssueTime.value,
          invoiceExchangeRate: invoiceExchangeRate.value,
          require: formData.value.require,
          remark: formData.value.remark,
          invoiceIssueItems: formData.value.invoiceIssueItems || [],
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
      // 业务错误由 requestClient 拦截器提示，勿吞掉
      console.error('保存失败:', error);
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
    handleCancel,
  };
}
