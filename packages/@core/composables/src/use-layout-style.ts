import type { CSSProperties } from 'vue';

import type { VisibleDomRect } from '@vben-core/shared/utils';

import { computed, onMounted, onUnmounted, ref } from 'vue';

import {
  CSS_VARIABLE_LAYOUT_CONTENT_HEIGHT,
  CSS_VARIABLE_LAYOUT_CONTENT_WIDTH,
  CSS_VARIABLE_LAYOUT_FOOTER_HEIGHT,
  CSS_VARIABLE_LAYOUT_HEADER_HEIGHT,
} from '@vben-core/shared/constants';
import { getElementVisibleRect } from '@vben-core/shared/utils';

import { useCssVar, useDebounceFn } from '@vueuse/core';

/**
 * @zh_CN content style
 */
export function useLayoutContentStyle() {
  let resizeObserver: null | ResizeObserver = null;
  const contentElement = ref<HTMLDivElement | null>(null);
  const visibleDomRect = ref<null | VisibleDomRect>(null);
  const contentHeight = useCssVar(CSS_VARIABLE_LAYOUT_CONTENT_HEIGHT);
  const contentWidth = useCssVar(CSS_VARIABLE_LAYOUT_CONTENT_WIDTH);

  const overlayStyle = computed((): CSSProperties => {
    const { height, left, top, width } = visibleDomRect.value ?? {};
    return {
      height: `${height}px`,
      left: `${left}px`,
      position: 'fixed',
      top: `${top}px`,
      width: `${width}px`,
      zIndex: 150,
    };
  });

  // 计算 layout content 的可见宽高并写入 CSS 变量（--vben-content-height / -width）
  const calcContentRect = () => {
    visibleDomRect.value = getElementVisibleRect(contentElement.value);
    contentHeight.value = `${visibleDomRect.value.height}px`;
    contentWidth.value = `${visibleDomRect.value.width}px`;
  };

  const debouncedCalcHeight = useDebounceFn(calcContentRect, 16);

  onMounted(() => {
    if (contentElement.value && !resizeObserver) {
      // 首帧同步兜底：--vben-content-height 没有 CSS 默认值，此前仅由下面防抖的
      // ResizeObserver 赋值（首次回调要等挂载后约一帧 + 16ms 防抖才触发，晚于首屏绘制）。
      // F5 直达时页面组件与布局在同一次挂载中渲染，浏览器首屏 layout/paint 时该变量仍为空，
      // 使依赖它的 auto-content-height 页面 height: calc(var(--vben-content-height) - …) 因
      // 变量为空而整体失效、回退成内容高度，出现「初始过高 + 滚动条 + 随布局 transition 缓慢
      // 回缩 + 突然适配」的闪动（正常站内跳转因变量早已就绪故无此问题）。此处在挂载时立即
      // 同步算一次真实值——早于子组件 nextTick 测量、也早于浏览器首帧绘制，从根源消除该闪动。
      calcContentRect();
      resizeObserver = new ResizeObserver(debouncedCalcHeight);
      resizeObserver.observe(contentElement.value);
    }
  });

  onUnmounted(() => {
    resizeObserver?.disconnect();
    resizeObserver = null;
  });

  return { contentElement, overlayStyle, visibleDomRect };
}

export function useLayoutHeaderStyle() {
  const headerHeight = useCssVar(CSS_VARIABLE_LAYOUT_HEADER_HEIGHT);

  return {
    getLayoutHeaderHeight: () => {
      return Number.parseInt(`${headerHeight.value}`, 10);
    },
    setLayoutHeaderHeight: (height: number) => {
      headerHeight.value = `${height}px`;
    },
  };
}

export function useLayoutFooterStyle() {
  const footerHeight = useCssVar(CSS_VARIABLE_LAYOUT_FOOTER_HEIGHT);

  return {
    getLayoutFooterHeight: () => {
      return Number.parseInt(`${footerHeight.value}`, 10);
    },
    setLayoutFooterHeight: (height: number) => {
      footerHeight.value = `${height}px`;
    },
  };
}
