import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import {
  addInvoiceIssue,
  editInvoiceIssue,
  InvoiceIssueApi,
} from '#/api/Invoice/InvoiceIssue';

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
  fakeDeletedIds?: any,
) {
  const router = useRouter();
  const submitLoading = ref(false);

  /**
   * 提交表单
   */
  async function handleSubmit() {
    // 基本验证
    if (!formData.value.settlementId) {
      message.warning('请选择结算对象');
      return;
    }
    if (!formData.value.orgId) {
      message.warning('请选择归属组织');
      return;
    }

    submitLoading.value = true;
    try {
      // ✅ 过滤掉假删除的发票项
      let filteredInvoiceItems = formData.value.invoiceIssueItems || [];

      if (
        fakeDeletedIds &&
        fakeDeletedIds.value &&
        fakeDeletedIds.value.length > 0
      ) {
        const deletedIdsSet = new Set(fakeDeletedIds.value);
        filteredInvoiceItems = filteredInvoiceItems.filter(
          (item: any) => !deletedIdsSet.has(String(item.invoiceApplicationId)),
        );
        console.log('✅ 过滤假删除数据:', {
          原始数量: formData.value.invoiceIssueItems?.length || 0,
          假删除数量: fakeDeletedIds.value.length,
          过滤后数量: filteredInvoiceItems.length,
        });
      }

      const submitData: InvoiceIssueApi.InvoiceIssueAddDto = {
        orgId: formData.value.orgId,
        invoiceIssueType: formData.value.invoiceIssueType,
        invoiceNo: formData.value.invoiceNo,
        invoiceIssueTime: invoiceIssueTime.value,
        invoiceExchangeRate: invoiceExchangeRate.value,
        require: formData.value.require,
        remark: formData.value.remark,
        invoiceIssueItems: filteredInvoiceItems, // ✅ 使用过滤后的数据
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
        await editInvoiceIssue({
          ...submitData,
          id: editId.value!,
        } as InvoiceIssueApi.InvoiceIssueEditDto);
        message.success('修改成功');
      } else {
        const newId = await addInvoiceIssue(submitData);
        message.success('创建成功');

        // 创建成功后跳转到编辑页面
        if (newId) {
          router.push(`/settlement-management/invoice-issue/${newId}/edit`);
        }
      }

      console.log('✅ 保存成功，保持在当前页面');
    } catch (error) {
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
