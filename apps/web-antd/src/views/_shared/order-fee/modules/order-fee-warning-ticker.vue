<script lang="ts" setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import { IconifyIcon } from '@vben/icons';
import { Tooltip } from 'ant-design-vue';

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
  <div v-if="list.length > 0" class="order-fee-warning-ticker">
    <Tooltip
      placement="bottomLeft"
      :mouse-enter-delay="0.08"
      :mouse-leave-delay="0.08"
      overlay-class-name="order-fee-warning-ticker-overlay"
    >
      <template #title>
        <div class="order-fee-warning-panel">
          <div class="order-fee-warning-panel__head">
            <span class="order-fee-warning-panel__head-icon">
              <IconifyIcon icon="mdi:alert-circle-outline" />
            </span>
            <span class="order-fee-warning-panel__head-title">费用预警</span>
            <span class="order-fee-warning-panel__head-count"
              >共 {{ list.length }} 条</span
            >
          </div>
          <ul class="order-fee-warning-panel__list">
            <li
              v-for="(msg, i) in list"
              :key="`${i}-${msg}`"
              class="order-fee-warning-panel__item"
            >
              <span class="order-fee-warning-panel__index">{{ i + 1 }}</span>
              <span class="order-fee-warning-panel__text">{{ msg }}</span>
            </li>
          </ul>
        </div>
      </template>
      <span
        class="order-fee-warning-ticker__icon-wrap"
        aria-label="查看全部预警"
      >
        <IconifyIcon
          icon="mdi:alert-circle-outline"
          class="order-fee-warning-ticker__icon"
        />
      </span>
    </Tooltip>
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
  color: #b91c1c;
  background: #fff1f0;
  border: 1px solid #ffccc7;
  border-radius: 4px;
}

.order-fee-warning-ticker__icon-wrap {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  cursor: help;
}

.order-fee-warning-ticker__icon {
  font-size: 14px;
  color: #f5222d;
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
  color: #cf1322;
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

<!-- Tooltip 挂到 body，面板样式需非 scoped -->
<style>
.order-fee-warning-ticker-overlay.ant-tooltip {
  max-width: none;
}

.order-fee-warning-ticker-overlay .ant-tooltip-inner {
  min-width: 280px;
  max-width: 400px;
  padding: 0;
  color: #252a31;
  background: #fff;
  border: 1px solid #e8ecf3;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgb(15 23 42 / 10%);
}

.order-fee-warning-ticker-overlay .ant-tooltip-arrow::before {
  background: #fff;
  border: 1px solid #e8ecf3;
}

.order-fee-warning-panel__head {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 10px 14px;
  background: linear-gradient(90deg, #fff1f0 0%, #fff 70%);
  border-bottom: 1px solid #ffe1e0;
  border-radius: 10px 10px 0 0;
}

.order-fee-warning-panel__head-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  font-size: 14px;
  color: #f5222d;
  background: #fff1f0;
  border-radius: 6px;
}

.order-fee-warning-panel__head-title {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  line-height: 22px;
  color: #252a31;
}

.order-fee-warning-panel__head-count {
  padding: 0 8px;
  font-size: 12px;
  line-height: 20px;
  color: #cf1322;
  background: #fff1f0;
  border-radius: 999px;
}

.order-fee-warning-panel__list {
  display: flex;
  flex-direction: column;
  gap: 0;
  max-height: 260px;
  padding: 8px 10px 10px;
  margin: 0;
  overflow: auto;
  list-style: none;
}

.order-fee-warning-panel__item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: 6px;
}

.order-fee-warning-panel__item + .order-fee-warning-panel__item {
  margin-top: 2px;
}

.order-fee-warning-panel__item:hover {
  background: #fff7f6;
}

.order-fee-warning-panel__index {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  color: #cf1322;
  background: #fff1f0;
  border-radius: 4px;
}

.order-fee-warning-panel__text {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  line-height: 20px;
  color: #475569;
  word-break: normal;
  overflow-wrap: anywhere;
  white-space: normal;
}
</style>
