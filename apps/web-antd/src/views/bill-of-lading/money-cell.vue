<script setup lang="ts">
import type { OriginLine } from '#/views/audit-approval/bill-of-lading-review/origin-summary';

import { ref, watch } from 'vue';

import OriginMoneyTip from '#/views/audit-approval/bill-of-lading-review/origin-money-tip.vue';

import { formatLocalMoney } from './money';

const props = defineProps<{
  code?: null | string;
  lines?: OriginLine[];
  load?: () => Promise<{ code?: null | string; lines: OriginLine[] }>;
  value?: null | number;
}>();

const resolvedLines = ref<OriginLine[]>(props.lines ?? []);
const resolvedCode = ref(props.code);
const loading = ref(false);
const failed = ref(false);
let request = 0;

watch(
  () => props.lines,
  (lines) => {
    if (lines?.length) resolvedLines.value = lines;
  },
);

watch(
  () => props.code,
  (code) => {
    if (code) resolvedCode.value = code;
  },
);

function ensure() {
  if (resolvedLines.value.length || !props.load || loading.value) return;
  const token = ++request;
  failed.value = false;
  loading.value = true;
  props
    .load()
    .then((result) => {
      if (token !== request) return;
      resolvedLines.value = result.lines;
      if (result.code) resolvedCode.value = result.code;
    })
    .catch(() => {
      if (token === request) failed.value = true;
    })
    .finally(() => {
      if (token === request) loading.value = false;
    });
}
</script>

<template>
  <OriginMoneyTip
    :lines="resolvedLines"
    :loading="loading"
    :failed="failed"
    focus="unReceived"
    title="折算前原币"
  >
    <span
      class="local-money"
      :class="{ 'is-tip': resolvedLines.length || !!load }"
      @mouseenter="ensure"
      >{{ formatLocalMoney(value, resolvedCode) }}</span
    >
  </OriginMoneyTip>
</template>

<style scoped>
.local-money {
  font-variant-numeric: tabular-nums;
}

.local-money.is-tip {
  display: inline-block;
  width: fit-content;
  max-width: 100%;
  border-bottom: 1px dotted currentcolor;
}
</style>
