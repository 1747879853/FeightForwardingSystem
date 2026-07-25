import { message, Modal } from 'ant-design-vue';
import type { Ref } from 'vue';
import { useRouter } from 'vue-router';
import { InvoiceApplicationApi } from '#/api/Invoice/invoiceRequest';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
/**
 * 提交和保存相关逻辑
 */
export function useSubmit(
  formData: Ref<any>,
  goodsDetails: Ref<any[]>,
  isEdit: Ref<boolean>,
  editId: Ref<string | undefined>,
) {
  const router = useRouter();
  const { addAsync, editAsync, submitAsync } = InvoiceApplicationApi;

  const submitLoading = ref(false);

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
    return true;
  }

  /**
   * 同步商品明细数据到 formData
   */
  function syncGoodsDetailsToFormData() {
    // ✅ 关键修复：在保存前，将最新的 goodsDetails 同步到 formData
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
    console.log(
      '✅ 已同步商品明细数据到 formData:',
      formData.value.invoiceApplicationGoodsDtls.length,
      '条',
    );
  }

  /**
   * 构建批次数据
   */
  function buildBatchData() {
    // ✅ 先同步最新的商品明细
    syncGoodsDetailsToFormData();

    return {
      settlementId: formData.value.settlementId!,
      orgId: formData.value.orgId!,
      require: formData.value.require,
      remark: formData.value.remark,
      currencyGroups: [
        {
          currencyId: formData.value.currencyId || 1,
          invoiceType: formData.value.invoiceType,
          invoiceApplicationItems: formData.value.invoiceApplicationItems || [],
          invoiceApplicationGoodsDtls:
            formData.value.invoiceApplicationGoodsDtls || [],
          orgBankAccountId: formData.value.orgBankAccountId,
          clientInvoiceBankId: formData.value.clientInvoiceBankId,
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
        // ✅ 编辑模式下，先同步最新的商品明细
        syncGoodsDetailsToFormData();

        await editAsync(
          formData.value as InvoiceApplicationApi.InvoiceApplicationEditDto,
        );
        message.success('修改成功');
      } else {
        const batchData = buildBatchData();
        const ids = await addAsync(batchData);
        message.success('创建成功');

        if (ids && ids.length > 0) {
          router.push(`/fee-management/invoice-application/${ids[0]}/edit`);
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
    } finally {
      submitLoading.value = false;
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
        // ✅ 编辑模式下，先同步最新的商品明细
        syncGoodsDetailsToFormData();

        await editAsync(
          formData.value as InvoiceApplicationApi.InvoiceApplicationEditDto,
        );
        applicationId = editId.value;
      }

      if (applicationId) {
        await submitAsync({ id: applicationId });
        message.success('提交成功');
        router.push('/fee-management/invoice-application');
      }
    } catch (error) {
      console.error('提交失败:', error);
      message.error('提交失败');
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
          await submitAsync({ id: ids[0]! });
          message.success('创建并提交成功');
          router.push('/fee-management/invoice-application');
        }
      } else {
        // ✅ 编辑模式下，先同步最新的商品明细
        syncGoodsDetailsToFormData();

        await submitAsync({ id: editId.value! });
        message.success('提交成功');
        router.push('/fee-management/invoice-application');
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
  };
}
