<script setup lang="ts">
import type { SeaExportBusinessStatusState } from '../data';

defineProps<{
  text: string;
  state: SeaExportBusinessStatusState;
  colors: { color: string; background: string };
}>();
</script>

<template>
  <span v-if="text === '-'" class="text-gray-400">-</span>
  <span
    v-else
    class="business-status inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs leading-5"
    :style="{ color: colors.color, backgroundColor: colors.background }"
  >
    <span v-if="state === 'active'" class="business-status__pending">待</span>
    {{ text }}
  </span>
</template>

<style scoped>
.business-status {
  transition:
    filter 0.15s ease,
    box-shadow 0.15s ease;
}

.business-status:hover {
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 8%);
  filter: brightness(0.98);
}

.business-status__pending {
  box-sizing: border-box;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 3px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1;
  color: #fff;
  background: #d97706;
  border-radius: 3px;
}
</style>
