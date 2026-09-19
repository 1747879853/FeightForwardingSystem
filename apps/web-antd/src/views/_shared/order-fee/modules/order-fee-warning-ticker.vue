<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';

const props = withDefaults(
  defineProps<{
    /** 预警文案列表；为空不渲染 */
    messages?: string[];
    /** 单条停留毫秒 */
    intervalMs?: number;
  }>(),
  {
    messages: () => [],
    intervalMs: 3200,
  },
);

const index = ref(0);
let timer: null | ReturnType<typeof setInterval> = null;

const list = computed(() =>
  (props.messages ?? []).map((m) => String(m).trim()).filter(Boolean),
);

const current = computed(() => list.value[index.value] ?? '');

function clearTimer() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

function startTimer() {
  clearTimer();
  if (list.value.length <= 1) return;
  timer = setInterval(() => {
    index.value = (index.value + 1) % list.value.length;
  }, props.intervalMs);
}

watch(
  list,
  (next) => {
    index.value = 0;
    if (next.length > 1) startTimer();
    else clearTimer();
  },
  { immediate: true },
);

onBeforeUnmount(clearTimer);
</script>

<template>
  <div
    v-if="list.length > 0"
    class="order-fee-warning-ticker"
    :title="list.join('\n')"
  >
    <IconifyIcon
      icon="mdi:alert-circle-outline"
      class="order-fee-warning-ticker__icon"
    />
    <div class="order-fee-warning-ticker__viewport">
      <Transition name="order-fee-warning-fade" mode="out-in">
        <span
          :key="`${index}-${current}`"
          class="order-fee-warning-ticker__text"
        >
          {{ current }}
        </span>
      </Transition>
    </div>
    <span v-if="list.length > 1" class="order-fee-warning-ticker__count">
      {{ index + 1 }}/{{ list.length }}
    </span>
  </div>
</template>

<style scoped>
.order-fee-warning-ticker {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  min-width: 0;
  max-width: min(420px, 46vw);
  height: 22px;
  padding: 0 8px;
  margin-left: 10px;
  overflow: hidden;
  font-size: 12px;
  line-height: 22px;
  color: #b45309;
  background: hsl(38deg 100% 96%);
  border: 1px solid hsl(38deg 90% 82%);
  border-radius: 4px;
}

.order-fee-warning-ticker__icon {
  flex-shrink: 0;
  font-size: 14px;
  color: #d97706;
}

.order-fee-warning-ticker__viewport {
  position: relative;
  flex: 1;
  min-width: 0;
  height: 22px;
  overflow: hidden;
}

.order-fee-warning-ticker__text {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-fee-warning-ticker__count {
  flex-shrink: 0;
  font-size: 11px;
  color: #a16207;
  opacity: 0.85;
}

.order-fee-warning-fade-enter-active,
.order-fee-warning-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.order-fee-warning-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.order-fee-warning-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
