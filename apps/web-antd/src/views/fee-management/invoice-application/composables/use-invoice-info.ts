import { message } from 'ant-design-vue';
import type { Ref } from 'vue';
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import {
  getClientInvoiceInfoList,
  type ClientInvoiceInfoAdminApi,
} from '#/api/sea-export/clinet-invoice-admin';

/**
 * 发票信息相关逻辑（客户、银行、税率等）
 */
export function useInvoiceInfo(
  formData: Ref<any>,
  clientInvoiceInfoList: Ref<any[]>,
  selectedClientInvoiceInfo: Ref<any>,
  orgBankAccounts: Ref<any[]>,
) {
  /**
   * 加载客户开票信息
   */
  async function loadClientInvoiceInfo(settlementId: string) {
    if (!settlementId) {
      console.warn('⚠️ settlementId 为空，无法加载客户开票信息');
      return;
    }

    try {
      console.log('📥 开始加载客户开票信息, settlementId:', settlementId);
      const list = await getClientInvoiceInfoList({ ClientId: settlementId });
      clientInvoiceInfoList.value = list;
      console.log('✅ 客户开票信息加载成功，数量:', list.length);

      // ✅ 修改：如果已有选中的开票信息，保持不变；否则选择默认或第一项
      if (
        !selectedClientInvoiceInfo.value ||
        !selectedClientInvoiceInfo.value.id
      ) {
        // 选择默认的开票信息，如果没有默认则选择第一项
        const defaultInfo = list.find((item) => item.isDefault);
        selectedClientInvoiceInfo.value =
          defaultInfo || (list.length > 0 ? list[0] : undefined);

        console.log('📋 自动选中客户开票信息:', {
          id: selectedClientInvoiceInfo.value?.id,
          header: selectedClientInvoiceInfo.value?.header,
          isDefault: selectedClientInvoiceInfo.value?.isDefault,
          banks:
            selectedClientInvoiceInfo.value?.clientInvoiceBanks?.length || 0,
        });

        // ✅ 新增：自动填充客户开票要求（仅当开票要求字段为空时）
        if (
          selectedClientInvoiceInfo.value &&
          (!formData.value.require || formData.value.require.trim() === '')
        ) {
          formData.value.require =
            selectedClientInvoiceInfo.value.require || '';
        }
      } else {
        console.log('📋 保持已选中的客户开票信息:', {
          id: selectedClientInvoiceInfo.value?.id,
          header: selectedClientInvoiceInfo.value?.header,
        });
      }

      // ✅ 修改：如果购买方名称（header）未赋值，自动使用选中的开票信息
      if (
        !formData.value.clientInvoiceBankId &&
        selectedClientInvoiceInfo.value
      ) {
        // 根据币别选择银行
        console.log(
          '🔄 准备根据币别更新客户银行, currencyId:',
          formData.value.currencyId,
        );
        updateClientBankByCurrency();

        // ✅ 新增：如果银行ID仍未赋值且有可用银行，自动选择第一个匹配的银行
        if (
          !formData.value.clientInvoiceBankId &&
          filteredClientBanks.value.length > 0
        ) {
          formData.value.clientInvoiceBankId =
            filteredClientBanks.value[0].value;
          console.log('✅ 自动选择第一个客户银行:', {
            id: formData.value.clientInvoiceBankId,
            bankName: filteredClientBanks.value[0].bankName,
            bankAccount: filteredClientBanks.value[0].bankAccount,
          });
        }

        console.log(
          '✅ 客户银行ID已设置为:',
          formData.value.clientInvoiceBankId,
        );
      }
    } catch (error) {
      console.error('❌ 加载客户开票信息失败:', error);
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
    console.log('🔄 开始更新销售方银行');
    console.log('  - orgBankAccounts数量:', orgBankAccounts.value.length);
    console.log('  - currencyId:', formData.value.currencyId);

    if (!orgBankAccounts.value.length || !formData.value.currencyId) {
      console.warn('⚠️ 缺少银行列表或币别，清空销售方银行选择');
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
      console.log('✅ 找到默认银行:', {
        id: defaultBank.id,
        bankName: defaultBank.bankName,
        bankAccount: defaultBank.bankAccount,
        currencyId: defaultBank.currencyId,
      });
    } else {
      // ✅ 修改：如果没有默认银行，自动选择第一个匹配的银行
      const firstMatchedBank = orgBankAccounts.value.find(
        (b: any) => b.currencyId === currencyId,
      );

      if (firstMatchedBank) {
        formData.value.orgBankAccountId = firstMatchedBank.id;
        console.log('✅ 自动选择第一个销售方银行:', {
          id: firstMatchedBank.id,
          bankName: firstMatchedBank.bankName,
          bankAccount: firstMatchedBank.bankAccount,
          currencyId: firstMatchedBank.currencyId,
        });
      } else {
        formData.value.orgBankAccountId = undefined;
        console.warn('⚠️ 未找到匹配币别的银行，清空选择');
      }
    }
  }

  /**
   * 处理新组件的选择变化（带搜索和快捷录入）
   */
  function handleClientInvoiceInfoChange(
    value: string,
    info: ClientInvoiceInfoAdminApi.ClientInvoiceInfoDto | null,
  ) {
    if (!value || !info) {
      selectedClientInvoiceInfo.value = undefined;
      formData.value.clientInvoiceBankId = '';
      return;
    }

    console.log('✅ 新组件选中开票信息:', {
      id: info.id,
      header: info.header,
      taxNum: info.taxNum,
    });

    selectedClientInvoiceInfo.value = info;

    // 自动填充开票要求（仅当为空时）
    if (
      info.require &&
      (!formData.value.require || formData.value.require.trim() === '')
    ) {
      formData.value.require = info.require;
    }

    // 根据币别选择银行
    updateClientBankByCurrency();

    // 如果银行ID仍未赋值且有可用银行，自动选择第一个匹配的银行
    if (
      !formData.value.clientInvoiceBankId &&
      filteredClientBanks.value.length > 0
    ) {
      formData.value.clientInvoiceBankId = filteredClientBanks.value[0].value;
      console.log('✅ 自动选择第一个客户银行:', {
        id: formData.value.clientInvoiceBankId,
        bankName: filteredClientBanks.value[0].bankName,
      });
    }
  }

  /**
   * 处理发票抬头变化
   */
  function handleClientInvoiceHeaderChange(headerId: any) {
    if (!headerId) return;

    const selectedInfo = clientInvoiceInfoList.value.find(
      (info) => info.id === String(headerId),
    );

    if (selectedInfo) {
      selectedClientInvoiceInfo.value = selectedInfo;
      updateClientBankByCurrency();

      // ✅ 新增：自动填充客户开票要求（仅当开票要求字段为空时）
      if (!formData.value.require || formData.value.require.trim() === '') {
        formData.value.require = selectedInfo.require || '';
      }
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
        updateClientBankByCurrency();
        return;
      }
    }
  }

  /**
   * 获取与开票币种一致的银行列表（计算属性）
   */
  const filteredClientBanks = computed(() => {
    if (!selectedClientInvoiceInfo.value || !formData.value.currencyId) {
      return [];
    }

    const currencyId = formData.value.currencyId;
    const banks = selectedClientInvoiceInfo.value.clientInvoiceBanks || [];

    return banks
      .filter((bank: any) => bank.currencyId === currencyId)
      .map((bank: any) => ({
        ...bank,
        value: bank.id,
        label: `${bank.bankName}-${bank.bankAccount}`,
      }));
  });

  /**
   * 获取销售方与开票币种一致的银行列表（计算属性）
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

  /**
   * 发票抬头选项列表（计算属性）
   */
  const clientInvoiceHeaderOptions = computed(() => {
    if (
      !clientInvoiceInfoList.value ||
      clientInvoiceInfoList.value.length === 0
    ) {
      return [];
    }

    return clientInvoiceInfoList.value.map((info) => ({
      label: info.header || '未命名抬头',
      value: info.id,
    }));
  });

  return {
    loadClientInvoiceInfo,
    updateClientBankByCurrency,
    updateOrgBankByCurrency,
    handleClientInvoiceInfoChange,
    handleClientInvoiceHeaderChange,
    handleClientBankChange,
    filteredClientBanks,
    filteredOrgBanks,
    clientInvoiceHeaderOptions,
  };
}
