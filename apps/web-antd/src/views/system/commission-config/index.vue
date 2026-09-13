<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';
import { InspectionPanel, Settings } from '@vben/icons';

import { TabPane, Tabs } from 'ant-design-vue';

import { CommissionConfigAdminApi } from '#/api/commission/commission-config-admin';
import { $t } from '#/locales';

import ConfigList from './config-list.vue';

defineOptions({ name: 'SystemCommissionConfig' });

const activeTab = ref<'operation' | 'sales'>('sales');
</script>

<template>
  <Page auto-content-height content-class="!p-3">
    <div class="cc-page">
      <Tabs v-model:active-key="activeTab" class="cc-page__tabs h-full">
        <TabPane key="sales">
          <template #tab>
            <span class="cc-tab-label">
              <InspectionPanel class="cc-tab-icon" />
              {{ $t('commissionOrder.menu.salesCommission') }}
            </span>
          </template>
          <ConfigList
            :commission-type="CommissionConfigAdminApi.CommissionType.Sales"
          />
        </TabPane>
        <TabPane key="operation">
          <template #tab>
            <span class="cc-tab-label">
              <Settings class="cc-tab-icon" />
              {{ $t('commissionOrder.menu.operationCommission') }}
            </span>
          </template>
          <ConfigList
            :commission-type="CommissionConfigAdminApi.CommissionType.Operation"
          />
        </TabPane>
      </Tabs>
    </div>
  </Page>
</template>

<style scoped>
.cc-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  padding: 12px;
  background: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  border-radius: 12px;
  box-shadow: 0 1px 2px rgb(0 0 0 / 3%);
}

.cc-page__tabs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.cc-page__tabs :deep(.ant-tabs-nav) {
  flex: none;
  margin: 0 0 12px;
}

.cc-page__tabs :deep(.ant-tabs-nav::before) {
  border-bottom: none;
}

.cc-page__tabs :deep(.ant-tabs-nav-list) {
  gap: 8px;
  padding: 4px;
  background: hsl(var(--primary) / 6%);
  border-radius: 10px;
}

.cc-page__tabs :deep(.ant-tabs-tab) {
  padding: 6px 16px;
  margin: 0 !important;
  background: transparent;
  border-radius: 8px;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.cc-page__tabs :deep(.ant-tabs-tab .ant-tabs-tab-btn) {
  color: hsl(var(--muted-foreground));
}

.cc-page__tabs :deep(.ant-tabs-tab:hover .ant-tabs-tab-btn) {
  color: hsl(var(--primary));
}

.cc-page__tabs :deep(.ant-tabs-tab-active) {
  background: hsl(var(--primary));
  box-shadow: 0 2px 8px hsl(var(--primary) / 25%);
}

.cc-page__tabs :deep(.ant-tabs-tab-active .ant-tabs-tab-btn),
.cc-page__tabs :deep(.ant-tabs-tab-active:hover .ant-tabs-tab-btn) {
  color: #fff;
}

.cc-page__tabs :deep(.ant-tabs-ink-bar) {
  display: none;
}

.cc-page__tabs :deep(.ant-tabs-content-holder) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.cc-page__tabs :deep(.ant-tabs-content),
.cc-page__tabs :deep(.ant-tabs-tabpane) {
  height: 100%;
}

.cc-tab-label {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-weight: 500;
}

.cc-tab-icon {
  width: 14px;
  height: 14px;
}
</style>
