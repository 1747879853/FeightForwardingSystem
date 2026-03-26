<script lang="ts" setup>
import { nextTick, ref } from 'vue';
import { Page } from '@vben/common-ui';

import Form from './form.vue';
import orderFee from './orderFee/index.vue';
import defaultInfo from './modules/default-info.vue';

type SectionKey = 'basic' | 'party' | 'shipment' | 'port' | 'cargo';
type FormSectionTabKey = 'basic' | 'party' | 'shipment' | 'port';
type TabKey =
  | FormSectionTabKey
  | 'fee'
  | 'billInfo'
  | 'issueRecord'
  | 'changeHistory';
type FormExpose = { scrollToSection: (key: SectionKey) => void };
const formRef = ref<FormExpose | null>(null);
const activeTab = ref<TabKey>('basic');
const tabs: Array<{ key: TabKey; label: string; sectionKey?: SectionKey }> = [
  { key: 'basic', label: '基础信息', sectionKey: 'basic' },
  { key: 'party', label: '更改单', sectionKey: 'party' },
  { key: 'shipment', label: '服务详情', sectionKey: 'shipment' },
  { key: 'port', label: '单证信息', sectionKey: 'port' },
  { key: 'fee', label: '应收应付' },
  { key: 'billInfo', label: '单据信息' },
  { key: 'issueRecord', label: '问题记录' },
  { key: 'changeHistory', label: '修改历史' },
];

const onTabClick = (tab: { key: TabKey; sectionKey?: SectionKey }) => {
  activeTab.value = tab.key;
  if (!tab.sectionKey) return;
  nextTick(() => {
    formRef.value?.scrollToSection(tab.sectionKey);
  });
};

const onSectionChange = (sectionKey: SectionKey) => {
  if (sectionKey === 'cargo') return;
  activeTab.value = sectionKey;
};

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
        <defaultInfo v-if="activeTab === 'fee'" />
        <div class="flex min-w-0 flex-1 flex-col">
          <orderFee v-if="activeTab === 'fee'" />
          <Form
            v-else
            ref="formRef"
            embedded
            @section-change="onSectionChange"
          />
        </div>
      </div>
    </div>
  </Page>
</template>
