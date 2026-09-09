import {
  getMyCompanyBankAccounts,
  getMyOrgCompanyNode,
} from '#/composables/use-my-org';

import type { BankOption } from '../form-data';
import type { PaymentSettlementFormState } from './use-form-state';

/**
 * 我司银行 / 对方银行选项加载
 */
export function useBankOptions(state: PaymentSettlementFormState) {
  const { currencyId, orgs, settlementId, orgBankOptions, clientBankOptions } =
    state;

  async function loadOrgBankOptions() {
    if (!currencyId.value || orgs.value.length === 0) {
      orgBankOptions.value = [];
      return;
    }

    try {
      const orgIds = new Set<number>();
      orgs.value.forEach((org) => {
        if (org.id) orgIds.add(org.id);
      });

      if (orgIds.size === 0) {
        orgBankOptions.value = [];
        return;
      }

      const companyIds = new Set<number>();
      orgIds.forEach((orgId) => {
        const companyNode = getMyOrgCompanyNode(orgId);
        if (companyNode?.id) companyIds.add(companyNode.id);
      });

      const allBanks: BankOption[] = [];

      for (const companyId of companyIds) {
        try {
          const accounts = getMyCompanyBankAccounts(companyId);
          accounts
            .filter(
              (account) =>
                account.currencyId === currencyId.value &&
                account.enable !== false,
            )
            .forEach((account) => {
              allBanks.push({
                id: account.id,
                label:
                  `${account.bankShortName || ''} - ${account.accountName || ''} (${account.currencyCode || ''})`.trim(),
                bankName: account.bankName || undefined,
                bankAccount: account.bankAccount || undefined,
                currencyId: account.currencyId,
              });
            });
        } catch {
          // 单公司缓存读取失败不影响其它公司
        }
      }

      orgBankOptions.value = allBanks.filter(
        (bank, index, self) =>
          index === self.findIndex((b) => b.id === bank.id),
      );
    } catch {
      orgBankOptions.value = [];
    }
  }

  async function loadClientBankOptions() {
    if (!settlementId.value) {
      clientBankOptions.value = [];
      return;
    }

    try {
      const { getClientInvoiceInfoList } =
        await import('#/api/sea-export/clinet-invoice-admin');

      const invoiceInfos = await getClientInvoiceInfoList({
        ClientId: settlementId.value,
      });

      if (!invoiceInfos || invoiceInfos.length === 0) {
        clientBankOptions.value = [];
        return;
      }

      const allBanks: BankOption[] = [];

      invoiceInfos.forEach((invoiceInfo) => {
        const banks = invoiceInfo.clientInvoiceBanks || [];
        banks
          .filter(
            (bank) => bank.currencyId === currencyId.value && !bank.isDeleted,
          )
          .forEach((bank) => {
            allBanks.push({
              id: bank.id,
              label: `${bank.bankName || ''}(${bank.bankAccount || ''})`.trim(),
              bankName: bank.bankName,
              bankAccount: bank.bankAccount,
              currencyId: bank.currencyId,
            });
          });
      });

      clientBankOptions.value = allBanks;
    } catch {
      clientBankOptions.value = [];
    }
  }

  return {
    loadOrgBankOptions,
    loadClientBankOptions,
  };
}
