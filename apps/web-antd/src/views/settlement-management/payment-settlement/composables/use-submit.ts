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

function mapAttachmentsForSubmit(
  attachments: PaymentSettlementFormState['attachments']['value'],
) {
  return attachments.map((a, idx) => ({
    // 雪花 ID 字符串透传，禁止 Number()
    attachmentId: a.attachmentId,
    displayOrder: idx,
  }));
}

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
    isReadonly,
    submitting,
    settlementId,
    currencyId,
    settlementTime,
    payType,
    orgId,
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
    if (isReadonly.value) {
      message.warning('结算单已锁定，无法保存');
      return false;
    }
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
    if (isReadonly.value) {
      message.warning('结算单已锁定，无法添加明细');
      return;
    }
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
        `已添加并保存 ${paymentApplicationCurrencyItems.length} 个申请`,
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
      // 新建时带上页内已填主表字段，避免建单后再改一次才落库
      const newId = await addPaymentSettlementByCurrency({
        orgId: derivedOrgId,
        settlementTime: settlementTime.value?.toISOString?.()
          ? settlementTime.value.toISOString()
          : dayjs().toISOString(),
        payType: payType.value,
        settlementId: firstApp.settlementId,
        currencyId: selectedCurrencyId,
        orgBankAccountId: orgBankAccountId.value,
        clientInvoiceBankId: clientInvoiceBankId.value,
        transactionFee: transactionFee.value ?? 0,
        transactionFeeCurrencyId:
          transactionFeeCurrencyId.value ?? selectedCurrencyId,
        remark: remark.value || '',
        paymentApplicationCurrencyItems,
        attachments: mapAttachmentsForSubmit(attachments.value),
      });

      message.success(
        `成功创建结算单，已添加 ${paymentApplicationCurrencyItems.length} 个申请`,
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
    // 父级写接口进行中禁止再次确认，避免抽屉关后立刻再开导致连建
    if (submitting.value || isReadonly.value) return;

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
    if (isReadonly.value) {
      message.warning('结算单已锁定，无法删除明细');
      return;
    }
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
              applyCurrencyId: item.applyCurrencyId,
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

    if (!isEdit.value || !editId.value) {
      message.warning('新建模式请使用"添加申请"按钮自动创建结算单');
      return;
    }

    // 后端仍校验所属组织；优先回传详情 orgId，避免用当前用户默认组织覆盖单据
    const saveOrgId = orgId.value ?? getMyDefaultOrgId();
    if (!saveOrgId) {
      message.warning('缺少归属组织，无法保存');
      return;
    }

    submitting.value = true;
    try {
      await editPaymentSettlement({
        id: editId.value,
        orgId: saveOrgId,
        settlementTime: settlementTime.value.toISOString(),
        payType: payType.value,
        orgBankAccountId: orgBankAccountId.value,
        clientInvoiceBankId: clientInvoiceBankId.value,
        transactionFee: transactionFee.value,
        transactionFeeCurrencyId: transactionFeeCurrencyId.value,
        remark: remark.value,
        attachments: mapAttachmentsForSubmit(attachments.value),
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
