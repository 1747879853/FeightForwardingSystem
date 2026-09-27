<script setup lang="ts">
import { Popover } from 'ant-design-vue';

defineProps<{
  focus: 'receivable' | 'received' | 'unReceived';
  lines: {
    code: string;
    name: string;
    receivable: number;
    received: number;
    unReceived: number;
  }[];
  title: string;
}>();

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
</script>

<template>
  <Popover
    trigger="hover"
    placement="top"
    :mouse-enter-delay="0.2"
    overlay-class-name="origin-money-popover"
  >
    <template #content>
      <div class="origin-panel">
        <div class="origin-title">{{ title }}</div>
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
    </template>
    <slot></slot>
  </Popover>
</template>

<style>
.origin-money-popover .ant-popover-inner {
  padding: 0;
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
