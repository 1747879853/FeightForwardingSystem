import { watch } from 'vue';

import type { PaymentSettlementFormState } from './use-form-state';

/**
 * 结算对象 / 币别 / 归属组织联动
 * 详情回填期间（isHydrating）跳过副作用，避免清空银行选中值或重复请求。
 */
export function useFormEffects(
  state: PaymentSettlementFormState,
  loadOrgBankOptions: () => Promise<void>,
  loadClientBankOptions: () => Promise<void>,
) {
  const {
    isHydrating,
    settlementId,
    settlementName,
    settlementSelectedItems,
    clientInvoiceBankId,
    currencyId,
    currencyCode,
    transactionFeeCurrencyId,
    orgs,
  } = state;

  /** 结算币别确定后，手续费币别为空则默认跟随 */
  watch(currencyId, (id) => {
    if (id != null && transactionFeeCurrencyId.value == null) {
      transactionFeeCurrencyId.value = id;
    }
  });

  /** 结算对象变化：更新名称、清空对方银行、重载对方银行选项 */
  watch(settlementId, async (newVal) => {
    if (isHydrating.value) return;

    if (newVal) {
      const cached = settlementSelectedItems.value.find(
        (item) => String(item.id) === String(newVal),
      );
      if (cached) {
        settlementName.value = cached.name || cached.fullName || '';
      } else {
        try {
          const { getClientDetail } =
            await import('#/api/sea-export/client-admin');
          const detail = await getClientDetail(newVal);
          settlementName.value = detail.name || detail.fullName || '';
        } catch {
          // 客户名拉取失败不阻断；request 拦截器已提示
        }
      }
    } else {
      settlementName.value = '';
    }

    clientInvoiceBankId.value = undefined;
    await loadClientBankOptions();
  });

  /** 结算币别变化：更新币别代码并重载双方银行 */
  watch(currencyId, async (newVal) => {
    if (isHydrating.value) return;

    if (newVal) {
      try {
        const { getCurrencyDetail } =
          await import('#/api/system/base-data/currency-admin');
        const detail = await getCurrencyDetail(String(newVal));
        currencyCode.value = detail.code || '';
      } catch {
        // 币别详情失败不阻断
      }
    } else {
      currencyCode.value = '';
    }

    await loadOrgBankOptions();
    await loadClientBankOptions();
  });

  /** 归属组织变化：重载我司银行 */
  watch(
    () => orgs.value,
    async () => {
      if (isHydrating.value) return;
      await loadOrgBankOptions();
    },
    { deep: true },
  );
}
