import { computed } from 'vue';
import { getClientInvoiceInfoList } from '#/api/sea-export/clinet-invoice-admin';
import { message } from 'ant-design-vue';
import { findClientInvoiceInfoByBankId } from '#/views/_shared/invoice-goods';

/**
 * 开票相关信息管理
 */
export function useInvoiceInfo(
  clientInvoiceInfoList: any,
  selectedClientInvoiceInfo: any,
  formData: any,
  orgBankAccounts: any,
) {
  /**
   * 加载客户开票信息。
   * 若表单已有 clientInvoiceBankId，按银行反查抬头并保留，不覆盖为默认银行。
   */
  async function loadClientInvoiceInfo(settlementId: string) {
    if (!settlementId) return;

    try {
      const list = await getClientInvoiceInfoList({ ClientId: settlementId });
      clientInvoiceInfoList.value = list;

      const existingBankId = formData.value.clientInvoiceBankId;
      const owningInfo = findClientInvoiceInfoByBankId(list, existingBankId);

      if (owningInfo) {
        selectedClientInvoiceInfo.value = owningInfo;
        // 保留已有银行 id，仅在币别不匹配时再改
        updateClientBankByCurrency({ preserveExisting: true });
        return;
      }

      const defaultInfo = list.find((item: any) => item.isDefault);
      selectedClientInvoiceInfo.value =
        defaultInfo || (list.length > 0 ? list[0] : undefined);

      updateClientBankByCurrency({ preserveExisting: false });
    } catch (error) {
      console.error('加载客户开票信息失败:', error);
    }
  }

  /**
   * 根据币别更新客户银行。
   * preserveExisting：当前银行仍属该币别时不覆盖（对齐销售方银行逻辑）。
   */
  function updateClientBankByCurrency(options?: {
    preserveExisting?: boolean;
  }) {
    if (!selectedClientInvoiceInfo.value || !formData.value.currencyId) return;

    const currencyId = formData.value.currencyId;
    const banks = selectedClientInvoiceInfo.value.clientInvoiceBanks || [];
    const currentId = formData.value.clientInvoiceBankId;
    const preserve = options?.preserveExisting !== false;

    if (
      preserve &&
      currentId &&
      banks.some(
        (b: any) =>
          String(b.id) === String(currentId) && b.currencyId === currencyId,
      )
    ) {
      return;
    }

    const bank =
      banks.find((b: any) => b.currencyId === currencyId && b.isDefault) ||
      banks.find((b: any) => b.currencyId === currencyId);

    formData.value.clientInvoiceBankId = bank?.id;
  }

  /**
   * 根据币别更新销售方银行
   */
  function updateOrgBankByCurrency() {
    if (!formData.value.currencyId) return;
    if (!orgBankAccounts.value.length) {
      return;
    }

    const currencyId = formData.value.currencyId;
    const currentId = formData.value.orgBankAccountId;
    if (
      currentId &&
      orgBankAccounts.value.some(
        (b: any) =>
          String(b.id) === String(currentId) && b.currencyId === currencyId,
      )
    ) {
      return;
    }

    const defaultBank = orgBankAccounts.value.find(
      (b: any) => b.currencyId === currencyId && b.default,
    );

    if (defaultBank) {
      formData.value.orgBankAccountId = defaultBank.id;
    } else {
      formData.value.orgBankAccountId = undefined;
    }
  }

  /**
   * 处理发票抬头变化
   */
  function handleClientInvoiceHeaderChange(headerId: any) {
    if (!headerId) return;

    const selectedInfo = clientInvoiceInfoList.value.find(
      (info: any) => info.id === String(headerId),
    );

    if (selectedInfo) {
      selectedClientInvoiceInfo.value = selectedInfo;
      // 换抬头时按币别选默认银行
      updateClientBankByCurrency({ preserveExisting: false });
    }
  }

  /**
   * 处理客户银行变化 - 校验币种
   */
  function handleClientBankChange(bankId: any) {
    if (!bankId || !selectedClientInvoiceInfo.value) return;

    const selectedBank =
      selectedClientInvoiceInfo.value.clientInvoiceBanks?.find(
        (b: any) => b.id === String(bankId),
      );

    if (selectedBank) {
      if (selectedBank.currencyId !== formData.value.currencyId) {
        message.warning(
          `所选银行的币种（${selectedBank.currencyCode}）与开票币种不一致，请重新选择`,
        );
        updateClientBankByCurrency({ preserveExisting: false });
      }
    }
  }

  const clientInvoiceHeaderOptions = computed(() => {
    if (
      !clientInvoiceInfoList.value ||
      clientInvoiceInfoList.value.length === 0
    ) {
      return [];
    }

    return clientInvoiceInfoList.value.map((info: any) => ({
      label: info.header || '未命名抬头',
      value: info.id,
    }));
  });

  const filteredClientBanks = computed(() => {
    if (!selectedClientInvoiceInfo.value || !formData.value.currencyId) {
      return [];
    }

    const currencyId = formData.value.currencyId;
    const banks = selectedClientInvoiceInfo.value.clientInvoiceBanks || [];

    return banks.filter((bank: any) => bank.currencyId === currencyId);
  });

  const filteredOrgBanks = computed(() => {
    if (!orgBankAccounts.value.length || !formData.value.currencyId) {
      return [];
    }

    const currencyId = formData.value.currencyId;

    return orgBankAccounts.value.filter(
      (bank: any) => bank.currencyId === currencyId,
    );
  });

  return {
    loadClientInvoiceInfo,
    updateClientBankByCurrency,
    updateOrgBankByCurrency,
    handleClientInvoiceHeaderChange,
    handleClientBankChange,
    clientInvoiceHeaderOptions,
    filteredClientBanks,
    filteredOrgBanks,
  };
}
