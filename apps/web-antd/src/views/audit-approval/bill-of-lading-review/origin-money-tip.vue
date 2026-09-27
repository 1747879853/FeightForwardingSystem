<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
  failed?: boolean;
  focus: 'receivable' | 'received' | 'unReceived';
  lines: {
    code: string;
    name: string;
    receivable: number;
    received: number;
    unReceived: number;
  }[];
  loading?: boolean;
  title: string;
}>();

const open = ref(false);
const anchor = ref<HTMLElement>();
const panel = ref<HTMLElement>();
const panelStyle = ref<Record<string, string>>({
  position: 'fixed',
  zIndex: '2100',
});
let closeTimer = 0;

const metrics = [
  { key: 'receivable', label: '应收' },
  { key: 'received', label: '已收' },
  { key: 'unReceived', label: '未收' },
] as const;

function formatOrigin(value: number) {
  return Number(value).toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function place() {
  const el = anchor.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const width = panel.value?.offsetWidth || 280;
  const height = panel.value?.offsetHeight || 120;
  const gap = 8;
  let left = rect.left;
  const maxLeft = window.innerWidth - width - 8;
  left = Math.min(Math.max(8, left), Math.max(8, maxLeft));
  const showAbove = rect.top - gap - height > 8;
  panelStyle.value = {
    position: 'fixed',
    left: `${Math.round(left)}px`,
    top: `${Math.round(showAbove ? rect.top - gap - height : rect.bottom + gap)}px`,
    zIndex: '2100',
  };
}

function show() {
  window.clearTimeout(closeTimer);
  open.value = true;
  nextTick(() => {
    place();
    requestAnimationFrame(place);
  });
}

function hide() {
  window.clearTimeout(closeTimer);
  closeTimer = window.setTimeout(() => {
    open.value = false;
  }, 120);
}

function onViewportChange() {
  if (open.value) place();
}

watch(
  () => [open.value, props.loading, props.failed, props.lines.length],
  () => {
    if (open.value) nextTick(place);
  },
);

onMounted(() => {
  window.addEventListener('resize', onViewportChange);
  window.addEventListener('scroll', onViewportChange, true);
});

onBeforeUnmount(() => {
  window.clearTimeout(closeTimer);
  window.removeEventListener('resize', onViewportChange);
  window.removeEventListener('scroll', onViewportChange, true);
});
</script>

<template>
  <span
    ref="anchor"
    class="origin-money-anchor"
    @mouseenter="show"
    @mouseleave="hide"
  >
    <slot></slot>
  </span>
  <Teleport to="body">
    <div
      v-if="open"
      ref="panel"
      class="origin-money-popover"
      :style="panelStyle"
      @mouseenter="show"
      @mouseleave="hide"
    >
      <div class="origin-panel">
        <div class="origin-title">{{ title }}</div>
        <div v-if="failed" class="origin-empty">原币明细没有读到</div>
        <div v-else-if="!lines.length" class="origin-empty">
          {{ loading ? '正在读取原币' : '没有原币明细' }}
        </div>
        <div v-for="line in lines" :key="line.code" class="origin-line">
          <div class="origin-line__head">
            <span class="origin-line__code">{{ line.code }}</span>
            <span v-if="line.name" class="origin-line__name">{{
              line.name
            }}</span>
          </div>
          <div class="origin-metrics">
            <div
              v-for="metric in metrics"
              :key="metric.key"
              class="origin-metric"
              :class="{ 'is-focus': metric.key === focus }"
            >
              <span class="origin-metric__label">{{ metric.label }}</span>
              <span class="origin-metric__value">{{
                formatOrigin(line[metric.key])
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style>
.origin-money-anchor {
  display: inline-block;
  max-width: 100%;
  vertical-align: bottom;
  cursor: default;
}

.origin-money-popover {
  position: fixed;
  z-index: 2100;
  background: #fff;
  border-radius: 8px;
  box-shadow:
    0 6px 16px rgb(0 0 0 / 8%),
    0 3px 6px rgb(0 0 0 / 12%);
}

.origin-money-popover .origin-panel {
  min-width: 280px;
  padding: 12px 14px 10px;
}

.origin-money-popover .origin-title {
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 600;
  line-height: 18px;
  color: #8a919f;
}

.origin-money-popover .origin-line + .origin-line {
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid #f0f1f3;
}

.origin-money-popover .origin-empty {
  padding: 4px 0 2px;
  font-size: 12px;
  line-height: 18px;
  color: #8a919f;
}

.origin-money-popover .origin-line__head {
  display: flex;
  gap: 8px;
  align-items: baseline;
  margin-bottom: 8px;
}

.origin-money-popover .origin-line__code {
  font-size: 14px;
  font-weight: 700;
  line-height: 20px;
  color: #1f2329;
}

.origin-money-popover .origin-line__name {
  font-size: 12px;
  line-height: 18px;
  color: #8a919f;
}

.origin-money-popover .origin-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(72px, 1fr));
  gap: 6px;
}

.origin-money-popover .origin-metric {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 6px;
}

.origin-money-popover .origin-metric.is-focus {
  background: #f0f5ff;
}

.origin-money-popover .origin-metric__label {
  font-size: 12px;
  line-height: 16px;
  color: #8a919f;
}

.origin-money-popover .origin-metric.is-focus .origin-metric__label {
  color: #1677ff;
}

.origin-money-popover .origin-metric__value {
  font-family:
    'Roboto Mono', 'DIN Alternate', ui-monospace, SFMono-Regular, Menlo,
    Consolas, monospace;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 20px;
  color: #1f2329;
}

.origin-money-popover .origin-metric.is-focus .origin-metric__value {
  color: #1d39c4;
}
</style>
