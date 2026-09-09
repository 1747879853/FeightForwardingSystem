import type { ClientAppApi } from '#/api/common/client';
import type { Attachment } from '#/api/common/upload';
import type { PaymentSettlementAdminApi } from '#/api/sea-export/payment-settlement-admin';

import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import dayjs from 'dayjs';
import { useUserStore } from '@vben/stores';

import { getMyOrgCompanyNode } from '#/composables/use-my-org';

import type { BankOption } from '../form-data';

/**
 * 付费结算表单基础状态
 */
export function useFormState() {
  const route = useRoute();
  const userStore = useUserStore();

  const editId = computed<string | undefined>(() => {
    const id = route.params.id;
    if (Array.isArray(id)) return id[0];
    return id ? String(id) : undefined;
  });
  const isEdit = computed(() => !!editId.value);

  /** 详情回填中：跳过 watch 副作用，避免清空银行选中值 */
  const isHydrating = ref(false);

  const pageLoading = ref(false);
  const submitting = ref(false);

  const settlementNo = ref('');
  const orgs = ref<Array<{ id: number; name?: string }>>([]);
  const settlementTime = ref(dayjs());
  const payType = ref<number | undefined>(undefined);
  const settlementId = ref<string>('');
  const settlementName = ref('');
  const settlementSelectedItems = ref<ClientAppApi.ClientSimpleDto[]>([]);
  const currencyId = ref<number | undefined>(undefined);
  const currencyCode = ref('');
  const orgBankAccountId = ref<string | undefined>(undefined);
  const clientInvoiceBankId = ref<string | undefined>(undefined);
  const transactionFee = ref<number | undefined>(undefined);
  const transactionFeeCurrencyId = ref<number | undefined>(undefined);
  const remark = ref('');
  const attachments = ref<Attachment[]>([]);
  const paymentApplicationAttachments = ref<
    PaymentSettlementAdminApi.AttachmentItemDto[]
  >([]);

  const orgBankOptions = ref<BankOption[]>([]);
  const clientBankOptions = ref<BankOption[]>([]);

  const applicationItems = ref<
    PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyDto[]
  >([]);
  const selectedRowKeys = ref<string[]>([]);

  const orgCompanies = computed(() => {
    const seen = new Map<number, { id: number; name: string }>();
    orgs.value.forEach((org) => {
      if (!org.id) return;
      const companyNode = getMyOrgCompanyNode(org.id);
      if (companyNode?.id != null && !seen.has(companyNode.id)) {
        seen.set(companyNode.id, {
          id: companyNode.id,
          name: companyNode.displayName || '',
        });
      }
    });
    return Array.from(seen.values());
  });

  const hasExistingFees = computed(() => applicationItems.value.length > 0);

  const existingSettlementRowKeys = computed(() =>
    applicationItems.value
      .map((item) => item.rowKey)
      .filter((key): key is string => !!key),
  );

  const totalSettledAmount = computed(() =>
    applicationItems.value.reduce(
      (sum, item) => sum + (item.settledPrice || 0),
      0,
    ),
  );

  const currentUserName = computed(
    () => userStore.userInfo?.realName || userStore.userInfo?.username || '-',
  );

  return {
    route,
    editId,
    isEdit,
    isHydrating,
    pageLoading,
    submitting,
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
    orgBankOptions,
    clientBankOptions,
    applicationItems,
    selectedRowKeys,
    orgCompanies,
    hasExistingFees,
    existingSettlementRowKeys,
    totalSettledAmount,
    currentUserName,
  };
}

export type PaymentSettlementFormState = ReturnType<typeof useFormState>;
