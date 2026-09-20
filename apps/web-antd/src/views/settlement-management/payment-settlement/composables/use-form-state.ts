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

  /** 结算人展示名：编辑回显详情；新建用当前登录用户 */
  const settlerUserName = ref('');

  const orgBankOptions = ref<BankOption[]>([]);
  const clientBankOptions = ref<BankOption[]>([]);

  const applicationItems = ref<
    PaymentSettlementAdminApi.PaymentSettlementPayAppCurrencyDto[]
  >([]);
  const selectedRowKeys = ref<string[]>([]);

  /**
   * 归属公司：优先用详情 orgs 接口字段（isCompany / name），
   * 不依赖当前登录人组织树；仅在无公司标记时再尝试本地换算。
   */
  const orgCompanies = computed(() => {
    const seen = new Map<number, { id: number; name: string }>();
    const add = (id: number, name?: string) => {
      if (id == null || seen.has(id)) return;
      seen.set(id, { id, name: (name || '').trim() || '-' });
    };

    for (const org of orgs.value) {
      if (org?.isCompany && org.id != null) {
        add(org.id, org.name);
      }
    }
    if (seen.size > 0) {
      return Array.from(seen.values());
    }

    for (const org of orgs.value) {
      if (org?.id == null) continue;
      const companyNode = getMyOrgCompanyNode(org.id);
      if (companyNode?.id != null) {
        add(companyNode.id as number, companyNode.displayName || org.name);
      } else if (org.name) {
        // 登录人不在该组织树时仍展示接口名称，避免整块隐藏
        add(org.id, org.name);
      }
    }
    return Array.from(seen.values());
  });

  /** 归属公司展示文案（只读） */
  const displayOrgCompanyName = computed(() => {
    const names = orgCompanies.value
      .map((c) => c.name)
      .filter((n) => n && n !== '-');
    return names.length > 0 ? names.join('、') : '-';
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

  /** 结算人：编辑用详情 creatorUserName，新建用当前登录用户 */
  const displaySettlerName = computed(() => {
    if (isEdit.value) {
      return settlerUserName.value || '-';
    }
    return currentUserName.value;
  });

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
    settlerUserName,
    orgBankOptions,
    clientBankOptions,
    applicationItems,
    selectedRowKeys,
    orgCompanies,
    displayOrgCompanyName,
    hasExistingFees,
    existingSettlementRowKeys,
    totalSettledAmount,
    currentUserName,
    displaySettlerName,
  };
}

export type PaymentSettlementFormState = ReturnType<typeof useFormState>;
