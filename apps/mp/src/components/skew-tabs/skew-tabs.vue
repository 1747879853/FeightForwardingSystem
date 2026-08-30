<script setup lang="ts">
import {
  getCurrentInstance,
  nextTick,
  onMounted,
  onUnmounted,
  watch,
} from 'vue';
import { onReady, onShow } from '@dcloudio/uni-app';

interface CanvasNode {
  getContext: (type: '2d') => CanvasRenderingContext2D;
  height: number;
  requestAnimationFrame: (callback: () => void) => number;
  width: number;
}

const props = withDefaults(
  defineProps<{
    hidden?: boolean;
    modelValue: number;
    tabs: readonly string[];
  }>(),
  {
    hidden: false,
    modelValue: 0,
    tabs: () => [],
  },
);

const emit = defineEmits<{
  'update:modelValue': [index: number];
}>();

const instance = getCurrentInstance();
const canvasId = `skew-tab-${Math.random().toString(36).slice(2, 8)}`;

/** 形态参数（单位 px）。稿：Tab 行 88rpx、顶圆角 20rpx */
const CONTAINER_R = 10;
const SKEW_W = 24;
const TRACK_COLOR = '#e3ecff';
const SLIDER_COLOR = '#f9fafd';

let canvas: CanvasNode | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let dpr = 1;
let width = 0;
let height = 0;
let tabW = 0;
let currentX = 0;
let targetX = 0;
let animating = false;
let inited = false;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function createQuery() {
  const scope = instance?.proxy ?? instance;
  return uni.createSelectorQuery().in(scope);
}

function scheduleFrame(callback: () => void) {
  if (canvas?.requestAnimationFrame) {
    canvas.requestAnimationFrame(callback);
    return;
  }
  setTimeout(callback, 16);
}

function clipHeader(
  context: CanvasRenderingContext2D,
  w: number,
  h: number,
  r: number,
) {
  context.beginPath();
  context.moveTo(r, 0);
  context.lineTo(w - r, 0);
  context.arcTo(w, 0, w, r, r);
  context.lineTo(w, h);
  context.lineTo(0, h);
  context.lineTo(0, r);
  context.arcTo(0, 0, r, 0, r);
  context.closePath();
  context.clip();
}

function draw(x: number) {
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);
  ctx.save();
  clipHeader(ctx, width, height, CONTAINER_R);

  ctx.fillStyle = TRACK_COLOR;
  ctx.fillRect(0, 0, width, height);

  const left = x;
  const right = x + tabW;
  ctx.fillStyle = SLIDER_COLOR;
  ctx.beginPath();

  if (left <= 0.01) {
    ctx.moveTo(0, height);
    ctx.lineTo(0, 0);
  } else {
    ctx.moveTo(left - SKEW_W, height);
    ctx.bezierCurveTo(
      left - SKEW_W * 0.45,
      height,
      left - SKEW_W * 0.55,
      0,
      left,
      0,
    );
  }

  if (right >= width - 0.01) {
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height);
  } else {
    ctx.lineTo(right, 0);
    ctx.bezierCurveTo(
      right + SKEW_W * 0.55,
      0,
      right + SKEW_W * 0.45,
      height,
      right + SKEW_W,
      height,
    );
  }

  ctx.lineTo(left <= 0.01 ? 0 : left - SKEW_W, height);
  ctx.closePath();
  ctx.fill();

  // 微信 type="2d" canvas 常在原生层，会盖住普通 view 文字，文案必须画在 canvas 上
  props.tabs.forEach((label, i) => {
    const active = i === props.modelValue;
    ctx.font = `${active ? '600 14px' : '500 13px'} sans-serif`;
    ctx.fillStyle = active ? '#1d1a27' : '#6e7b83';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(label), i * tabW + tabW / 2, height / 2);
  });

  ctx.restore();
}

function animate() {
  const dx = targetX - currentX;
  currentX += dx * 0.2;
  draw(currentX);

  if (Math.abs(targetX - currentX) > 0.05) {
    scheduleFrame(animate);
    return;
  }

  currentX = targetX;
  draw(currentX);
  animating = false;
}

function startAnimate() {
  if (!canvas) return;
  if (animating) return;
  animating = true;
  scheduleFrame(animate);
}

function moveTo(index: number, immediate = false) {
  if (tabW <= 0) return;
  targetX = index * tabW;
  if (immediate) {
    currentX = targetX;
    draw(currentX);
    return;
  }
  startAnimate();
}

function bindCanvas(
  result:
    | { height?: number; node?: CanvasNode; width?: number }
    | Array<{ height?: number; node?: CanvasNode; width?: number }>,
  retry: number,
) {
  const info = Array.isArray(result) ? result[0] : result;
  if (!info?.node || !info.width) {
    if (retry < 8) {
      retryTimer = setTimeout(() => initCanvas(retry + 1), 50);
    }
    return;
  }

  const node = info.node;
  const context = node.getContext('2d');
  const pixelRatio = uni.getSystemInfoSync().pixelRatio || 1;

  canvas = node;
  ctx = context;
  dpr = pixelRatio;
  width = info.width;
  height = info.height ?? 0;
  tabW = width / Math.max(props.tabs.length, 1);

  node.width = width * dpr;
  node.height = height * dpr;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);

  currentX = props.modelValue * tabW;
  targetX = currentX;
  inited = true;
  draw(currentX);
}

function initCanvas(retry = 0) {
  createQuery()
    .select(`#${canvasId}`)
    .fields({ node: true, size: true }, (result) => {
      bindCanvas(result, retry);
    })
    .exec();
}

function teardown() {
  if (retryTimer) clearTimeout(retryTimer);
  retryTimer = null;
  canvas = null;
  ctx = null;
  animating = false;
  inited = false;
}

function tryInit() {
  if (props.hidden) return;
  if (inited) {
    draw(currentX);
    return;
  }
  void nextTick(() => initCanvas());
}

function onTabClick(index: number) {
  if (index === props.modelValue) return;
  emit('update:modelValue', index);
}

watch(
  () => props.modelValue,
  (index) => {
    if (!inited) return;
    moveTo(index);
  },
);

watch(
  () => props.tabs.length,
  () => {
    if (!inited || width <= 0) return;
    tabW = width / Math.max(props.tabs.length, 1);
    moveTo(props.modelValue, true);
  },
);

watch(
  () => props.hidden,
  (isHidden) => {
    if (isHidden) {
      teardown();
      return;
    }
    tryInit();
  },
);

onMounted(tryInit);
onReady(tryInit);
onShow(() => {
  if (inited) {
    draw(currentX);
    return;
  }
  tryInit();
});
onUnmounted(teardown);
</script>

<template>
  <view class="skew-tabs">
    <canvas v-if="!hidden" type="2d" :id="canvasId" class="skew-tabs__canvas" />
    <view
      v-for="(tab, index) in tabs"
      :key="`${tab}-${index}`"
      class="skew-tabs__btn"
      @tap="onTabClick(index)"
    >
      <text class="skew-tabs__ghost">{{ tab }}</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.skew-tabs {
  position: relative;
  z-index: 0;
  display: flex;
  width: 100%;
  height: 88rpx;
  overflow: hidden;
  user-select: none;
  background: #e3ecff;
  border-radius: 20rpx 20rpx 0 0;
}

.skew-tabs__canvas {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.skew-tabs__btn {
  position: relative;
  z-index: 2;
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
}

.skew-tabs__ghost {
  font-size: 26rpx;
  color: transparent;
}
</style>
