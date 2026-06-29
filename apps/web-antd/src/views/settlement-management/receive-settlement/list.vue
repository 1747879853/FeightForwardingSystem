<script lang="ts" setup>
import { onActivated, ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

import { consumeListShouldRefresh } from '#/utils/list-refresh-flag';

import BankStatementGrid from './bank-statement-grid.vue';
import type { ListTabKey } from './list-title-tabs.vue';
import ReceiveSettlementGrid from './receive-settlement-grid.vue';

const route = useRoute();

function resolveInitialTab(): ListTabKey {
  const tab = route.query.tab;
  const value = Array.isArray(tab) ? tab[0] : tab;
  return value === 'bank-statement' ? 'bank-statement' : 'receive-settlement';
}

const activeTab = ref<ListTabKey>(resolveInitialTab());
const receiveSettlementGridRef =
  ref<InstanceType<typeof ReceiveSettlementGrid>>();
const bankStatementGridRef = ref<InstanceType<typeof BankStatementGrid>>();

function refreshGridsOnFormReturn() {
  const shouldRefreshReceiveSettlement = consumeListShouldRefresh(
    'ReceiveSettlementList',
  );
  const shouldRefreshBankStatement =
    consumeListShouldRefresh('BankStatementList');

  if (shouldRefreshReceiveSettlement) {
    receiveSettlementGridRef.value?.refresh();
  }
  if (shouldRefreshBankStatement) {
    bankStatementGridRef.value?.refresh();
  }
}

onActivated(() => {
  refreshGridsOnFormReturn();
});
</script>

<template>
  <Page auto-content-height>
    <ReceiveSettlementGrid
      v-if="activeTab === 'receive-settlement'"
      ref="receiveSettlementGridRef"
      v-model:active-tab="activeTab"
    />
    <BankStatementGrid
      v-else
      ref="bankStatementGridRef"
      v-model:active-tab="activeTab"
    />
  </Page>
</template>
