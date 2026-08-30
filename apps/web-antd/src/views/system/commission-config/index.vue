<script lang="ts" setup>
import { ref } from 'vue';

import { Page } from '@vben/common-ui';

import { TabPane, Tabs } from 'ant-design-vue';

import { CommissionConfigAdminApi } from '#/api/commission/commission-config-admin';
import { $t } from '#/locales';

import ConfigList from './config-list.vue';

defineOptions({ name: 'SystemCommissionConfig' });

const activeTab = ref<'operation' | 'sales'>('sales');
</script>

<template>
  <Page auto-content-height>
    <Tabs v-model:activeKey="activeTab" class="config-tabs h-full">
      <TabPane key="sales" :tab="$t('commissionOrder.menu.salesCommission')">
        <ConfigList
          :commission-type="CommissionConfigAdminApi.CommissionType.Sales"
        />
      </TabPane>
      <TabPane
        key="operation"
        :tab="$t('commissionOrder.menu.operationCommission')"
      >
        <ConfigList
          :commission-type="CommissionConfigAdminApi.CommissionType.Operation"
        />
      </TabPane>
    </Tabs>
  </Page>
</template>

<style lang="less" scoped>
.config-tabs {
  display: flex;
  flex-direction: column;

  // 页签栏：胶囊式样式，去掉默认下划线与分隔线
  :deep(.ant-tabs-nav) {
    flex: none;
    margin: 0 0 12px;

    &::before {
      border-bottom: none;
    }
  }

  :deep(.ant-tabs-nav-list) {
    gap: 8px;
  }

  :deep(.ant-tabs-tab) {
    padding: 5px 18px;
    border-radius: 6px;
    background: #f5f5f5;
    transition:
      background-color 0.2s,
      color 0.2s;

    .ant-tabs-tab-btn {
      color: #595959;
    }

    &:hover .ant-tabs-tab-btn {
      color: #1677ff;
    }
  }

  :deep(.ant-tabs-tab-active) {
    background: #1677ff;

    .ant-tabs-tab-btn,
    &:hover .ant-tabs-tab-btn {
      color: #fff;
    }
  }

  :deep(.ant-tabs-ink-bar) {
    display: none;
  }

  // 内容区：flex 链吃满剩余高度，供内部 vxe 表格 height: 'auto' 填充
  :deep(.ant-tabs-content-holder) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  :deep(.ant-tabs-content) {
    height: 100%;
  }

  :deep(.ant-tabs-tabpane) {
    height: 100%;
  }
}
</style>
