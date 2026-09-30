<script lang="ts" setup>
import { IconifyIcon } from '@vben/icons';

import { onBeforeUnmount, onMounted, ref } from 'vue';

const SCROLL_DURATION = 320;
const EDGE_PADDING = 4;

const viewportRef = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);

let animationFrame = 0;
let resizeObserver: ResizeObserver | undefined;
let mutationObserver: MutationObserver | undefined;
let pinnedPendingKey = '';

const updateScrollState = () => {
  const el = viewportRef.value;
  if (!el) {
    canScrollLeft.value = false;
    canScrollRight.value = false;
    return;
  }
  const maxScroll = el.scrollWidth - el.clientWidth;
  canScrollLeft.value = el.scrollLeft > 1;
  canScrollRight.value = maxScroll - el.scrollLeft > 1;
};

/** 同一批待处理里最靠后的那个，就是当前最新待处理节点 */
const latestPendingBox = () => {
  const el = viewportRef.value;
  if (!el) return null;
  const nodes = el.querySelectorAll('.chevron-step--active');
  const target = nodes[nodes.length - 1] as HTMLElement | undefined;
  if (!target) return null;
  const viewRect = el.getBoundingClientRect();
  const nodeRect = target.getBoundingClientRect();
  const left = nodeRect.left - viewRect.left + el.scrollLeft;
  return { left, right: left + nodeRect.width, width: nodeRect.width };
};

const clampScrollLeft = (nextLeft: number) => {
  const el = viewportRef.value;
  if (!el) return nextLeft;
  const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
  return Math.min(Math.max(0, nextLeft), maxScroll);
};

const animateScrollTo = (targetLeft: number) => {
  const el = viewportRef.value;
  if (!el) return;
  const to = clampScrollLeft(targetLeft);
  const from = el.scrollLeft;
  cancelAnimationFrame(animationFrame);
  if (Math.abs(to - from) < 1) {
    el.scrollLeft = to;
    updateScrollState();
    return;
  }
  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min(1, (now - start) / SCROLL_DURATION);
    const eased = 1 - (1 - progress) ** 3;
    el.scrollLeft = from + (to - from) * eased;
    if (progress < 1) {
      animationFrame = requestAnimationFrame(step);
      return;
    }
    updateScrollState();
  };
  animationFrame = requestAnimationFrame(step);
};

/** 把最新待处理节点靠到可视区右侧，前面已完成的节点留在左边 */
const revealLatestPending = () => {
  const el = viewportRef.value;
  const box = latestPendingBox();
  if (!el || !box) return;
  animateScrollTo(box.right - el.clientWidth + EDGE_PADDING);
};

const scrollByDirection = (direction: -1 | 1) => {
  const el = viewportRef.value;
  if (!el) return;
  const distance = Math.max(120, Math.round(el.clientWidth * 0.7));
  animateScrollTo(el.scrollLeft + direction * distance);
};

const pendingKey = () => {
  const el = viewportRef.value;
  if (!el) return '';
  const nodes = el.querySelectorAll('.chevron-step--active');
  const last = nodes[nodes.length - 1];
  return last ? `${nodes.length}:${last.textContent ?? ''}` : '';
};

const syncPendingPosition = () => {
  const key = pendingKey();
  if (key !== pinnedPendingKey) {
    pinnedPendingKey = key;
    revealLatestPending();
  }
  updateScrollState();
};

onMounted(() => {
  const el = viewportRef.value;
  if (!el) return;
  resizeObserver = new ResizeObserver(syncPendingPosition);
  resizeObserver.observe(el);
  const content = el.firstElementChild;
  if (content) resizeObserver.observe(content);
  mutationObserver = new MutationObserver(syncPendingPosition);
  mutationObserver.observe(el, {
    attributeFilter: ['class'],
    attributes: true,
    childList: true,
    subtree: true,
  });
  requestAnimationFrame(syncPendingPosition);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(animationFrame);
  resizeObserver?.disconnect();
  mutationObserver?.disconnect();
});
</script>

<template>
  <div class="service-chevron-scroller">
    <button
      v-show="canScrollLeft || canScrollRight"
      type="button"
      class="service-chevron-scroller__arrow"
      :disabled="!canScrollLeft"
      aria-label="向左滚动"
      @click="scrollByDirection(-1)"
    >
      <IconifyIcon icon="mdi:chevron-left" />
    </button>
    <div
      ref="viewportRef"
      class="service-chevron-scroller__viewport"
      @scroll="updateScrollState"
    >
      <slot></slot>
    </div>
    <button
      v-show="canScrollLeft || canScrollRight"
      type="button"
      class="service-chevron-scroller__arrow"
      :disabled="!canScrollRight"
      aria-label="向右滚动"
      @click="scrollByDirection(1)"
    >
      <IconifyIcon icon="mdi:chevron-right" />
    </button>
  </div>
</template>

<style scoped>
.service-chevron-scroller {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
}

.service-chevron-scroller__viewport {
  flex: 1;
  min-width: 0;
  overflow: auto hidden;
  scrollbar-width: none;
}

.service-chevron-scroller__viewport::-webkit-scrollbar {
  display: none;
}

.service-chevron-scroller__arrow {
  position: relative;
  z-index: 1;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 26px;
  padding: 0;
  font-size: 16px;
  color: #1677ff;
  cursor: pointer;
  background: #fff;
  border: none;
  border-radius: 4px;
}

.service-chevron-scroller__arrow:hover:not(:disabled) {
  background: rgb(22 119 255 / 8%);
}

.service-chevron-scroller__arrow:disabled {
  color: rgb(0 0 0 / 25%);
  cursor: default;
}
</style>
