import type { Ref } from 'vue';

import { nextTick, onBeforeUnmount, watch } from 'vue';

const MIN_COL_WIDTH = 80;

/**
 * 为 Ant Design Vue Table 表头挂载列宽拖拽手柄。
 * 适用于抽屉内 a-table（非 NestedDataTable）。
 */
export function enableAntTableColumnResize(
  tableElement: HTMLElement | null,
): void {
  if (!tableElement) return;

  const headers = tableElement.querySelectorAll<HTMLElement>(
    '.ant-table-thead > tr > th',
  );

  headers.forEach((header) => {
    if (
      header.classList.contains('ant-table-selection-column') ||
      header.classList.contains('ant-table-expand-icon-th') ||
      header.classList.contains('ant-table-row-expand-icon-cell')
    ) {
      return;
    }

    if (header.querySelector('.column-resizer')) return;

    const resizer = document.createElement('div');
    resizer.className = 'column-resizer';
    resizer.style.cssText = `
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 5px;
      cursor: col-resize;
      background-color: transparent;
      z-index: 10;
      user-select: none;
    `;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const colIndex = Array.from(header.parentElement?.children ?? []).indexOf(
      header,
    );

    const applyWidth = (newWidth: number) => {
      const px = `${newWidth}px`;
      header.style.width = px;
      header.style.minWidth = px;
      header.style.maxWidth = px;
      if (colIndex < 0) return;
      tableElement.querySelectorAll('colgroup').forEach((group) => {
        const col = group.children[colIndex] as HTMLElement | undefined;
        if (!col) return;
        col.style.width = px;
        col.style.minWidth = px;
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      applyWidth(Math.max(MIN_COL_WIDTH, startWidth + (e.clientX - startX)));
    };

    const handleMouseUp = () => {
      isResizing = false;
      resizer.style.backgroundColor = 'transparent';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    resizer.addEventListener('mouseenter', () => {
      if (!isResizing) resizer.style.backgroundColor = '#d9d9d9';
    });
    resizer.addEventListener('mouseleave', () => {
      if (!isResizing) resizer.style.backgroundColor = 'transparent';
    });
    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startX = e.clientX;
      startWidth = header.offsetWidth;
      resizer.style.backgroundColor = '#1890ff';
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      e.preventDefault();
      e.stopPropagation();
    });

    header.style.position = 'relative';
    header.appendChild(resizer);
  });
}

/**
 * 监听抽屉打开与数据变化，为容器内 ant-table 启用列宽拖拽。
 * 抽屉打开期间用 MutationObserver 覆盖展开行内嵌表等延迟渲染场景。
 */
export function useAntTableColumnResize(options: {
  containerSelector: string;
  enabled: Ref<boolean>;
  /** 数据变化时重新挂载手柄（如翻页、重查） */
  dataVersion?: Ref<unknown>;
}) {
  let timer: null | ReturnType<typeof setTimeout> = null;
  let observer: MutationObserver | null = null;

  const apply = () => {
    void nextTick(() => {
      const roots = document.querySelectorAll(options.containerSelector);
      roots.forEach((root) => {
        root
          .querySelectorAll<HTMLElement>('.ant-table-wrapper')
          .forEach((table) => enableAntTableColumnResize(table));
      });
    });
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(apply, 80);
  };

  const stopObserver = () => {
    observer?.disconnect();
    observer = null;
  };

  const startObserver = () => {
    stopObserver();
    void nextTick(() => {
      const root = document.querySelector(options.containerSelector);
      if (!root) return;
      observer = new MutationObserver(() => schedule());
      observer.observe(root, { childList: true, subtree: true });
    });
  };

  watch(
    () => options.enabled.value,
    (visible) => {
      if (visible) {
        schedule();
        startObserver();
      } else {
        stopObserver();
      }
    },
    { immediate: true },
  );

  if (options.dataVersion) {
    watch(
      () => options.dataVersion!.value,
      () => {
        if (options.enabled.value) schedule();
      },
    );
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer);
    stopObserver();
  });

  return { refreshColumnResize: schedule };
}
