import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTabs } from '@vben/hooks';
import { message, Modal } from 'ant-design-vue';
import {
  addInvoiceIssue,
  editInvoiceIssue,
  InvoiceIssueApi,
  addApplicationsToInvoiceIssue,
  syncApplicationGoodsDtlByExchangeRate,
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
) {
  const router = useRouter();
  const route = useRoute();
  const { closeTabByKey } = useTabs();
  const submitLoading = ref(false);

  /**
   * 提交表单
   */
  /**
   * ✅ 处理汇率校验结果（code != 0 的情况）
   */
  async function handleExchangeRateCheck(
    result: InvoiceIssueApi.InvoiceIssueExchangeRateCheckDto,
    isAddMode: boolean, // true=新增模式, false=加挂模式
  ): Promise<boolean> {
    // code=0 表示成功，直接返回 true
    if (result.code === 0) {
      return true;
    }

    // code=2 表示存在多明细申请，无法自动修正
    if (result.code === 2) {
      const multiApps = result.multiGoodsDtlApplicationIds;
      Modal.error({
        title: '无法自动更新商品明细',
        content: `以下开票申请的发票汇率已变动，且商品明细不止一条，无法自动更新，请先驳回后重新调整商品明细：\n\n${multiApps
          .map((id) => `• ${id}`)
          .join('\n')}`,
        width: 600,
      });
      return false;
    }

    // code=1 表示可以调用修正接口
    if (result.code === 1) {
      const singleApps = result.singleGoodsDtlApplicationIds;

      return new Promise((resolve) => {
        Modal.confirm({
          title: '发票汇率已变动',
          content: `所选开票申请的发票汇率已变动，确认按当前汇率更新其商品明细金额吗？\n\n受影响的申请数量：${singleApps.length} 个`,
          okText: '确认更新',
          cancelText: '取消',
          onOk: async () => {
            try {
              // 调用修正接口
              const syncResult = await syncApplicationGoodsDtlByExchangeRate({
                invoiceApplicationIds: singleApps,
              });

              message.success(
                `已成功修正 ${syncResult.updatedApplicationIds.length} 个申请的商品明细金额`,
              );

              // 修正成功后，返回 false 让调用方重新拉取数据并重新提交
              resolve(false);
            } catch (error) {
              console.error('❌ 修正商品明细失败:', error);
              message.error('修正商品明细失败，请重试');
              resolve(false);
            }
          },
          onCancel: () => {
            resolve(false);
          },
        });
      });
    }

    return false;
  }

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
        invoiceIssueType: formData.value.invoiceIssueType,
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
        // ✅ 编辑模式：调用 editInvoiceIssue 方法进行数据的编辑保存
        const editData: InvoiceIssueApi.InvoiceIssueEditDto = {
          id: editId.value!,
          orgId: formData.value.orgId,
          invoiceIssueType: formData.value.invoiceIssueType,
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
        router.back();
      } else {
        // ✅ 新增模式：调用 AddAsync
        const result = await addInvoiceIssue(submitData);
        console.log('✅ 创建成功，ID:', result);
        // ✅ 处理汇率校验结果
        // const shouldContinue = await handleExchangeRateCheck(result, true);

        if (result.code === 0) {
          message.success('创建成功');

          // 创建成功后跳转到编辑页面（replace 复用当前页签，再关闭残留的新建页签）
          if (result.id) {
            const createTabKey = route.fullPath;
            await router.replace(
              `/settlement-management/invoice-issue/${result.id}/edit`,
            );
            await closeTabByKey(createTabKey);
          }
        }
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败，请重试');
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
