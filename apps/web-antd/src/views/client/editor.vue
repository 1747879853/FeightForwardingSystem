<script lang="ts" setup>
import { computed, nextTick, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { useUnsavedGuard } from '#/composables/use-unsaved-guard';

import Attachments from './attachments/list.vue';
import Form from './base/form.vue';
import ContactList from './contact/list.vue';
import ExceptService from './except-service/index.vue';
import InvoiceList from './invoice/list.vue';

defineOptions({ name: 'ClientEdit' });

type SectionKey = 'attachments' | 'basic' | 'contact' | 'invoice';
type FormSectionTabKey =
  | 'attachments'
  | 'basic'
  | 'contact'
  | 'exceptService'
  | 'invoice';
type TabKey = FormSectionTabKey;
type FormExpose = {
  isFormDirty?: () => boolean | Promise<boolean>;
  scrollToSection?: (key: SectionKey) => void;
};
type ContactExpose = { isContactDirty?: () => boolean };
type InvoiceExpose = { isInvoiceDirty?: () => boolean | Promise<boolean> };

const route = useRoute();
/** 客户审核列表双击进入：基础信息只读；联系人/开票/附件等 Tab 仍可切换查看 */
const isAuditMode = computed(() => route.query.mode === 'audit');

const formRef = ref<FormExpose | null>(null);
const contactRef = ref<ContactExpose | null>(null);
const invoiceRef = ref<InvoiceExpose | null>(null);
const activeTab = ref<TabKey>('basic');

const tabs: { key: TabKey; label: string; sectionKey?: SectionKey }[] = [
  { key: 'basic', label: '基础信息', sectionKey: 'basic' },
  { key: 'contact', label: '联系人' },
  { key: 'invoice', label: '开票信息' },
  { key: 'attachments', label: '附件' },
  { key: 'exceptService', label: '海运出口服务项目' },
];

const onTabClick = (tab: { key: TabKey; sectionKey?: SectionKey }) => {
  activeTab.value = tab.key;
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
  enabled: () => !isAuditMode.value,
  isDirty: async () => {
    if (isAuditMode.value) return false;
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
</script>

<template>
  <Page auto-content-height content-class="!p-0">
    <div class="flex min-w-0 flex-1 flex-col gap-2">
      <div
        class="content-tabs"
        :class="{ 'content-tabs--audit': isAuditMode }"
        :style="contentTabsStyle"
      >
        <span
          v-for="tab in tabs"
          :key="tab.key"
          class="content-tab"
          :class="{ 'content-tab--active': activeTab === tab.key }"
          @click="onTabClick(tab)"
        >
          {{ tab.label }}
        </span>
        <span v-if="isAuditMode" class="content-tabs__audit-hint">
          只读查看 · 右上角可审核 / 驳回 / 转交
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

<style scoped>
.content-tab {
  padding: 6px 10px;
  font-size: 12px;
  color: #595959;
  white-space: nowrap;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.content-tab--active {
  font-weight: 600;
  color: hsl(var(--primary));
  border-bottom-color: hsl(var(--primary));
}

.content-tabs--audit {
  flex-wrap: wrap;
}

.content-tabs__audit-hint {
  margin-left: auto;
  font-size: 12px;
  color: hsl(var(--muted-foreground));
  white-space: nowrap;
}
</style>
