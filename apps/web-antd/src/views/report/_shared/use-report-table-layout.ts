import type { Ref, ShallowRef } from 'vue';

import { onActivated, onDeactivated, onMounted, onUnmounted } from 'vue';

/**
 * 报表 Handsontable 高度适配。
 *
 * 报表路由带 keepAlive，离开页面只触发 onDeactivated 而不触发 onUnmounted，
 * 所以观察器必须在 deactivated 时停掉，activated 时再挂上。
 *
 * 不要改用 VueUse 的 useEventListener / useResizeObserver：它们只在
 * onUnmounted 清理，keepAlive 下等于泄漏。
 */
export function useReportTableLayout(options: {
  containerRef: Ref<HTMLElement | null> | ShallowRef<HTMLElement | null>;
  getHotInstance: () =>
    | { getSettings: () => any; updateSettings: (s: any, f?: boolean) => void }
    | null
    | undefined;
}) {
  const { containerRef, getHotInstance } = options;

  let resizeObserver: ResizeObserver | null = null;
  let heightUpdateTimer: ReturnType<typeof setTimeout> | null = null;
  let heightDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let heightFollowUpTimer: ReturnType<typeof setTimeout> | null = null;
  let layoutWatching = false;

  /**
   * 按「视口底部 − 容器顶」估算高度，不依赖 container.clientHeight。
   * 未定高 flex 时 clientHeight ≈ Handsontable 已设像素高，折叠检索后会锁死。
   */
  function updateTableHeight() {
    if (heightUpdateTimer) {
      clearTimeout(heightUpdateTimer);
    }

    heightUpdateTimer = setTimeout(() => {
      const container = containerRef.value;
      const hotInstance = getHotInstance();

      if (!container || !hotInstance) {
        heightUpdateTimer = null;
        return;
      }

      const rect = container.getBoundingClientRect();
      let targetHeight = Math.floor(window.innerHeight - rect.top - 24);

      if (targetHeight < 200) {
        targetHeight = 200;
      }

      const currentHeight = Number(hotInstance.getSettings()?.height);
      if (currentHeight === targetHeight) {
        heightUpdateTimer = null;
        return;
      }

      hotInstance.updateSettings({ height: targetHeight }, false);
      heightUpdateTimer = null;
    }, 16);
  }

  function scheduleHeightUpdate(delay = 50) {
    if (heightDebounceTimer) {
      clearTimeout(heightDebounceTimer);
    }
    heightDebounceTimer = setTimeout(() => {
      heightDebounceTimer = null;
      updateTableHeight();
    }, delay);
  }

  /**
   * 折叠检索后布局可能分两帧完成：先立刻重算，再补一次兜底。
   * 第二次用独立 timer，避免被 scheduleHeightUpdate 的防抖清掉。
   */
  function scheduleHeightUpdateWithFollowUp() {
    scheduleHeightUpdate(50);
    if (heightFollowUpTimer) {
      clearTimeout(heightFollowUpTimer);
    }
    heightFollowUpTimer = setTimeout(() => {
      heightFollowUpTimer = null;
      updateTableHeight();
    }, 200);
  }

  function handleWindowResize() {
    scheduleHeightUpdateWithFollowUp();
  }

  function startLayoutWatchers() {
    if (layoutWatching) return;
    const container = containerRef.value;
    if (!container) return;
    layoutWatching = true;

    resizeObserver = new ResizeObserver(() => scheduleHeightUpdate(50));
    resizeObserver.observe(container);

    const pageRoot = container.closest('.report-page');
    const pageContent =
      container.closest('.report-page__content') ||
      (pageRoot?.querySelector('.report-page__content') as HTMLElement | null);

    if (pageContent) {
      resizeObserver.observe(pageContent);
    }

    // 查询卡高度变化（折叠检索）由 ResizeObserver 捕获，无需再监听 class Mutation
    const queryCard = pageRoot?.querySelector(
      '.query-card',
    ) as HTMLElement | null;
    if (queryCard) {
      resizeObserver.observe(queryCard);
    }

    window.addEventListener('resize', handleWindowResize);
  }

  function stopLayoutWatchers() {
    if (!layoutWatching) return;
    layoutWatching = false;

    window.removeEventListener('resize', handleWindowResize);
    resizeObserver?.disconnect();
    resizeObserver = null;

    if (heightDebounceTimer) {
      clearTimeout(heightDebounceTimer);
      heightDebounceTimer = null;
    }
    if (heightUpdateTimer) {
      clearTimeout(heightUpdateTimer);
      heightUpdateTimer = null;
    }
    if (heightFollowUpTimer) {
      clearTimeout(heightFollowUpTimer);
      heightFollowUpTimer = null;
    }
  }

  onMounted(() => {
    startLayoutWatchers();
    updateTableHeight();
  });

  onActivated(() => {
    startLayoutWatchers();
    scheduleHeightUpdate(0);
  });

  onDeactivated(stopLayoutWatchers);
  onUnmounted(stopLayoutWatchers);

  return {
    updateTableHeight,
    scheduleHeightUpdate,
  };
}
