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
}

defineProps<Props>();

const STATE_VISUALS: Record<
  TrackingTimelineState,
  { color: string; icon: string }
> = {
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
  <Timeline v-else class="track-timeline track-timeline--horizontal">
    <TimelineItem
      v-for="node in nodes"
      :key="node.key"
      :color="STATE_VISUALS[node.state].color"
    >
      <template #dot>
        <div
          class="track-timeline-dot"
          :class="`track-timeline-dot--${node.state}`"
          :style="{ backgroundColor: STATE_VISUALS[node.state].color }"
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
        <div v-if="node.time" class="track-timeline-card__time">
          {{ node.time }}
        </div>
      </div>
    </TimelineItem>
  </Timeline>
</template>

<style scoped lang="scss">
/* 横向时间轴：圆点居中、节点卡片等宽、超出横向滚动 */
.track-timeline--horizontal {
  display: flex;
  flex-flow: row nowrap;
  padding: 16px 4px 8px;
  margin: 0;
  overflow-x: auto;

  :deep(.ant-timeline-item) {
    position: relative;
    flex: 1 0 168px;
    min-width: 168px;
    max-width: 220px;
    padding-bottom: 0 !important;
    margin: 0;
  }

  :deep(.ant-timeline-item-tail) {
    position: absolute;
    inset-block-start: 12px;
    inset-inline-start: calc(50% + 14px);
    width: calc(100% - 28px);
    height: 0;
    border: none;
    border-top: 1.5px solid rgb(60 60 67 / 12%);
    transform: none;
  }

  :deep(.ant-timeline-item:last-child .ant-timeline-item-tail) {
    display: none;
  }

  :deep(.ant-timeline-item-head),
  :deep(.ant-timeline-item-head-custom) {
    position: relative;
    inset: auto;
    width: fit-content;
    padding: 0;
    margin: 0 auto 10px;
    background: transparent;
    border: none;
    transform: none;
  }

  :deep(.ant-timeline-item-content) {
    position: relative;
    inset: auto;
    min-height: 0;
    padding: 0 6px;
    margin: 0 !important;
    margin-inline-start: 0 !important;
    text-align: center;
  }
}

.track-timeline-dot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: #fff;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgb(0 0 0 / 12%);
}

.track-timeline-dot--current {
  box-shadow:
    0 0 0 5px rgb(0 122 255 / 14%),
    0 1px 3px rgb(0 122 255 / 30%);
}

.track-timeline-dot__icon {
  font-size: 13px;
}

.track-timeline-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  margin-bottom: 3px;
}

.track-timeline-card__title {
  font-size: 13px;
  font-weight: 590;
  line-height: 1.35;
  color: rgb(0 0 0 / 88%);
  letter-spacing: -0.01em;
}

.track-timeline-card__pill {
  flex-shrink: 0;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 510;
  line-height: 1.6;
  color: #8e8e93;
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
  font-size: 13px;
  line-height: 1.5;
  color: rgb(60 60 67 / 60%);
}

.track-timeline-card__containers {
  margin-bottom: 1px;
  font-size: 12px;
  line-height: 1.5;
  color: rgb(60 60 67 / 45%);
  word-break: break-all;
}

.track-timeline-card__time {
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  line-height: 1.5;
  color: rgb(60 60 67 / 45%);
}
</style>
