import dayjs from 'dayjs';
import { useRouter } from 'vue-router';
import { useTabs } from '@vben/hooks';
import { message, Modal } from 'ant-design-vue';

import {
  addItemsToSettlementByCurrency,
  addPaymentSettlementByCurrency,
  deleteItemsFromSettlementByCurrency,
  editPaymentSettlement,
} from '#/api/sea-export/payment-settlement-admin';
import { getMyDefaultOrgId } from '#/composables/use-my-org';
import { markListShouldRefresh } from '#/utils/list-refresh-flag';

import {
  mapApplicationsToCurrencyItems,
  type SelectedApplicationForSettlement,
} from '../form-data';
import type { PaymentSettlementFormState } from './use-form-state';

/**
 * 保存 / 新建 / 加明细 / 批量删除
 * 接口失败由 request 拦截器统一提示，此处 catch 只做收尾，不再 message.error。
 */
export function useSubmit(
  state: PaymentSettlementFormState,
  loadEditData: () => Promise<void>,
) {
  const router = useRouter();
  const { closeTabByKey } = useTabs();

  const {
    route,
    editId,
    isEdit,
    submitting,
    settlementId,
    currencyId,
    settlementTime,
    payType,
    orgBankAccountId,
    clientInvoiceBankId,
    transactionFee,
    transactionFeeCurrencyId,
    remark,
    attachments,
    applicationItems,
    selectedRowKeys,
  } = state;

  function validateForm(): boolean {
    if (!settlementId.value) {
      message.warning('请选择结算对象');
      return false;
    }
    if (!currencyId.value) {
      message.warning('请选择结算币别');
      return false;
    }
    if (applicationItems.value.length === 0) {
      message.warning('请至少添加一个付费申请');
      return false;
    }
    return true;
  }

  async function handleAddAndSaveToSettlement(
    applications: SelectedApplicationForSettlement[],
    selectedCurrencyId?: number,
  ) {
    if (!selectedCurrencyId) {
      message.warning('请选择结算币别');
      return;
    }

    if (!editId.value) {
      message.warning('结算单ID不存在');
      return;
    }

    const paymentApplicationCurrencyItems =
      mapApplicationsToCurrencyItems(applications);

    if (paymentApplicationCurrencyItems.length === 0) {
      message.warning(
        '所有申请的结算金额都为0或未填写，请至少填写一个非零的结算金额',
      );
      return;
    }

    submitting.value = true;
    try {
      await addItemsToSettlementByCurrency({
        id: editId.value,
        paymentApplicationCurrencyItems,
      });

      message.success(
        `已添加并保存 ${paymentApplicationCurrencyItems.length} 个「申请+原币」组合`,
      );
      markListShouldRefresh('PaymentSettlementList');
      await loadEditData();
    } catch {
      // request 拦截器已提示
    } finally {
      submitting.value = false;
    }
  }

  async function handleCreateSettlementAndRedirect(
    applications: SelectedApplicationForSettlement[],
    selectedCurrencyId?: number,
  ) {
    if (!selectedCurrencyId) {
      message.warning('请选择结算币别');
      return;
    }

    const firstApp = applications[0]?.application;
    if (!firstApp?.settlementId) {
      message.warning('无法获取结算对象信息');
      return;
    }

    const derivedOrgId = getMyDefaultOrgId();
    if (!derivedOrgId) {
      message.warning('缺少归属组织，无法保存');
      return;
    }

    const paymentApplicationCurrencyItems =
      mapApplicationsToCurrencyItems(applications);

    if (paymentApplicationCurrencyItems.length === 0) {
      message.warning(
        '所有申请的结算金额都为0或未填写，请至少填写一个非零的结算金额',
      );
      return;
    }

    submitting.value = true;
    try {
      const newId = await addPaymentSettlementByCurrency({
        orgId: derivedOrgId,
        settlementTime: dayjs().toISOString(),
        payType: undefined,
        settlementId: firstApp.settlementId,
        currencyId: selectedCurrencyId,
        orgBankAccountId: undefined,
        clientInvoiceBankId: undefined,
        transactionFee: 0,
        transactionFeeCurrencyId: selectedCurrencyId,
        remark: '',
        paymentApplicationCurrencyItems,
        attachments: attachments.value.map((a, idx) => ({
          attachmentId: Number(a.attachmentId),
          displayOrder: idx,
        })),
      });

      message.success(
        `成功创建结算单，已添加 ${paymentApplicationCurrencyItems.length} 个「申请+原币」组合`,
      );
      markListShouldRefresh('PaymentSettlementList');

      if (newId) {
        const createTabKey = route.fullPath;
        await router.replace(
          `/settlement-management/payment-settlement/edit/${newId}`,
        );
        await closeTabByKey(createTabKey);
      }
    } catch {
      // request 拦截器已提示
    } finally {
      submitting.value = false;
    }
  }

  async function handleConfirmApplications(
    applications: SelectedApplicationForSettlement[],
    selectedCurrencyId?: number,
  ) {
    if (!selectedCurrencyId) {
      message.warning('请选择结算币别');
      return;
    }

    if (isEdit.value) {
      await handleAddAndSaveToSettlement(applications, selectedCurrencyId);
    } else {
      await handleCreateSettlementAndRedirect(applications, selectedCurrencyId);
    }
  }

  async function handleBatchDeleteApplications() {
    if (selectedRowKeys.value.length === 0) {
      message.warning('请至少选择一个申请');
      return;
    }

    const itemsToDelete = applicationItems.value.filter((item) =>
      selectedRowKeys.value.includes(item.rowKey || ''),
    );

    if (itemsToDelete.length === 0) {
      message.warning('未找到要删除的申请');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      content: `确定要删除选中的 ${itemsToDelete.length} 个申请吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        if (!isEdit.value || !editId.value) {
          const keysToRemove = new Set(selectedRowKeys.value);
          applicationItems.value = applicationItems.value.filter(
            (item) => !keysToRemove.has(item.rowKey || ''),
          );
          selectedRowKeys.value = [];
          message.success(`已删除 ${itemsToDelete.length} 个申请`);
          return;
        }

        submitting.value = true;
        try {
          await deleteItemsFromSettlementByCurrency({
            id: editId.value,
            paymentApplicationCurrencyKeys: itemsToDelete.map((item) => ({
              paymentApplicationId: item.paymentApplicationId,
              originalCurrencyId: item.originalCurrencyId,
            })),
          });

          message.success(`已成功删除 ${itemsToDelete.length} 个申请`);
          selectedRowKeys.value = [];
          markListShouldRefresh('PaymentSettlementList');
          await loadEditData();
        } catch {
          // request 拦截器已提示
        } finally {
          submitting.value = false;
        }
      },
    });
  }

  async function handleSave() {
    if (!validateForm()) return;

    const derivedOrgId = getMyDefaultOrgId();
    if (!derivedOrgId) {
      message.warning('缺少归属组织，无法保存');
      return;
    }

    if (!isEdit.value || !editId.value) {
      message.warning('新建模式请使用"添加申请"按钮自动创建结算单');
      return;
    }

    submitting.value = true;
    try {
      await editPaymentSettlement({
        id: editId.value,
        orgId: derivedOrgId,
        settlementTime: settlementTime.value.toISOString(),
        payType: payType.value,
        orgBankAccountId: orgBankAccountId.value,
        clientInvoiceBankId: clientInvoiceBankId.value,
        transactionFee: transactionFee.value,
        transactionFeeCurrencyId: transactionFeeCurrencyId.value,
        remark: remark.value,
        attachments: attachments.value.map((a, idx) => ({
          attachmentId: Number(a.attachmentId),
          displayOrder: idx,
        })),
      });

      message.success('保存成功');
      markListShouldRefresh('PaymentSettlementList');
      await loadEditData();
    } catch {
      // request 拦截器已提示
    } finally {
      submitting.value = false;
    }
  }

  return {
    handleConfirmApplications,
    handleBatchDeleteApplications,
    handleSave,
  };
}
