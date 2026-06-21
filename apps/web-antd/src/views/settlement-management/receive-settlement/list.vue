<script lang="ts" setup>
import { ref } from 'vue';
import { useRoute } from 'vue-router';

import { Page } from '@vben/common-ui';

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
</script>

<template>
  <Page auto-content-height>
    <ReceiveSettlementGrid
      v-if="activeTab === 'receive-settlement'"
      v-model:active-tab="activeTab"
    />
    <BankStatementGrid v-else v-model:active-tab="activeTab" />
  </Page>
</template>
