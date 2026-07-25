import { computed } from 'vue';
import { getClientInvoiceInfoList } from '#/api/sea-export/clinet-invoice-admin';
import { message } from 'ant-design-vue';

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
   * 加载客户开票信息
   */
  async function loadClientInvoiceInfo(settlementId: string) {
    if (!settlementId) return;

    try {
      const list = await getClientInvoiceInfoList({ ClientId: settlementId });
      clientInvoiceInfoList.value = list;

      // 选择默认的开票信息
      const defaultInfo = list.find((item: any) => item.isDefault);
      selectedClientInvoiceInfo.value =
        defaultInfo || (list.length > 0 ? list[0] : undefined);

      // 根据币别选择银行
      updateClientBankByCurrency();
    } catch (error) {
      console.error('加载客户开票信息失败:', error);
    }
  }

  /**
   * 根据币别更新客户银行
   */
  function updateClientBankByCurrency() {
    if (!selectedClientInvoiceInfo.value || !formData.value.currencyId) return;

    const currencyId = formData.value.currencyId;
    const bank = selectedClientInvoiceInfo.value.clientInvoiceBanks?.find(
      (b: any) => b.currencyId === currencyId && b.isDefault,
    );

    if (bank) {
      formData.value.clientInvoiceBankId = bank.id;
    } else {
      formData.value.clientInvoiceBankId = undefined;
    }
  }

  /**
   * 根据币别更新销售方银行
   */
  function updateOrgBankByCurrency() {
    if (!orgBankAccounts.value.length || !formData.value.currencyId) {
      formData.value.orgBankAccountId = undefined;
      return;
    }

    const currencyId = formData.value.currencyId;

    // 先查找默认的银行
    const defaultBank = orgBankAccounts.value.find(
      (b: any) => b.currencyId === currencyId && b.default,
    );

    if (defaultBank) {
      formData.value.orgBankAccountId = defaultBank.id;
      console.log(
        '✅ 自动选择销售方默认银行:',
        defaultBank.bankName,
        defaultBank.bankAccount,
      );
    } else {
      formData.value.orgBankAccountId = undefined;
      console.log('⚠️ 未找到销售方默认银行，清空选择');
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
      updateClientBankByCurrency();
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
      // 校验银行币种是否与开票币种一致
      if (selectedBank.currencyId !== formData.value.currencyId) {
        message.warning(
          `所选银行的币种（${selectedBank.currencyCode}）与开票币种不一致，请重新选择`,
        );
        updateClientBankByCurrency();
        return;
      }
    }
  }

  /**
   * 发票抬头选项列表
   */
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

  /**
   * 获取与开票币种一致的银行列表（客户）
   */
  const filteredClientBanks = computed(() => {
    if (!selectedClientInvoiceInfo.value || !formData.value.currencyId) {
      return [];
    }

    const currencyId = formData.value.currencyId;
    const banks = selectedClientInvoiceInfo.value.clientInvoiceBanks || [];

    return banks.filter((bank: any) => bank.currencyId === currencyId);
  });

  /**
   * 获取销售方与开票币种一致的银行列表
   */
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
