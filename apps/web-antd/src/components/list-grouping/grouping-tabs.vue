<script lang="ts" setup>
import type { GroupItem } from './types';

import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import { ChevronLeft, ChevronRight } from '@vben/icons';

const props = defineProps<{
  /** 分组数据 */
  items: GroupItem[];
  /** 当前选中的分组项 id（undefined 表示「全部」） */
  selectedId?: null | number | string | undefined;
  /** 加载中 */
  loading?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', id: null | number | string | undefined): void;
}>();

function isSelected(id: null | number | string | undefined): boolean {
  return props.selectedId === id;
}

function onClick(id: null | number | string | undefined) {
  emit('select', id);
}

const tabBarRef = ref<HTMLElement | null>(null);
const tabTrackRef = ref<HTMLElement | null>(null);
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const scrollable = ref(false);
const SCROLL_STEP = 240;
const SCROLL_DURATION = 280;
let resizeObserver: null | ResizeObserver = null;
let scrollAnimationId: null | number = null;
let scrollIdleTimer: null | ReturnType<typeof setTimeout> = null;
let isAnimating = false;

function updateScrollState() {
  const el = tabBarRef.value;
  if (!el) {
    canScrollLeft.value = false;
    canScrollRight.value = false;
    scrollable.value = false;
    return;
  }
  const { clientWidth, scrollLeft, scrollWidth } = el;
  scrollable.value = scrollWidth > clientWidth + 1;
  canScrollLeft.value = scrollLeft > 1;
  canScrollRight.value = scrollLeft + clientWidth < scrollWidth - 1;
}

function onScroll() {
  if (isAnimating) {
    return;
  }
  if (scrollIdleTimer) {
    window.clearTimeout(scrollIdleTimer);
  }
  scrollIdleTimer = window.setTimeout(() => {
    scrollIdleTimer = null;
    updateScrollState();
  }, 120) as unknown as ReturnType<typeof setTimeout>;
}

function stopScrollAnimation() {
  if (scrollAnimationId !== null) {
    window.cancelAnimationFrame(scrollAnimationId);
    scrollAnimationId = null;
  }
  isAnimating = false;
}

function animateScroll(targetLeft: number) {
  const el = tabBarRef.value;
  if (!el) {
    return;
  }
  stopScrollAnimation();
  isAnimating = true;
  const startLeft = el.scrollLeft;
  const distance = targetLeft - startLeft;
  if (Math.abs(distance) < 1) {
    stopScrollAnimation();
    updateScrollState();
    return;
  }
  const startTime = performance.now();
  function step(currentTime: number) {
    const progress = Math.min((currentTime - startTime) / SCROLL_DURATION, 1);
    const eased = 1 - (1 - progress) ** 3;
    if (el) {
      el.scrollLeft = startLeft + distance * eased;
    }
    if (progress < 1) {
      scrollAnimationId = window.requestAnimationFrame(step);
      return;
    }
    scrollAnimationId = null;
    isAnimating = false;
    updateScrollState();
  }
  scrollAnimationId = window.requestAnimationFrame(step);
}

function scrollTabs(direction: 'left' | 'right') {
  const el = tabBarRef.value;
  if (!el) {
    return;
  }
  const step = Math.max(SCROLL_STEP, el.clientWidth * 0.6);
  const maxScrollLeft = el.scrollWidth - el.clientWidth;
  const targetLeft = Math.max(
    0,
    Math.min(
      maxScrollLeft,
      el.scrollLeft + (direction === 'left' ? -step : step),
    ),
  );
  if (Math.abs(targetLeft - el.scrollLeft) < 1) {
    return;
  }
  animateScroll(targetLeft);
}

function bindScrollObserver() {
  resizeObserver?.disconnect();
  resizeObserver = null;
  const el = tabBarRef.value;
  if (!el) {
    return;
  }
  el.removeEventListener('scroll', onScroll);
  el.addEventListener('scroll', onScroll, { passive: true });
  resizeObserver = new ResizeObserver(() => updateScrollState());
  resizeObserver.observe(el);
  if (tabTrackRef.value) {
    resizeObserver.observe(tabTrackRef.value);
  }
  updateScrollState();
}

watch(
  () => props.items.length,
  async () => {
    await nextTick();
    bindScrollObserver();
  },
);

onMounted(() => {
  bindScrollObserver();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  stopScrollAnimation();
  if (scrollIdleTimer) {
    window.clearTimeout(scrollIdleTimer);
    scrollIdleTimer = null;
  }
});
</script>

<template>
  <div
    class="grouping-tab-wrapper flex min-w-0 flex-1 items-center overflow-hidden"
  >
    <div
      ref="tabBarRef"
      class="grouping-tab-bar min-w-0 flex-1 overflow-x-auto transition-opacity"
      :class="{ 'pointer-events-none opacity-50': loading }"
    >
      <div
        ref="tabTrackRef"
        class="grouping-tab-track inline-flex flex-nowrap items-center gap-1"
      >
        <div
          class="grouping-tab-item cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-all duration-200"
          :class="
            isSelected(undefined)
              ? 'border-blue-500 text-blue-500'
              : 'border-none text-gray-600 hover:text-gray-900'
          "
          @click="onClick(undefined)"
        >
          全部
        </div>
        <div
          v-for="(item, index) in items"
          :key="`${item.id ?? 'null'}-${index}`"
          class="grouping-tab-item cursor-pointer whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-all duration-200"
          :class="
            isSelected(item.id)
              ? 'border-blue-500 text-blue-500'
              : 'border-none text-gray-600 hover:text-gray-900'
          "
          @click="onClick(item.id)"
        >
          <span class="inline-flex items-center gap-1">
            <img
              v-if="item.logoUrl"
              :src="item.logoUrl"
              :alt="item.name || ''"
              class="h-5 w-5 rounded object-contain"
            />
            <span>{{ item.name || '未填写' }}</span>
            <span class="text-gray-400">({{ item.count }})</span>
          </span>
        </div>
      </div>
    </div>
    <div
      v-if="scrollable"
      class="grouping-tab-scroll-actions flex shrink-0 items-center"
    >
      <button
        type="button"
        class="grouping-tab-scroll-btn"
        :class="{ 'is-disabled': !canScrollLeft }"
        :aria-disabled="!canScrollLeft"
        title="向左滚动"
        @click="scrollTabs('left')"
      >
        <ChevronLeft class="size-4" />
      </button>
      <button
        type="button"
        class="grouping-tab-scroll-btn"
        :class="{ 'is-disabled': !canScrollRight }"
        :aria-disabled="!canScrollRight"
        title="向右滚动"
        @click="scrollTabs('right')"
      >
        <ChevronRight class="size-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.grouping-tab-wrapper {
  flex: 1 1 0%;
  width: 100%;
  min-width: 0;
  overflow: hidden;
}

.grouping-tab-bar {
  flex: 1 1 0%;
  width: 0;
  min-width: 0;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.grouping-tab-track {
  width: max-content;
}

.grouping-tab-item {
  flex-shrink: 0;
}

.grouping-tab-bar::-webkit-scrollbar {
  display: none;
}

.grouping-tab-scroll-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 2px 6px;
  color: rgb(0 0 0 / 65%);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.grouping-tab-scroll-btn:hover:not(.is-disabled) {
  background: rgb(0 0 0 / 4%);
}

.grouping-tab-scroll-btn.is-disabled {
  color: rgb(0 0 0 / 25%);
  pointer-events: none;
  cursor: not-allowed;
}
</style>
