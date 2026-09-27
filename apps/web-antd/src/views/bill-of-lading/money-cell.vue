<script setup lang="ts">
import OriginMoneyTip from '#/views/audit-approval/bill-of-lading-review/origin-money-tip.vue';

import { formatLocalMoney } from './money';

defineProps<{
  code?: null | string;
  lines?: {
    code: string;
    name: string;
    receivable: number;
    received: number;
    unReceived: number;
  }[];
  value?: null | number;
}>();
</script>

<template>
  <OriginMoneyTip
    v-if="lines?.length"
    :lines="lines"
    focus="unReceived"
    title="折算前原币"
  >
    <span class="local-money is-tip">{{ formatLocalMoney(value, code) }}</span>
  </OriginMoneyTip>
  <span v-else class="local-money">{{ formatLocalMoney(value, code) }}</span>
</template>

<style scoped>
.local-money {
  font-variant-numeric: tabular-nums;
}

.local-money.is-tip {
  cursor: help;
  border-bottom: 1px dotted currentcolor;
}
</style>
