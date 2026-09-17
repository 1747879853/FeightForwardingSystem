<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

import { Empty, Timeline, TimelineItem } from 'ant-design-vue';

import { $t } from '#/locales';

import type {
  TrackingTimelineNode,
  TrackingTimelineState,
} from './timeline-nodes';

/**
 * 运踪轨迹时间轴（海运箱物流节点 / 空运事件共用）。
 *
 * 视觉与现有运踪的横向时间轴保持一致：实际节点绿色对勾、预计节点橙色时钟、
 * 当前节点蓝色高亮；时间一律展示服务商原样字符串，不做时区换算。
 */
interface Props {
  nodes: TrackingTimelineNode[];
  layout?: 'horizontal' | 'vertical';
}

withDefaults(defineProps<Props>(), { layout: 'horizontal' });

const STATE_VISUALS: Record<
  TrackingTimelineState,
  { color: string; icon: string }
> = {
  unknown: { color: '#8c8c8c', icon: 'ph:question' },
  completed: { color: '#34c759', icon: 'ph:check-bold' },
  current: { color: '#007aff', icon: 'ph:map-pin-fill' },
  estimated: { color: '#ff9500', icon: 'ph:clock' },
};
</script>

<template>
  <Empty
    v-if="nodes.length === 0"
    :description="$t('tracking.timeline.empty')"
    :image="Empty.PRESENTED_IMAGE_SIMPLE"
  />
  <Timeline v-else :class="['track-timeline', `track-timeline--${layout}`]">
    <TimelineItem
      v-for="node in nodes"
      :key="node.key"
      :color="STATE_VISUALS[node.state].color"
    >
      <template #dot>
        <div
          class="track-timeline-dot"
          :class="`track-timeline-dot--${node.state}`"
        >
          <IconifyIcon
            :icon="STATE_VISUALS[node.state].icon"
            class="track-timeline-dot__icon"
          />
        </div>
      </template>
      <div class="track-timeline-card">
        <div class="track-timeline-card__header">
          <span class="track-timeline-card__title">{{ node.title }}</span>
          <span
            class="track-timeline-card__pill"
            :class="`track-timeline-card__pill--${node.state}`"
          >
            {{ node.stateLabel }}
          </span>
        </div>
        <div v-if="node.place" class="track-timeline-card__place">
          {{ node.place }}
        </div>
        <div v-if="node.vehicle" class="track-timeline-card__place">
          {{ node.vehicle }}
        </div>
        <div
          v-if="node.containerNos?.length"
          class="track-timeline-card__containers"
        >
          {{ node.containerNos.join('、') }}
        </div>
        <div class="track-timeline-card__time">
          {{ node.time || $t('tracking.timeline.timeMissing') }}
        </div>
      </div>
    </TimelineItem>
  </Timeline>
</template>

<style scoped lang="scss">
@keyframes track-current-pulse {
  0%,
  100% {
    box-shadow: 0 0 0 4px rgb(0 122 255 / 16%);
  }

  50% {
    box-shadow: 0 0 0 7px rgb(0 122 255 / 7%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .track-timeline--horizontal .track-timeline-dot--current {
    animation: none;
  }
}

/* 横向时间轴：细线小圆点、节点等宽、超出横向滚动 */
.track-timeline--horizontal {
  display: flex;
  flex-flow: row nowrap;
  padding: 16px 8px 12px;
  margin: 0;
  overflow-x: auto;
  -webkit-font-smoothing: antialiased;
  scrollbar-color: rgb(60 60 67 / 22%) transparent;
  scrollbar-width: thin;

  :deep(.ant-timeline-item) {
    position: relative;
    flex: 1 0 132px;
    min-width: 132px;
    max-width: 188px;
    padding-bottom: 0 !important;
    margin: 0;
  }

  :deep(.ant-timeline-item-tail) {
    position: absolute;
    inset-block-start: 10px;
    inset-inline-start: calc(50% + 10px);
    width: calc(100% - 20px);
    height: 0;
    border: none;
    border-top: 0.5px solid rgb(60 60 67 / 16%);
    transform: none;
  }

  :deep(
    .ant-timeline-item:has(.track-timeline-dot--completed)
      .ant-timeline-item-tail
  ) {
    border-top-color: rgb(52 199 89 / 42%);
  }

  :deep(
    .ant-timeline-item:has(.track-timeline-dot--current) .ant-timeline-item-tail
  ) {
    border-top-color: rgb(60 60 67 / 16%);
    border-top-style: dashed;
  }

  :deep(.ant-timeline-item:last-child .ant-timeline-item-tail) {
    display: none;
  }

  :deep(.ant-timeline-item-head),
  :deep(.ant-timeline-item-head-custom) {
    position: relative;
    inset: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    margin: 0 auto 8px;
    background: transparent;
    border: none;
    transform: none;
  }

  :deep(.ant-timeline-item-content) {
    position: relative;
    inset: auto;
    min-height: 0;
    padding: 0 4px;
    margin: 0 !important;
    margin-inline-start: 0 !important;
    text-align: center;
  }

  .track-timeline-dot {
    width: 9px;
    height: 9px;
    box-shadow: 0 0 0 3px rgb(52 199 89 / 12%);
  }

  .track-timeline-dot--current {
    width: 11px;
    height: 11px;
    box-shadow: 0 0 0 4px rgb(0 122 255 / 16%);
    animation: track-current-pulse 2.4s ease-in-out infinite;
  }

  .track-timeline-dot--estimated {
    background: #fff;
    box-shadow: inset 0 0 0 1.5px #ff9500;
  }

  .track-timeline-dot--unknown {
    background: #d1d1d6;
    box-shadow: none;
  }

  .track-timeline-dot__icon {
    display: none;
  }

  .track-timeline-card__pill,
  .track-timeline-card__pill--current,
  .track-timeline-card__pill--completed,
  .track-timeline-card__pill--estimated {
    padding: 0;
    background: transparent;
    border-radius: 0;
  }
}

.track-timeline-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #fff;
  background: #8e8e93;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
}

.track-timeline-dot--completed {
  background: #34c759;
}

.track-timeline-dot--current {
  background: #007aff;
  box-shadow:
    0 0 0 5px rgb(0 122 255 / 14%),
    0 1px 3px rgb(0 122 255 / 30%);
}

.track-timeline-dot--estimated {
  background: #ff9500;
}

.track-timeline-dot__icon {
  font-size: 13px;
}

.track-timeline-card__header {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  margin-bottom: 4px;
}

.track-timeline-card__title {
  font-size: 13px;
  font-weight: 590;
  line-height: 1.3;
  color: rgb(0 0 0 / 88%);
  letter-spacing: -0.02em;
}

.track-timeline-card__pill {
  flex-shrink: 0;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 510;
  line-height: 1.45;
  color: #8e8e93;
  letter-spacing: -0.01em;
  background: rgb(120 120 128 / 12%);
  border-radius: 100px;
}

.track-timeline-card__pill--current {
  color: #007aff;
  background: rgb(0 122 255 / 12%);
}

.track-timeline-card__pill--completed {
  color: #34c759;
  background: rgb(52 199 89 / 14%);
}

.track-timeline-card__pill--estimated {
  color: #ff9500;
  background: rgb(255 149 0 / 14%);
}

.track-timeline-card__place {
  margin-bottom: 1px;
  font-size: 12px;
  line-height: 1.4;
  color: rgb(60 60 67 / 52%);
}

.track-timeline-card__containers {
  margin-bottom: 1px;
  font-size: 11px;
  line-height: 1.4;
  color: rgb(60 60 67 / 40%);
  word-break: break-all;
}

.track-timeline-card__time {
  margin-top: 4px;
  font-size: 12px;
  font-weight: 510;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
  color: rgb(60 60 67 / 58%);
  letter-spacing: -0.01em;
}

.track-timeline--vertical {
  padding: 16px 18px 4px;
  color: hsl(var(--foreground));

  @media (max-width: 640px) {
    padding: 14px 12px 4px;

    .track-timeline-card {
      grid-template-columns: minmax(0, 1fr);
    }

    .track-timeline-card__time {
      grid-row: auto;
      grid-column: 1;
      margin-top: 4px;
    }
  }

  :deep(.ant-timeline-item-content) {
    padding-bottom: 20px;
    margin-left: 32px;
  }

  :deep(.ant-timeline-item-tail) {
    border-inline-start-color: hsl(var(--border));
  }

  .track-timeline-dot {
    width: 20px;
    height: 20px;
    box-shadow: none;
  }

  .track-timeline-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    column-gap: 20px;
  }

  .track-timeline-card__header {
    flex-direction: row;
    grid-column: 1;
    gap: 10px;
    justify-content: flex-start;
  }

  .track-timeline-card__title {
    font-weight: 600;
    color: hsl(var(--foreground));
  }

  .track-timeline-card__place {
    grid-column: 1;
    color: hsl(var(--muted-foreground));
    overflow-wrap: anywhere;
  }

  .track-timeline-card__time {
    grid-row: 1;
    grid-column: 2;
    color: hsl(var(--muted-foreground));
    white-space: nowrap;
  }

  .track-timeline-card__pill {
    border-radius: 4px;
  }

  .track-timeline-card__pill--unknown {
    color: hsl(var(--muted-foreground));
  }
}
</style>
