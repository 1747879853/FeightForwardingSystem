import dayjs from 'dayjs';

import { getPaymentSettlementDetailByCurrency } from '#/api/sea-export/payment-settlement-admin';

import type { PaymentSettlementFormState } from './use-form-state';

/**
 * 详情加载（按原币扁平行）
 */
export function useLoadDetail(
  state: PaymentSettlementFormState,
  loadOrgBankOptions: () => Promise<void>,
  loadClientBankOptions: () => Promise<void>,
) {
  const {
    editId,
    isHydrating,
    pageLoading,
    settlementNo,
    orgs,
    settlementTime,
    payType,
    settlementId,
    settlementName,
    settlementSelectedItems,
    currencyId,
    currencyCode,
    orgBankAccountId,
    clientInvoiceBankId,
    transactionFee,
    transactionFeeCurrencyId,
    remark,
    attachments,
    paymentApplicationAttachments,
    applicationItems,
  } = state;

  async function loadEditData() {
    if (!editId.value) return;

    pageLoading.value = true;
    isHydrating.value = true;
    try {
      const detail = await getPaymentSettlementDetailByCurrency(editId.value);

      settlementNo.value = detail.settlementNo || '';
      orgs.value = detail.orgs || [];
      settlementTime.value = dayjs(detail.settlementTime);
      payType.value = detail.payType;
      settlementId.value = detail.settlementId;
      settlementName.value = detail.settlement?.name ?? '';
      settlementSelectedItems.value = detail.settlement?.id
        ? [
            {
              fullName: detail.settlement.fullName,
              id: detail.settlement.id,
              name: detail.settlement.name ?? '',
            },
          ]
        : [];
      currencyId.value = detail.currencyId;
      currencyCode.value = detail.currency?.code || '';
      transactionFee.value = detail.transactionFee;
      transactionFeeCurrencyId.value =
        detail.transactionFeeCurrencyId ?? detail.currencyId;
      remark.value = detail.remark || '';

      applicationItems.value = (detail.paymentApplicationCurrencies || []).map(
        (item) => ({
          ...item,
          rowKey:
            item.rowKey ||
            `${item.paymentApplicationId}_${item.originalCurrencyId}`,
        }),
      );

      attachments.value = (detail.attachments ?? []).map((a) => ({
        attachmentId: a.attachmentId,
        url: a.url || a.attachmentPath || '',
        fileName: a.friendlyFileName || a.attachmentName || '',
        friendlyFileName: a.friendlyFileName || a.attachmentName || '',
      }));

      paymentApplicationAttachments.value =
        detail.paymentApplicationAttachments || [];

      // 先加载银行选项，再赋值选中值（确保选项存在后才能正确回显）
      await loadOrgBankOptions();
      await loadClientBankOptions();

      orgBankAccountId.value = detail.orgBankAccountId;
      clientInvoiceBankId.value = detail.clientInvoiceBankId;
    } finally {
      isHydrating.value = false;
      pageLoading.value = false;
    }
  }

  return { loadEditData };
}
