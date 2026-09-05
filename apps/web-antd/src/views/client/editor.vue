<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';

import { useAccess } from '@vben/access';
import { Page } from '@vben/common-ui';

import { useUnsavedGuard } from '#/composables/use-unsaved-guard';
import { createAbpPermission } from '#/utils/abp-permission';

import Attachments from './attachments/list.vue';
import Form from './base/form.vue';
import ContactList from './contact/list.vue';
import ExceptService from './except-service/index.vue';
import InvoiceList from './invoice/list.vue';
import PaymentList from './payment-terms/list.vue';

defineOptions({ name: 'ClientEdit' });

type SectionKey = 'attachments' | 'basic' | 'contact' | 'invoice' | 'payment';
type FormSectionTabKey =
  | 'attachments'
  | 'basic'
  | 'contact'
  | 'exceptService'
  | 'invoice'
  | 'payment';
type TabKey = FormSectionTabKey;
type FormExpose = {
  isFormDirty?: () => boolean | Promise<boolean>;
  scrollToSection?: (key: SectionKey) => void;
};
type ContactExpose = { isContactDirty?: () => boolean };
type InvoiceExpose = { isInvoiceDirty?: () => boolean | Promise<boolean> };

const formRef = ref<FormExpose | null>(null);
const contactRef = ref<ContactExpose | null>(null);
const invoiceRef = ref<InvoiceExpose | null>(null);
const activeTab = ref<TabKey>('basic');

/** 账期独立权限：拥有 Admin.Client.BillingPeriod 或其 .Get 任一权限即可见账期 tab */
const billingPeriodPerm = createAbpPermission('Admin.Client.BillingPeriod');
const { hasAccessByCodes } = useAccess();
const canAccessBillingPeriod = computed(() =>
  hasAccessByCodes(billingPeriodPerm.pageAuthority),
);

const allTabs: { key: TabKey; label: string; sectionKey?: SectionKey }[] = [
  { key: 'basic', label: '基础信息', sectionKey: 'basic' },
  { key: 'contact', label: '联系人' },
  { key: 'payment', label: '账期' },
  { key: 'invoice', label: '开票信息' },
  { key: 'attachments', label: '附件' },
  { key: 'exceptService', label: '海运出口服务项目' },
];

/** 账期 tab 受独立权限控制：无权限则从列表移除，用户看不到也点不到 */
const tabs = computed(() =>
  allTabs.filter(
    (tab) => tab.key !== 'payment' || canAccessBillingPeriod.value,
  ),
);

const onTabClick = (tab: { key: TabKey; sectionKey?: SectionKey }) => {
  activeTab.value = tab.key;
  // 先取局部常量再判空：nextTick 回调是延迟执行的闭包，直接用 tab.sectionKey 时
  // TS 无法保持收窄（会退回 SectionKey | undefined），导致 scrollToSection 传参报错
  const sectionKey = tab.sectionKey;
  if (!sectionKey) return;
  nextTick(() => {
    formRef.value?.scrollToSection?.(sectionKey);
  });
};

const onSectionChange = (sectionKey: SectionKey) => {
  activeTab.value = sectionKey;
};

useUnsavedGuard({
  isDirty: async () => {
    const formDirty = formRef.value?.isFormDirty;
    if (formDirty && (await formDirty())) return true;
    if (contactRef.value?.isContactDirty?.()) return true;
    const invoiceDirty = invoiceRef.value?.isInvoiceDirty;
    if (invoiceDirty && (await invoiceDirty())) return true;
    return false;
  },
});

const contentTabsStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  padding: '8px',
  overflowX: 'auto',
  position: 'sticky',
  top: '0',
  zIndex: 20,
  background: '#fff',
  border: '1px solid #e8e8e8',
  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
} as const;

const contentTabStyle = {
  padding: '6px 10px',
  fontSize: '12px',
  color: '#595959',
  cursor: 'pointer',
  borderBottom: '2px solid transparent',
  whiteSpace: 'nowrap',
} as const;

const getContentTabStyle = (isActive: boolean) =>
  isActive
    ? {
        ...contentTabStyle,
        fontWeight: 600,
        color: '#1677ff',
        borderBottomColor: '#1677ff',
      }
    : contentTabStyle;
</script>

<template>
  <Page auto-content-height content-class="!p-0">
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <div class="content-tabs" :style="contentTabsStyle">
        <span
          v-for="tab in tabs"
          :key="tab.key"
          class="content-tab"
          :class="{ 'content-tab--active': activeTab === tab.key }"
          :style="getContentTabStyle(activeTab === tab.key)"
          @click="onTabClick(tab)"
        >
          {{ tab.label }}
        </span>
      </div>
      <div class="flex items-stretch gap-3">
        <div class="flex min-w-0 flex-1 flex-col">
          <KeepAlive include="ClientAdminForm">
            <Form
              v-if="activeTab === 'basic'"
              ref="formRef"
              embedded
              @section-change="onSectionChange"
            />
          </KeepAlive>
          <KeepAlive include="ClientContactList">
            <ContactList v-if="activeTab === 'contact'" ref="contactRef" />
          </KeepAlive>
          <KeepAlive include="ClientPaymentList">
            <PaymentList v-if="activeTab === 'payment'" />
          </KeepAlive>
          <KeepAlive include="ClientInvoiceList">
            <InvoiceList v-if="activeTab === 'invoice'" ref="invoiceRef" />
          </KeepAlive>
          <KeepAlive include="ClientAttachments">
            <Attachments v-if="activeTab === 'attachments'" />
          </KeepAlive>
          <KeepAlive include="ClientExceptService">
            <ExceptService v-if="activeTab === 'exceptService'" />
          </KeepAlive>
        </div>
      </div>
    </div>
  </Page>
</template>
