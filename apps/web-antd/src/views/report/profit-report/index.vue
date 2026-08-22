<script lang="ts" setup>
import type { ReportApi } from '#/api/system/report';

import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue';
import { useRouter } from 'vue-router';

import { HotTable } from '@handsontable/vue3';

import { Page } from '@vben/common-ui';

import { useAccess } from '@vben/access';
import { useVbenForm } from '#/adapter/form';

import { Button, Card, message, Tag, Dropdown } from 'ant-design-vue';

import { getProfitReportList } from '#/api/system/report';

// ✅ 不再使用 SortableJS，直接使用原生鼠标事件实现拖拽

import {
  useProfitReportFormSchema,
  getBaseHotColumns,
  getCurrencyColumns,
  getTotalColumns,
} from './data';

// 导入列配置组件
import ColumnConfigModal from './modules/ColumnConfigModal.vue';

// 导入 SheetJS
import * as XLSX from 'xlsx';

// ✅ 移除 SortableJS 的 import

defineOptions({
  name: 'ProfitReport',
});

const router = useRouter();
const { hasAccessByCodes } = useAccess();

// 权限检查
const canView = computed(() => hasAccessByCodes(['Admin.Report.Profit.Get']));

// Handsontable 引用
const hotTableRef = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
// 当前显示的列配置
const currentColumnsRef = ref<any[]>([]);

// 表格数据
const tableData = ref<any[]>([]);
const originalData = ref<any[]>([]); // 保存原始数据用于分组
const loading = ref(false);

// 分组相关状态
const groupColumns = ref<string[]>([]); // 当前分组的列名数组
const expandedGroups = ref<Set<string>>(new Set()); // 展开的分组键集合

// ✅ 拖拽状态管理
let isDraggingColumn = false;
let dragColumnData: { columnData?: string; columnTitle?: string } = {};
let dragGhostElement: HTMLElement | null = null;

// ✅ 分组标签拖拽状态
const draggedGroupIndex = ref<number | null>(null);
const dragOverGroupIndex = ref<number | null>(null);

// 表单配置
const formSchema = useProfitReportFormSchema();

// 存储所有出现的币别代码
const allCurrencyCodes = ref<Set<string>>(new Set());

// 列配置相关状态
const columnConfigVisible = ref(false);
const columnConfigs = ref<any[]>([]);
const defaultColumnConfigs = ref<any[]>([]);

// Handsontable 基础列配置
const baseHotColumns = getBaseHotColumns();
// Handsontable 合计列配置
const totalHotColumns = getTotalColumns();

// 动态列配置计算属性
const dynamicHotColumns = computed(() => {
  return [
    ...baseHotColumns,
    ...getCurrencyColumns(Array.from(allCurrencyCodes.value)),
    ...totalHotColumns,
  ];
});

// 获取列标题映射（用于表头显示）
const columnTitleMap = computed<Record<string, string>>(() => {
  const columns = dynamicHotColumns.value;
  return columns.reduce(
    (map, col) => {
      map[col.data] = col.title;
      return map;
    },
    {} as Record<string, string>,
  );
});

// 更新数值列字段（用于累加和右对齐）
const numericColumns = computed(() => {
  const cols = new Set([
    'totalReceivable',
    'totalPayable',
    'totalProfit',
    'totalProfitRate',
  ]);

  // 添加所有币别相关的数值列
  allCurrencyCodes.value.forEach((code) => {
    cols.add(`${code}_receivable`);
    cols.add(`${code}_payable`);
    cols.add(`${code}_profit`);
  });

  return cols;
});

// 初始化默认列配置
function initDefaultColumnConfigs() {
  const allCols = dynamicHotColumns.value;
  defaultColumnConfigs.value = allCols.map((col, index) => ({
    data: col.data,
    title: col.title,
    visible: true,
    fixed: col.fixed || false,
    order: index,
  }));
  columnConfigs.value = [...defaultColumnConfigs.value];
}

// 应用列配置
function applyColumnConfig(configs: any[]) {
  columnConfigs.value = configs;

  // 重新应用分组逻辑以使用新的列配置
  if (originalData.value.length > 0) {
    applyGrouping([...originalData.value]);
  }
}

// 重置列配置
function resetColumnConfig() {
  initDefaultColumnConfigs();
  applyColumnConfig([...defaultColumnConfigs.value]);
}

// 监听动态列变化，更新默认配置
watch(
  dynamicHotColumns,
  () => {
    initDefaultColumnConfigs();
  },
  { immediate: true },
);

// Handsontable 配置（改为计算属性）
const hotSettings = computed(() => {
  // 获取可见列并按order排序
  // 如果有分组，使用currentColumnsRef（包含分组列），否则使用columnConfigs
  const visibleColumns =
    groupColumns.value.length > 0
      ? [...currentColumnsRef.value]
      : [...columnConfigs.value]
          .filter((col) => col.visible)
          .sort((a, b) => a.order - b.order);

  // 计算固定列数量
  const leftFixedColumns = visibleColumns.filter((col) => col.fixed === 'left');
  const rightFixedColumns = visibleColumns.filter(
    (col) => col.fixed === 'right',
  );

  const fixedColumnsLeft = leftFixedColumns.length;
  const fixedColumnsRight = rightFixedColumns.length;

  return {
    data: tableData.value,
    columns: visibleColumns.map((col) => {
      const isNumeric = numericColumns.value.has(col.data);
      return {
        ...col,
        className: isNumeric ? 'htRight' : 'htLeft',
      };
    }),
    rowHeaders: true,
    colHeaders: true,
    height: '100%', // 使用百分比高度，配合 CSS 实现自适应
    width: '100%',
    stretchH: 'all',
    manualColumnResize: true,
    manualRowResize: true,

    // ✅ 启用手动列移动功能 - 允许拖拽列头调整列顺序
    manualColumnMove: true,

    // ✅ 重新启用列排序功能
    columnSorting: {
      indicator: true,
      sortEmptyCells: false,
    },

    contextMenu: false,
    readOnly: true,
    licenseKey: 'non-commercial-and-evaluation',
    className: 'htCenter htMiddle',
    rowHeight: 28,
    autoWrapRow: false,
    autoWrapCol: false,

    // ✅ 方案A：禁用固定列以启用完整的拖拽功能
    // 原配置（已注释）：
    // fixedColumnsLeft: fixedColumnsLeft,
    // fixedColumnsRight: fixedColumnsRight,
    fixedColumnsLeft: 0, // 禁用左侧固定列
    fixedColumnsRight: 0, // 禁用右侧固定列

    afterGetColHeader: (col: number, TH: HTMLTableCellElement) => {
      TH.style.backgroundColor = '#1890ff';
      TH.style.color = '#ffffff';
      TH.style.fontWeight = '600';
      TH.style.textAlign = 'center';

      // 如果是分组列（第一列且有分组）
      if (groupColumns.value.length > 0 && col === 0) {
        TH.style.cursor = 'default';
        TH.title = '';
        return;
      }

      // ✅ 创建拖拽手柄，并使用内联事件处理器
      let dragHandle = TH.querySelector('.drag-handle') as HTMLElement;
      if (!dragHandle) {
        dragHandle = document.createElement('span');
        dragHandle.className = 'drag-handle';
        dragHandle.innerHTML = '⋮⋮'; // 双竖线图标
        dragHandle.style.cssText = `
          position: absolute;
          left: 4px;
          top: 50%;
          transform: translateY(-50%);
          cursor: grab;
          opacity: 0.7;
          font-size: 12px;
          padding: 2px 4px;
          z-index: 10;
          user-select: none;
        `;

        // ✅ 关键：使用内联事件处理器，直接绑定到元素上
        dragHandle.onmousedown = (e: MouseEvent) => {
          console.log('✅ 手柄 onmousedown 触发了！');

          // 只处理左键
          if (e.button !== 0) return;

          // ✅ 记录鼠标起始位置
          const startX = e.clientX;
          const startY = e.clientY;
          let isVerticalDrag = false;
          let hasStartedDrag = false;
          let dragHandled = false; // ✅ 标记是否已经处理了拖拽

          // ✅ 关键修复：直接使用 afterGetColHeader 提供的 col 参数
          const currentColumns = currentColumnsRef.value;

          if (col < 0 || col >= currentColumns.length) {
            console.warn('列索引超出范围:', col, currentColumns.length);
            return;
          }

          const columnData = currentColumns[col]?.data;
          const columnTitle = currentColumns[col]?.title || columnData;

          console.log(
            '📌 准备拖拽列索引:',
            col,
            '数据:',
            columnData,
            '标题:',
            columnTitle,
          );

          if (!columnData || columnData === '_groupDisplay') {
            console.warn('该列不支持分组:', columnData);
            return;
          }

          // ✅ 监听 mousemove 来判断拖动方向
          const handleMouseMove = (moveEvent: MouseEvent) => {
            if (!hasStartedDrag) {
              const deltaX = Math.abs(moveEvent.clientX - startX);
              const deltaY = Math.abs(moveEvent.clientY - startY);

              // 如果垂直移动距离大于水平移动距离，则认为是垂直拖动
              if (deltaY > deltaX && deltaY > 5) {
                isVerticalDrag = true;
                hasStartedDrag = true;
                dragHandled = true; // ✅ 标记已处理

                console.log('🖱️ 开始垂直拖拽列:', columnData, columnTitle);

                isDraggingColumn = true;
                dragColumnData = { columnData, columnTitle };

                // ✅ 创建拖拽幽灵元素
                dragGhostElement = document.createElement('div');
                dragGhostElement.className = 'column-drag-ghost';
                dragGhostElement.textContent = columnTitle || '';
                dragGhostElement.style.cssText = `
                  position: fixed;
                  left: ${moveEvent.clientX + 10}px;
                  top: ${moveEvent.clientY + 10}px;
                  padding: 8px 16px;
                  background: #1890ff;
                  color: white;
                  border-radius: 4px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                  z-index: 9999;
                  pointer-events: none;
                  font-size: 13px;
                  font-weight: 600;
                  opacity: 0.85;
                  cursor: grabbing;
                `;
                document.body.appendChild(dragGhostElement);

                // ✅ 关键：阻止所有后续事件，避免干扰 Handsontable
                moveEvent.preventDefault();
                moveEvent.stopPropagation();
                moveEvent.stopImmediatePropagation();
              } else if (deltaX > 5) {
                // 水平移动，让 Handsontable 处理列移动
                hasStartedDrag = true;
                cleanup();
                removeListeners();
              }
            } else if (isVerticalDrag && dragGhostElement) {
              // 更新幽灵元素位置
              dragGhostElement.style.left = `${moveEvent.clientX + 10}px`;
              dragGhostElement.style.top = `${moveEvent.clientY + 10}px`;

              // 检查是否在分组区域上方
              const groupArea = document.querySelector('.group-area-tags');
              if (groupArea) {
                const rect = groupArea.getBoundingClientRect();
                const isOver =
                  moveEvent.clientX >= rect.left &&
                  moveEvent.clientX <= rect.right &&
                  moveEvent.clientY >= rect.top &&
                  moveEvent.clientY <= rect.bottom;

                if (isOver) {
                  groupArea.classList.add('sortable-over');
                } else {
                  groupArea.classList.remove('sortable-over');
                }
              }

              // ✅ 关键：持续阻止事件
              moveEvent.preventDefault();
              moveEvent.stopPropagation();
              moveEvent.stopImmediatePropagation();
            }
          };

          // ✅ 监听 mouseup 来结束拖拽
          const handleMouseUp = (upEvent: MouseEvent) => {
            removeListeners();

            if (dragHandled && isDraggingColumn) {
              console.log('🖱️ 鼠标释放');

              const groupArea = document.querySelector('.group-area-tags');
              if (groupArea) {
                groupArea.classList.remove('sortable-over');
              }

              if (dragColumnData.columnData && groupArea) {
                const rect = groupArea.getBoundingClientRect();
                const isOver =
                  upEvent.clientX >= rect.left &&
                  upEvent.clientX <= rect.right &&
                  upEvent.clientY >= rect.top &&
                  upEvent.clientY <= rect.bottom;

                if (
                  isOver &&
                  !groupColumns.value.includes(dragColumnData.columnData)
                ) {
                  console.log('✅ 添加到分组:', dragColumnData.columnData);

                  groupColumns.value.push(dragColumnData.columnData);

                  if (originalData.value.length > 0) {
                    applyGrouping([...originalData.value]);
                  }

                  message.success(
                    `已将 "${dragColumnData.columnTitle}" 添加到分组`,
                  );
                }
              }

              if (dragGhostElement) {
                dragGhostElement.remove();
                dragGhostElement = null;
              }

              isDraggingColumn = false;
              dragColumnData = {};
              dragHandled = false;
            }

            cleanup();
          };

          const cleanup = () => {
            const th = dragHandle?.closest('th') as HTMLTableCellElement;
            if (th) {
              th.style.opacity = '1';
            }
            if (dragHandle) {
              dragHandle.style.cursor = 'grab';
            }
          };

          const removeListeners = () => {
            document.removeEventListener('mousemove', handleMouseMove, true);
            document.removeEventListener('mouseup', handleMouseUp, true);
          };

          document.addEventListener('mousemove', handleMouseMove, true);
          document.addEventListener('mouseup', handleMouseUp, true);

          // ✅ 关键：立即阻止 mousedown 事件的传播，防止 Handsontable 处理
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        };

        TH.style.position = 'relative';
        TH.appendChild(dragHandle);
      }

      // 提示用户可以使用排序和拖拽功能
      TH.style.cursor = 'pointer';
      TH.title = '左键单击排序 | 拖动左侧 ⋮⋮ 图标到分组区 | 右键添加分组';

      // 添加右键菜单来添加分组
      TH.oncontextmenu = (e: MouseEvent) => {
        e.preventDefault();

        // 从当前显示的列配置中获取列数据
        const currentColumns = currentColumnsRef.value;
        if (col >= 0 && col < currentColumns.length) {
          const columnData = currentColumns[col]?.data;
          const columnTitle = currentColumns[col]?.title || columnData;

          // 确保不是分组列的数据字段
          if (
            columnData &&
            columnData !== '_groupDisplay' &&
            !groupColumns.value.includes(columnData)
          ) {
            // ✅ 直接添加分组，无需确认弹窗
            groupColumns.value.push(columnData);
            if (originalData.value.length > 0) {
              applyGrouping([...originalData.value]);
            }
            // 可选：显示成功提示
            message.success(`已将 "${columnTitle}" 添加到分组`);
          } else if (groupColumns.value.includes(columnData)) {
            message.info('该列已在分组中，无需重复添加');
          }
        }
      };
    },
    //afterOnCellMouseDown: onAfterOnCellMouseDown,
    afterDblClick: onAfterOnCellDblClick, // 添加双击事件处理
    // 添加单元格渲染后的事件处理（用于分组列的点击）
    afterRenderer: (
      TD: HTMLTableCellElement,
      row: number,
      col: number,
      prop: string,
      value: any,
      cellProperties: any,
    ) => {
      const rowData = tableData.value[row];

      // 为合计行添加data属性
      if (rowData?._isTotalRow) {
        TD.parentElement?.setAttribute('data-total-row', 'true');
        TD.style.fontWeight = 'bold';
        return;
      }

      if (col === 0 && groupColumns.value.length > 0) {
        // 分组列，添加点击事件
        if (rowData?._isGroupRow) {
          TD.onclick = () => {
            toggleGroupExpand(rowData._groupKey);
          };
          TD.style.cursor = 'pointer';
        }
      }
    },
  };
});

/**
 * 更新表格高度
 */
let resizeObserver: ResizeObserver | null = null;
let heightUpdateTimer: ReturnType<typeof setTimeout> | null = null;

function updateTableHeight() {
  // 清除之前的定时器，避免重复调用
  if (heightUpdateTimer) {
    clearTimeout(heightUpdateTimer);
  }

  // 使用 requestAnimationFrame 确保在下一帧执行，避免布局抖动
  heightUpdateTimer = setTimeout(() => {
    const container = containerRef.value;
    const hotInstance = hotTableRef.value?.hotInstance;

    if (!container || !hotInstance) {
      heightUpdateTimer = null;
      return;
    }

    // 1. 获取视口总高度
    const viewportHeight = window.innerHeight;

    // 2. 获取容器相对于视口的位置
    const rect = container.getBoundingClientRect();

    // 3. 计算目标高度：视口高度 - 容器顶部距离视口顶部的距离 - 底部缓冲(防止出现垂直滚动条)
    let targetHeight = viewportHeight - rect.top - 24;

    // 确保高度不小于 200
    if (targetHeight < 200) {
      targetHeight = 200;
    }

    // 4. 更新 Handsontable 高度
    hotInstance.updateSettings({ height: targetHeight }, false);

    heightUpdateTimer = null;
  }, 16); // 约1帧的时间（60fps）
}

function initResizeObserver() {
  if (!containerRef.value) return;

  // 清理旧的观察者
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  resizeObserver = new ResizeObserver(() => {
    // 清除之前的定时器
    if (heightUpdateTimer) {
      clearTimeout(heightUpdateTimer);
    }
    // 使用防抖，避免频繁更新
    heightUpdateTimer = setTimeout(() => {
      updateTableHeight();
    }, 50); // 50ms 防抖
  });

  // 观察多个元素的变化
  // 1. 观察 document.body - 窗口缩放时视口变化
  resizeObserver.observe(document.body);

  // 2. 观察 Page 组件的 wrapper - 当查询表单展开/收缩时，整体布局会变化
  const pageWrapper = document.querySelector('.vben-page-wrapper');
  if (pageWrapper) {
    resizeObserver.observe(pageWrapper as Element);
  }

  // 3. 观察 query-card - 查询表单展开/收缩的直接容器
  const queryCard = document.querySelector('.query-card');
  if (queryCard) {
    resizeObserver.observe(queryCard as Element);
  }

  // 4. 使用 MutationObserver 监听 DOM 变化，动态添加新的观察对象
  let updateTimeout: ReturnType<typeof setTimeout> | null = null;

  const mutationObserver = new MutationObserver((mutations) => {
    // 防抖处理：避免频繁调用
    if (updateTimeout) {
      clearTimeout(updateTimeout);
    }

    let needUpdate = false;

    mutations.forEach((mutation) => {
      if (!needUpdate) {
        // 检查是否有相关节点添加
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) {
            if (node.classList.contains('query-card')) {
              resizeObserver?.observe(node);
            }
            if (
              node.classList.contains('vben-page-wrapper') ||
              node.querySelector?.('.vben-page-wrapper')
            ) {
              const wrapper = node.classList.contains('vben-page-wrapper')
                ? node
                : node.querySelector('.vben-page-wrapper');
              if (wrapper) {
                resizeObserver?.observe(wrapper);
              }
            }
          }
        });

        // 监听属性变化（特别是样式和类名变化）
        if (
          mutation.type === 'attributes' &&
          (mutation.attributeName === 'style' ||
            mutation.attributeName === 'class')
        ) {
          const target = mutation.target as HTMLElement;
          if (
            target.classList.contains('query-card') ||
            target.classList.contains('vben-page-wrapper') ||
            target.closest('.query-card') ||
            target.closest('.vben-page-wrapper')
          ) {
            needUpdate = true;
          }
        }
      }
    });

    // 如果需要更新，使用防抖延迟执行
    if (needUpdate) {
      updateTimeout = setTimeout(() => {
        updateTableHeight();
        updateTimeout = null;
      }, 100); // 100ms 防抖
    }
  });

  // 监听整个文档的变化
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class'],
  });

  // 保存 mutationObserver 引用以便清理
  (initResizeObserver as any).mutationObserver = mutationObserver;
}

/**
 * 初始化列头拖拽功能（使用内联事件处理器）
 */
function initColumnHeaderDrag() {
  nextTick(() => {
    const hotInstance = hotTableRef.value?.hotInstance;
    if (!hotInstance) {
      console.warn('Handsontable 实例不存在');
      return;
    }

    const container = hotInstance.rootElement;
    if (!container) {
      console.warn('Handsontable 根元素不存在');
      return;
    }

    const columnHeader = container.querySelector('thead');
    if (!columnHeader) {
      console.warn('未找到 thead 元素');
      return;
    }

    console.log('✅ 开始初始化列头拖拽（智能方向识别）');
    console.log('✅ Handsontable 列移动已启用，水平拖动可调整列顺序');
    console.log('✅ 垂直拖动 ⋮⋮ 手柄可添加到分组区域');

    // ✅ 不再需要全局事件监听，所有逻辑都在手柄的 onmousedown 中处理

    (initColumnHeaderDrag as any).cleanup = () => {
      console.log('✅ 列头拖拽清理完成');
    };
  });
}

/**
 * 初始化分组区域（只需要添加样式，拖拽接收在 mouseup 中处理）
 */
function initGroupAreaDrop() {
  nextTick(() => {
    const groupArea = document.querySelector('.group-area-tags');
    if (!groupArea) {
      console.warn('未找到分组区域元素');
      return;
    }

    console.log('✅ 分组区域已就绪（拖拽接收由全局 mouseup 事件处理）');
  });
}

// 监听窗口大小变化（带防抖）
let resizeTimer: ReturnType<typeof setTimeout> | null = null;
window.addEventListener('resize', () => {
  if (resizeTimer) {
    clearTimeout(resizeTimer);
  }
  resizeTimer = setTimeout(() => {
    updateTableHeight();
  }, 100);
});

onMounted(() => {
  // 初始化观察者
  initResizeObserver();
  // 默认执行一次查询（查询后会初始化拖拽）
  handleQuery();
});

onUnmounted(() => {
  // 移除窗口resize监听器
  window.removeEventListener('resize', updateTableHeight);

  // 清理所有定时器
  if (heightUpdateTimer) {
    clearTimeout(heightUpdateTimer);
    heightUpdateTimer = null;
  }
  if (resizeTimer) {
    clearTimeout(resizeTimer);
    resizeTimer = null;
  }

  // 清理 ResizeObserver
  if (resizeObserver) {
    resizeObserver.disconnect();
  }

  // 清理 MutationObserver
  const mutationObserver = (initResizeObserver as any).mutationObserver;
  if (mutationObserver) {
    mutationObserver.disconnect();
  }

  // 清理拖拽相关资源
  cleanupSortable();
});

// 创建表单
const [QueryForm, formApi] = useVbenForm({
  schema: formSchema,
  showDefaultActions: true,
  commonConfig: {
    labelWidth: 100,
  },
  wrapperClass: 'grid-cols-5', // 修改为每行5个字段
  showCollapseButton: true,
  collapsed: true,
  submitButtonOptions: {
    content: '查询',
  },
  resetButtonOptions: {
    content: '重置',
  },
  handleSubmit: async (values) => {
    await handleQuery(values);
  },
  handleReset: async () => {
    await handleReset();
  },
});

/**
 * 根据业务类型自动设置港口类型
 */
function setPortTypeByBizType(queryParams: any) {
  const { bizType } = queryParams;

  // 根据业务类型设置港口类型
  if (bizType !== undefined && bizType !== null) {
    if (bizType === 2) {
      // 空运出口
      queryParams.polIsSeaPort = false;
      queryParams.podIsSeaPort = false;
    } else {
      // 海运出口(0)或海运进口(1)
      queryParams.polIsSeaPort = true;
      queryParams.podIsSeaPort = true;
    }
  }

  return queryParams;
}

/**
 * 查询报表数据
 */
async function handleQuery(formData?: any) {
  if (!canView.value) {
    message.warning('您没有权限查看利润报表');
    return;
  }

  try {
    loading.value = true;

    const values = formData || (await formApi.getValues());

    // 根据业务类型自动设置港口类型
    const processedValues = setPortTypeByBizType({ ...values });

    const result = await getProfitReportList(
      processedValues as ReportApi.ProfitReportQueryDto,
    );

    const dataList = result || [];

    // 大数据量测试：将数据复制1000遍
    // const bigDataList = [];
    // for (let i = 0; i < 1000; i++) {
    //   bigDataList.push(...dataList);
    // }

    const transformedData = transformDataForHotTable(dataList);

    originalData.value = [...transformedData];

    applyGrouping(transformedData);

    // 数据加载并渲染后，重新计算表格高度并初始化拖拽
    nextTick(() => {
      updateTableHeight();
      // 使用 setTimeout 确保 Handsontable 完全渲染后再初始化拖拽
      setTimeout(() => {
        initColumnHeaderDrag();
      }, 100);
    });

    message.success(`查询成功，共 ${transformedData.length} 条记录`);
  } catch (error: any) {
    console.error('查询失败:', error);
    message.error(error?.message || '查询失败，请稍后重试');
  } finally {
    loading.value = false;
  }
}

/**
 * 重置查询条件
 */
async function handleReset() {
  await formApi.resetForm();
  tableData.value = [];
  originalData.value = [];
  groupColumns.value = [];
  expandedGroups.value = new Set();

  await nextTick();
  if (hotTableRef.value && hotTableRef.value.hotInstance) {
    hotTableRef.value.hotInstance.loadData([]);
  }
}

/**
 * 处理表格点击事件
 */
function onAfterOnCellMouseDown(
  event: any,
  coords: any,
  TD: HTMLTableCellElement,
) {
  if (coords.row >= 0 && coords.row < tableData.value.length) {
    const rowData = tableData.value[coords.row];
    if (rowData && rowData._isGroupRow) {
      // 点击分组行，切换展开/折叠
      toggleGroupExpand(rowData._groupKey);
    }
    // 数据行双击跳转在 afterOnCellDblClick 中处理
  }
}

/**
 * 添加双击事件处理
 */
function onAfterOnCellDblClick(
  event: any,
  coords: any,
  TD: HTMLTableCellElement,
) {
  if (coords.row >= 0 && coords.row < tableData.value.length) {
    const rowData = tableData.value[coords.row];
    // 排除合计行和分组行
    if (
      rowData &&
      rowData._isDataRow &&
      rowData._originalData &&
      !rowData._isTotalRow
    ) {
      // 双击数据行，跳转详情
      handleViewDetail(rowData._originalData);
    }
  }
}

/**
 * 安全的日期格式化函数
 */
function safeFormatDate(
  dateStr: string | undefined | null,
  format: 'date' | 'month' = 'date',
): string {
  if (!dateStr) {
    return '-';
  }

  // 尝试解析日期
  const date = new Date(dateStr);

  // 检查是否为有效日期
  if (isNaN(date.getTime())) {
    console.warn('无效的日期格式:', dateStr);
    return '-';
  }

  try {
    if (format === 'month') {
      // 使用标准格式 YYYY-MM，避免末尾多余的斜杠
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}/${month}`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    console.warn('日期格式化失败:', dateStr, error);
    return '-';
  }
}

/**
 * 转换数据以适应 Handsontable（支持币别明细拆分）
 */
function transformDataForHotTable(data: ReportApi.ProfitReportDto[]) {
  // 清空币别代码集合
  allCurrencyCodes.value = new Set();

  // 收集所有币别代码
  data.forEach((item) => {
    if (item.currencies && item.currencies.length > 0) {
      item.currencies.forEach((curr) => {
        if (curr.currency?.code) {
          allCurrencyCodes.value.add(curr.currency.code);
        }
      });
    }
  });

  const currencyCodes = Array.from(allCurrencyCodes.value).sort();

  return data.map((item) => {
    // 从 transportOrder 中提取业务字段
    const transportOrder = item.transportOrder;

    // 根据业务类型获取专属字段
    let seaExport: ReportApi.ReportSeaExportDto | null = null;
    let seaImport: ReportApi.ReportSeaImportDto | null = null;
    let airExport: ReportApi.ReportAirExportDto | null = null;

    if (transportOrder) {
      seaExport = transportOrder.seaExport || null;
      seaImport = transportOrder.seaImport || null;
      airExport = transportOrder.airExport || null;
    }

    // 确定港口信息（根据业务类型）
    let pol: any = null;
    let pod: any = null;
    let polRemark: string = '';
    let podRemark: string = '';
    let vessel: string = '';
    let innerVoyno: string = '';
    let bookingAgent: any = null;
    let carrier: any = null;
    let yard: any = null;
    let blType: number | null = null;

    if (seaExport) {
      pol = seaExport.pol;
      pod = seaExport.pod;
      polRemark = seaExport.polRemark || '';
      podRemark = seaExport.podRemark || '';
      vessel = seaExport.vessel || '';
      innerVoyno = seaExport.innerVoyno || '';
      bookingAgent = seaExport.bookingAgent;
      carrier = seaExport.carrier;
      yard = seaExport.yard;
      blType = seaExport.blType;
    } else if (seaImport) {
      pol = seaImport.pol;
      pod = seaImport.pod;
      polRemark = seaImport.polRemark || '';
      podRemark = seaImport.podRemark || '';
      vessel = seaImport.vessel || '';
      innerVoyno = seaImport.innerVoyno || '';
      carrier = seaImport.carrier;
    } else if (airExport) {
      pol = airExport.pol;
      pod = airExport.pod;
      polRemark = airExport.polRemark || '';
      podRemark = airExport.podRemark || '';
      bookingAgent = airExport.bookingAgent;
    }

    const rowData: any = {
      // 行级字段
      transportOrderId: item.transportOrderId,
      changeOrderId: item.changeOrderId,
      isOriginal: item.isOriginal,
      accountDate: safeFormatDate(item.accountDate, 'month'),

      // 业务字段（从 transportOrder 提取）
      bizType: formatBizType(transportOrder?.bizType ?? 0),
      client: transportOrder?.client?.name || '-',
      mblNum: transportOrder?.mblNum || '',
      commissionNum: transportOrder?.commissionNum || '',
      bizDate: safeFormatDate(transportOrder?.bizDate, 'date'),
      settlementDate: safeFormatDate(transportOrder?.settlementDate, 'date'),
      cargoId: transportOrder?.cargoId,
      settlementType: transportOrder?.settlementType,
      pkgs: transportOrder?.pkgs,
      kgs: transportOrder?.kgs,
      cbm: transportOrder?.cbm,

      // 干系人
      sales: (transportOrder?.sales || [])
        .map((u: any) => u.nickName)
        .join(', '),
      operations: (transportOrder?.operations || [])
        .map((u: any) => u.nickName)
        .join(', '),

      // 港口和运输信息
      pol: pol ? pol.code : '-',
      pod: pod ? pod.code : '-',
      polRemark,
      podRemark,
      vessel,
      innerVoyno,

      // 船公司（用于显示列）
      carrier: carrier
        ? carrier.cnShortName || carrier.cnName || carrier.enName
        : '-',

      // 箱型箱量
      ctns: formatCtns(transportOrder?.ctns || []),

      // 金额
      totalReceivable: item.totalReceivable?.toFixed(2) || '',
      totalPayable: item.totalPayable?.toFixed(2) || '',
      totalProfit: item.totalProfit?.toFixed(2) || '',
      totalProfitRate:
        item.totalProfitRate != null
          ? item.totalProfitRate // 保持小数形式
          : null,

      // 原始数据（用于跳转详情）
      _originalData: item,
      _isDataRow: true,
    };

    // 初始化所有币别字段为空值
    currencyCodes.forEach((code) => {
      rowData[`${code}_receivable`] = '';
      rowData[`${code}_payable`] = '';
      rowData[`${code}_profit`] = '';
    });

    // 填充实际的币别数据
    if (item.currencies && item.currencies.length > 0) {
      item.currencies.forEach((curr) => {
        if (curr.currency?.code) {
          const code = curr.currency.code;
          const receivableValue = (curr.receivable || 0).toFixed(2);
          rowData[`${code}_receivable`] =
            receivableValue === '0.00' ? '' : receivableValue;
          rowData[`${code}_payable`] =
            (curr.payable || 0).toFixed(2) === '0.00'
              ? ''
              : (curr.payable || 0).toFixed(2);
          rowData[`${code}_profit`] =
            (curr.profit || 0).toFixed(2) === '0.00'
              ? ''
              : (curr.profit || 0).toFixed(2);
        }
      });
    }

    return rowData;
  });
}

/**
 * 格式化业务类型
 */
function formatBizType(bizType: number) {
  const typeMap: Record<number, string> = {
    0: '海运出口',
    1: '海运进口',
    2: '空运出口',
  };
  return typeMap[bizType] || '-';
}

/**
 * 格式化箱型箱量
 */
function formatCtns(ctns: any[]) {
  if (!ctns || ctns.length === 0) return '-';
  return ctns.map((ctn) => `${ctn.ctnCode.ctnName}×${ctn.count}`).join(', ');
}

/**
 * 格式化币别明细
 */
function formatCurrencies(currencies: any[]) {
  if (!currencies || currencies.length === 0) return '-';
  return currencies
    .map(
      (curr) =>
        `${curr.currency.code}:应收${curr.receivable.toFixed(2)}/应付${curr.payable.toFixed(2)}/利润${curr.profit.toFixed(2)}`,
    )
    .join('; ');
}

/**
 * 跳转到业务详情 /sea-exports/7897b6b1-039f-4b88-ae51-b419f5a85e8f/edit
 */
function handleViewDetail(record: ReportApi.ProfitReportDto) {
  if (!record || !record.transportOrderId) {
    message.warning('该记录没有关联的业务订单，无法跳转详情');
    return;
  }

  // 从 transportOrder 中获取业务类型
  const bizType = record.transportOrder?.bizType ?? 0;

  const bizTypeMap: Record<number, string> = {
    0: 'sea-exports',
    1: 'sea-imports',
    2: 'air-exports',
  };

  const basePath = bizTypeMap[bizType];
  if (!basePath) {
    message.warning('不支持的业务类型，无法跳转详情');
    return;
  }

  router.push({
    path: `/${basePath}/${record.transportOrderId}/edit`,
  });
}

/**
 * 计算合计行数据
 */
function calculateTotalRow(): any {
  const totalRow: any = {
    _isTotalRow: true, // 标记为合计行
  };

  // 初始化所有可见字段为空字符串
  const visibleColumns = columnConfigs.value.filter((col) => col.visible);
  visibleColumns.forEach((col) => {
    totalRow[col.data] = '';
  });

  // 设置分组列显示（如果有分组）
  if (groupColumns.value.length > 0) {
    totalRow._groupDisplay = '合计';
  } else {
    // 无分组时，在第一列无需显示"合计"
    if (visibleColumns.length > 0) {
      totalRow[visibleColumns[0].data] = '';
    }
  }

  // 基于原始数据计算合计（originalData.value 包含所有原始数据）
  const originalDataArray = originalData.value;

  // ✅ 对所有数值列进行合计（包括隐藏的币别列，确保合计完整）
  numericColumns.value.forEach((colName) => {
    let sum = 0;
    let hasData = false;

    originalDataArray.forEach((item) => {
      const value = parseFloat(item[colName]) || 0;
      sum += value;
      hasData = true;
    });

    if (hasData) {
      if (colName === 'totalProfitRate') {
        // 利润率特殊处理：需要重新计算总利润率
        const totalReceivableSum = originalDataArray.reduce((acc, item) => {
          return acc + (parseFloat(item.totalReceivable) || 0);
        }, 0);
        const totalPayableSum = originalDataArray.reduce((acc, item) => {
          return acc + Math.abs(parseFloat(item.totalPayable) || 0);
        }, 0);
        totalRow[colName] =
          totalPayableSum !== 0
            ? `${(((totalReceivableSum - totalPayableSum) / totalPayableSum) * 100).toFixed(2)}%`
            : '-';
      } else {
        const formattedValue = sum.toFixed(2);
        // ✅ 即使值为 0.00 也要显示，不要设为空字符串
        totalRow[colName] = formattedValue;
      }
    } else {
      totalRow[colName] = '0.00';
    }
  });

  return totalRow;
}

// 递归构建树状结构（带聚合数据）
function buildTreeStructure(
  data: any[],
  groupCols: string[],
  level: number = 0,
): any[] {
  if (groupCols.length === 0) {
    // 没有更多分组列，返回原始数据（标记层级）
    return data.map((item) => ({
      ...item,
      _groupLevel: level,
      _isDataRow: true,
    }));
  }

  const [currentGroupCol, ...remainingGroupCols] = groupCols;

  // 按当前分组列分组
  const groups = new Map<string, any[]>();
  data.forEach((item) => {
    const groupValue = item[currentGroupCol as string] || '空값';
    if (!groups.has(groupValue)) {
      groups.set(groupValue, []);
    }
    groups.get(groupValue)?.push(item);
  });

  const result: any[] = [];

  groups.forEach((items, groupName) => {
    // 创建聚合后的分组行数据
    const aggregatedRow: any = {};

    // 设置分组列的值
    aggregatedRow[currentGroupCol as string] = groupName;

    // 聚合其他列的数据
    const visibleColumns = columnConfigs.value.filter((col) => col.visible);
    visibleColumns.forEach((colConfig) => {
      const col = colConfig.data;
      if (col === currentGroupCol) return; // 分组列已经设置

      const values = items.map((item) => item[col]);

      if (numericColumns.value.has(col)) {
        // 数值列：累加
        let sum = 0;
        values.forEach((val) => {
          const numVal = parseFloat(val) || 0;
          sum += numVal;
        });
        const formattedValue = sum.toFixed(2);
        aggregatedRow[col] = formattedValue === '0.00' ? '' : formattedValue;
      } else if (col === 'totalProfitRate') {
        // 利润率特殊处理：根据总利润和总应付计算
        // 正确的公式：利润率 = 利润 / 应付（返回小数形式，显示时会乘以100）
        const totalProfit = items.reduce(
          (acc, item) => acc + (parseFloat(item.totalProfit) || 0),
          0,
        );
        const totalPayable = items.reduce(
          (acc, item) => acc + (parseFloat(item.totalPayable) || 0),
          0,
        );
        aggregatedRow[col] =
          totalPayable !== 0 ? totalProfit / totalPayable : null;
      } else {
        // 文本列：统计每个值的出现次数并格式化显示
        const valueCounts: Record<string, number> = {};
        let totalCount = 0;

        values.forEach((val) => {
          if (val && val !== '-') {
            valueCounts[val] = (valueCounts[val] || 0) + 1;
            totalCount++;
          }
        });

        const uniqueValues = Object.keys(valueCounts);
        if (uniqueValues.length === 0) {
          aggregatedRow[col] = '-';
        } else if (uniqueValues.length === 1) {
          // 只有一个唯一值，显示为 "값(번호)"
          const value = uniqueValues[0];
          const count = valueCounts[value] || 0;
          aggregatedRow[col] = `${value}(${count})`;
        } else {
          // 多个唯一값，显示为 "값1(번호1), 값2(번호2), ..."
          const formattedValues = uniqueValues.map((value) => {
            return `${value}(${valueCounts[value] || 0})`;
          });
          aggregatedRow[col] = formattedValues.join(', ');
        }
      }
    });

    // 添加分组行元数据
    aggregatedRow._isGroupRow = true;
    aggregatedRow._groupName = `${groupName}(${items.length})`;
    aggregatedRow._groupKey = `${currentGroupCol}|${groupName}|${level}`;
    aggregatedRow._groupLevel = level;
    aggregatedRow._groupItems = items;
    aggregatedRow._hasChildren =
      remainingGroupCols.length > 0 || items.length > 0;

    result.push(aggregatedRow);

    // 检查是否展开（即使是第一级也不默认展开，让用户手动控制）
    const isExpanded = expandedGroups.value.has(aggregatedRow._groupKey);

    if (isExpanded) {
      if (remainingGroupCols.length > 0) {
        // 还有更多分组列，递归处理
        const subTree = buildTreeStructure(
          items,
          remainingGroupCols,
          level + 1,
        );
        result.push(...subTree);
      } else {
        // 最后一级，添加原始数据行
        const dataRows = items.map((item) => ({
          ...item,
          _groupLevel: level + 1,
          _isDataRow: true,
          _originalData: item._originalData,
        }));
        result.push(...dataRows);
      }
    }
  });

  return result;
}

// 构建完整的导出树结构（包含所有数据，无论是否展开）
function buildFullExportTree(
  data: any[],
  groupCols: string[],
  level: number = 0,
): any[] {
  if (groupCols.length === 0) {
    // 没有更多分组列，返回原始数据（标记层级）
    return data.map((item) => ({
      ...item,
      _groupLevel: level,
      _isDataRow: true,
    }));
  }

  const [currentGroupCol, ...remainingGroupCols] = groupCols;

  // 按当前分组列分组
  const groups = new Map<string, any[]>();
  data.forEach((item) => {
    const groupValue =
      (currentGroupCol && item[currentGroupCol as string]) || '空값';
    if (!groups.has(groupValue)) {
      groups.set(groupValue, []);
    }
    groups.get(groupValue)?.push(item);
  });

  const result: any[] = [];

  groups.forEach((items, groupName) => {
    // 创建聚合后的分组行数据
    const aggregatedRow: any = {};

    // 设置分组列的值
    aggregatedRow[currentGroupCol as string] = groupName;

    // 聚合其他列的数据（使用所有列，包括隐藏列，用于导出）
    dynamicHotColumns.value.forEach((colConfig) => {
      const col = colConfig.data;
      if (col === currentGroupCol) return; // 分组列已经设置

      const values = items.map((item) => item[col]);

      if (numericColumns.value.has(col)) {
        // 数值列：累加
        let sum = 0;
        values.forEach((val) => {
          const numVal = parseFloat(val) || 0;
          sum += numVal;
        });
        const formattedValue = sum.toFixed(2);
        aggregatedRow[col] = formattedValue === '0.00' ? '' : formattedValue;
      } else if (col === 'totalProfitRate') {
        // 利润率特殊处理：根据总利润和总应付计算
        // 正确的公式：利润率 = 利润 / 应付（返回小数形式，显示时会乘以100）
        const totalProfit = items.reduce(
          (acc, item) => acc + (parseFloat(item.totalProfit) || 0),
          0,
        );
        const totalPayable = items.reduce(
          (acc, item) => acc + (parseFloat(item.totalPayable) || 0),
          0,
        );
        aggregatedRow[col] =
          totalPayable !== 0 ? totalProfit / totalPayable : null;
      } else {
        // 文本列：统计每个值的出现次数并格式化显示
        const valueCounts: Record<string, number> = {};
        let totalCount = 0;

        values.forEach((val) => {
          if (val && val !== '-') {
            valueCounts[val] = (valueCounts[val] || 0) + 1;
            totalCount++;
          }
        });

        const uniqueValues = Object.keys(valueCounts);
        if (uniqueValues.length === 0) {
          aggregatedRow[col] = '-';
        } else if (uniqueValues.length === 1) {
          // 只有一个唯一值，显示为 "값(번호)"
          const value = uniqueValues[0];
          const count = valueCounts[value];
          aggregatedRow[col] = `${value}(${count})`;
        } else {
          // 多个唯一값，显示为 "값1(번호1), 값2(번호2), ..."
          const formattedValues = uniqueValues.map((value) => {
            return `${value}(${valueCounts[value]})`;
          });
          aggregatedRow[col] = formattedValues.join(', ');
        }
      }
    });

    // 添加分组行元数据
    aggregatedRow._isGroupRow = true;
    aggregatedRow._groupName = `${groupName}(${items.length})`;
    aggregatedRow._groupLevel = level;
    aggregatedRow._hasChildren =
      remainingGroupCols.length > 0 || items.length > 0;

    result.push(aggregatedRow);

    // 始终展开所有子节点用于导出
    if (remainingGroupCols.length > 0) {
      // 还有更多分组列，递归处理
      const subTree = buildFullExportTree(items, remainingGroupCols, level + 1);
      result.push(...subTree);
    } else {
      // 最后一级，添加原始数据行
      const dataRows = items.map((item) => ({
        ...item,
        _groupLevel: level + 1,
        _isDataRow: true,
        _originalData: item._originalData,
      }));
      result.push(...dataRows);
    }
  });

  return result;
}

// 获取带对齐样式的列配置
function getColumnsWithAlignment() {
  return dynamicHotColumns.value.map((col) => {
    const isNumeric = numericColumns.value.has(col.data);
    return {
      ...col,
      className: isNumeric ? 'htRight' : 'htLeft',
    };
  });
}

// 创建分组列配置
function createGroupColumn() {
  return {
    data: '_groupDisplay',
    title: '分组',
    width: 250,
    className: 'htLeft', // 分组列左对齐
    renderer: (
      instance: any,
      td: HTMLTableCellElement,
      row: number,
      col: number,
      prop: string,
      value: any,
      cellProperties: any,
    ) => {
      const rowData = tableData.value[row];
      if (rowData?._isGroupRow) {
        // 分组行：显示分组信息和展开/折叠图标
        const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(
          rowData._groupLevel || 0,
        );
        const isExpanded = expandedGroups.value.has(rowData._groupKey);
        const expandIcon = isExpanded ? 'v ​' : '> ';
        td.innerHTML = `${indent}${expandIcon} <strong>${rowData._groupName}</strong>`;
        td.style.backgroundColor = '#e6f7ff';
        //td.style.fontWeight = 'bold';
        td.style.cursor = 'pointer';
      } else if (rowData?._isDataRow) {
        // 数据行：显示缩进
        const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(
          (rowData._groupLevel || 0) + 1,
        );
        td.innerHTML = `${indent}•`;
        td.style.backgroundColor = '#fafafa';
      } else {
        // 晧行
        td.innerHTML = '';
      }
      return td;
    },
  };
}

// 切换分组展开/折叠
function toggleGroupExpand(groupKey: string) {
  const newExpanded = new Set(expandedGroups.value);
  if (newExpanded.has(groupKey)) {
    newExpanded.delete(groupKey);
  } else {
    newExpanded.add(groupKey);
  }
  expandedGroups.value = newExpanded;

  if (originalData.value.length > 0) {
    applyGrouping([...originalData.value]);
  }
}

// 应用分组逻辑
function applyGrouping(data: any[]) {
  console.log(
    '应用分组，分组列:',
    groupColumns.value,
    '数据长度:',
    data.length,
  );

  // 获取可见的列配置
  const visibleColumnConfigs = columnConfigs.value.filter((col) => col.visible);

  let columnsConfig = [];

  if (groupColumns.value.length > 0) {
    // 如果有分组，在最前面添加分组列，并过滤掉已用于分组的列
    const groupedColumnSet = new Set(groupColumns.value);
    const filteredColumns = visibleColumnConfigs
      .filter((col) => !groupedColumnSet.has(col.data))
      .map((col) => {
        const isNumeric = numericColumns.value.has(col.data);
        return {
          ...col,
          className: isNumeric ? 'htRight' : 'htLeft',
        };
      });

    columnsConfig = [createGroupColumn(), ...filteredColumns];
  } else {
    // 无分组时显示所有可见列
    columnsConfig = visibleColumnConfigs.map((col) => {
      const isNumeric = numericColumns.value.has(col.data);
      return {
        ...col,
        className: isNumeric ? 'htRight' : 'htLeft',
      };
    });
  }

  // 保存当前列配置
  currentColumnsRef.value = columnsConfig;

  if (groupColumns.value.length === 0) {
    tableData.value = data.map((item) => ({
      ...item,
      _isDataRow: true,
    }));
    console.log('无分组，显示原始数据');
  } else {
    // 构建树状结构
    const treeData = buildTreeStructure(data, groupColumns.value);
    tableData.value = treeData;

    console.log('分组后的数据长度:', treeData.length);
    console.log('前5条数据:', treeData.slice(0, 5));
  }

  // 添加合计行（只要有数据就显示）
  if (originalData.value.length > 0) {
    const totalRow = calculateTotalRow();
    tableData.value = [...tableData.value, totalRow];
  }

  // 更新 Handsontable 数据
  nextTick(() => {
    if (hotTableRef.value && hotTableRef.value.hotInstance) {
      try {
        hotTableRef.value.hotInstance.loadData(tableData.value);
        // 不再手动更新列配置，由计算属性处理

        console.log(
          'Handsontable 更新完成，当前行数:',
          hotTableRef.value.hotInstance.countRows(),
        );
      } catch (error) {
        console.error('Handsontable 更新失败:', error);
      }
    } else {
      console.warn('HotTable 实例未找到');
    }
  });
}

// 移除分组列
function removeGroupColumn(columnName: string) {
  const index = groupColumns.value.indexOf(columnName);
  if (index > -1) {
    const newGroupColumns = [...groupColumns.value];
    newGroupColumns.splice(index, 1);
    groupColumns.value = newGroupColumns;

    // 清空展开状态，因为分组结构已经改变
    expandedGroups.value = new Set();

    if (originalData.value.length > 0) {
      applyGrouping([...originalData.value]);
    }
  }
}

// 监听分组变化
watch(groupColumns, (newVal, oldVal) => {
  // 如果分组结构发生变化（不是第一次初始化），清空展开状态
  if (oldVal && oldVal.length > 0 && newVal.length !== oldVal.length) {
    expandedGroups.value = new Set();
  }

  if (originalData.value.length > 0) {
    applyGrouping([...originalData.value]);
  }
});

/**
 * 处理分组标签拖拽开始
 */
function handleGroupTagDragStart(
  e: DragEvent,
  columnData: string,
  index: number,
) {
  console.log('🏷️ 开始拖拽分组标签:', columnData, '索引:', index);

  draggedGroupIndex.value = index;

  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnData);
    e.dataTransfer.setData('application/index', String(index));
  }

  // 添加拖拽样式
  setTimeout(() => {
    const target = e.target as HTMLElement;
    if (target) {
      target.style.opacity = '0.5';
    }
  }, 0);
}

/**
 * 处理分组标签拖拽经过
 */
function handleGroupTagDragOver(e: DragEvent, index: number) {
  e.preventDefault();
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
  dragOverGroupIndex.value = index;
}

/**
 * 处理分组标签放置
 */
function handleGroupTagDrop(e: DragEvent, dropIndex: number) {
  e.preventDefault();

  const dragIndexStr = e.dataTransfer?.getData('application/index');
  const columnData = e.dataTransfer?.getData('text/plain');

  if (!dragIndexStr || !columnData) return;

  const dragIndex = parseInt(dragIndexStr, 10);

  console.log('🏷️ 放置分组标签:', columnData, '从', dragIndex, '到', dropIndex);

  if (dragIndex === dropIndex) return;

  // 重新排列数组
  const newGroupColumns = [...groupColumns.value];
  const [movedItem] = newGroupColumns.splice(dragIndex, 1);
  newGroupColumns.splice(dropIndex, 0, movedItem!);

  groupColumns.value = newGroupColumns;

  // 清空展开状态
  expandedGroups.value = new Set();

  // 重新应用分组
  if (originalData.value.length > 0) {
    applyGrouping([...originalData.value]);
  }

  message.success('分组顺序已调整');

  // 重置状态
  draggedGroupIndex.value = null;
  dragOverGroupIndex.value = null;
}

/**
 * 处理分组标签拖拽结束
 */
function handleGroupTagDragEnd(e: DragEvent) {
  console.log('🏷️ 分组标签拖拽结束');

  // 重置状态
  draggedGroupIndex.value = null;
  dragOverGroupIndex.value = null;

  // 恢复样式
  const target = e.target as HTMLElement;
  if (target) {
    target.style.opacity = '1';
  }
}

/**
 * 清理拖拽相关资源
 */
function cleanupSortable() {
  // 清理全局事件监听器
  const dragCleanup = (initColumnHeaderDrag as any).cleanup;
  if (typeof dragCleanup === 'function') {
    dragCleanup();
    console.log('✅ 已清理拖拽事件监听器');
  }

  // 重置状态
  isDraggingColumn = false;
  dragColumnData = {};
  if (dragGhostElement) {
    dragGhostElement.remove();
    dragGhostElement = null;
  }
}

/**
 * 导出当前显示的数据为Excel
 */
function handleExport() {
  if (originalData.value.length === 0) {
    message.warning('没有数据可导出');
    return;
  }

  try {
    let exportData: any[] = [];
    let headers: string[] = [];
    let headerTitles: string[] = [];

    if (groupColumns.value.length > 0) {
      // 有分组的情况 - 使用完整的导出树结构
      const currentColumns = currentColumnsRef.value;
      headers = currentColumns.map((col) => col.data!).filter(Boolean);
      headerTitles = currentColumns
        .map((col) =>
          col.data === '_groupDisplay'
            ? '分组'
            : columnTitleMap[col.data!] || col.data!,
        )
        .filter(Boolean);

      // 构建完整的导出数据（包含所有未展开的数据）
      const fullExportTree = buildFullExportTree(
        [...originalData.value],
        groupColumns.value,
      );

      // 添加合计行
      const totalRow = calculateTotalRow();

      // 处理每一行数据
      for (const row of [...fullExportTree, totalRow]) {
        const exportRow: Record<string, any> = {};

        for (let i = 0; i < headers.length; i++) {
          const colData = headers[i];
          if (colData === '_groupDisplay') {
            // 分组列的特殊处理
            if (row._isGroupRow) {
              exportRow[colData] = row._groupName;
            } else if (row._isTotalRow) {
              exportRow[colData] = '合计';
            } else if (row._isDataRow) {
              // 数据行显示缩进标记
              const indentLevel = (row._groupLevel || 0) + 1;
              exportRow[colData] = '•'.repeat(indentLevel);
            } else {
              exportRow[colData] = '';
            }
          } else {
            // 普通列
            exportRow[colData] = (row as any)[colData] ?? '';
          }
        }

        exportData.push(exportRow);
      }
    } else {
      // 无分组的情况
      const currentColumns = currentColumnsRef.value;
      headers = currentColumns.map((col) => col.data!).filter(Boolean);
      headerTitles = currentColumns
        .map((col) => columnTitleMap[col.data!] || col.data!)
        .filter(Boolean);

      // 包含合计行
      const totalRow = calculateTotalRow();
      const allData = [...originalData.value, totalRow];

      for (const row of allData) {
        const exportRow: Record<string, any> = {};
        for (const col of currentColumns) {
          exportRow[col.data!] = row[col.data!] ?? '';
        }
        exportData.push(exportRow);
      }
    }

    // 创建工作表数据
    const wsData: any[][] = [];

    // 添加表头
    wsData.push(headerTitles);

    // 添加数据行
    for (const row of exportData) {
      const rowData: any[] = [];
      for (const header of headers) {
        rowData.push(row[header]);
      }
      wsData.push(rowData);
    }

    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // 计算列宽（考虑表头和数据内容的最大长度）
    const colWidths = headers.map((header, index) => {
      const title = headerTitles[index] || header;
      let maxWidth = Math.min(50, Math.max(10, title.length + 2)); // 表头长度

      // 检查数据内容的最大长度
      for (const row of exportData) {
        const cellValue = String(row[header] || '');
        const cellLength = cellValue.length;
        if (cellLength > maxWidth && cellLength <= 50) {
          maxWidth = cellLength + 2;
        }
      }

      return { wch: maxWidth };
    });

    // 设置列宽
    ws['!cols'] = colWidths;

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '利润报表');

    // 导出Excel文件
    const timestamp =
      new Date().toLocaleDateString('zh-CN').replace(/\//g, '') +
      '_' +
      new Date().toLocaleTimeString('zh-CN').replace(/[:]/g, '');
    XLSX.writeFile(wb, `利润报表_${timestamp}.xlsx`);

    message.success('导出成功');
  } catch (error) {
    console.error('导出失败:', error);
    message.error('导出失败，请稍后重试');
  }
}
</script>

<template>
  <Page class="profit-report-page">
    <!-- 查询区域 -->
    <Card class="query-card mb-3" :bordered="false">
      <QueryForm />
    </Card>

    <!-- 分组区域 -->
    <div
      class="group-area mb-2 flex items-center rounded border bg-gray-50 px-4"
      style="flex-shrink: 0; width: 100%; height: 40px"
    >
      <span class="mr-2 text-sm text-gray-600">分组</span>
      <div
        v-if="groupColumns.length === 0"
        class="group-area-tags flex-1 text-sm text-gray-400"
      >
        拖拽列标题到此处添加分组
      </div>
      <div v-else class="group-area-tags flex flex-1 flex-wrap gap-1">
        <Tag
          v-for="(col, index) in groupColumns"
          :key="col"
          closable
          draggable="true"
          @dragstart="handleGroupTagDragStart($event, col, index)"
          @dragover.prevent="handleGroupTagDragOver($event, index)"
          @drop="handleGroupTagDrop($event, index)"
          @dragend="handleGroupTagDragEnd"
          @close="
            (e: Event) => {
              e.preventDefault();
              removeGroupColumn(col);
            }
          "
          class="cursor-pointer transition-all duration-200"
          :class="{ 'opacity-50': draggedGroupIndex === index }"
        >
          {{ columnTitleMap[col] || col }}
          <span class="ml-1 text-xs text-gray-500">{{ index + 1 }}级</span>
        </Tag>
      </div>
      <!-- 列配置按钮 -->
      <!-- <Dropdown
        placement="bottomRight"
        trigger="click"
        :visible="columnConfigVisible"
        @visible-change="columnConfigVisible = $event"
      >
        <Button size="small" class="ml-2"> 列配置 </Button>
        <template #overlay>
          <ColumnConfigModal
            v-model="columnConfigVisible"
            :columns="columnConfigs"
            @save="applyColumnConfig"
          />
        </template>
      </Dropdown> -->
      <!-- 导出按钮 -->
      <Button
        type="primary"
        size="small"
        class="ml-2"
        @click="handleExport"
        :disabled="tableData.length === 0"
      >
        导出
      </Button>
    </div>

    <!-- 表格区域 -->
    <Card class="table-card" :bordered="false">
      <div ref="containerRef" class="handsontable-container">
        <HotTable ref="hotTableRef" :settings="hotSettings" />
      </div>
    </Card>
  </Page>
</template>

<style scoped lang="scss">
/* 强制根容器占满高度并移除默认内边距 */
.profit-report-page {
  display: flex;
  flex-direction: column;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

// 覆盖 Page 组件的默认样式
:deep(.vben-page-wrapper) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

// 覆盖 Page 组件的内容区域
:deep(.vben-page-wrapper-content) {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0 !important;
  margin: 0 !important;
  overflow: hidden !important;
}

.group-area {
  flex-shrink: 0;
  min-width: 200px;
  height: 40px;

  // ✅ 分组标签拖拽样式
  :deep(.ant-tag) {
    cursor: grab;
    user-select: none;
    transition: all 0.2s ease;

    &:active {
      cursor: grabbing;
    }

    &.dragging {
      opacity: 0.5;
      transform: scale(0.95);
    }
  }
}

.query-card {
  flex-shrink: 0;

  // 覆盖 Card 组件的默认样式
  :deep(.ant-card-body) {
    padding: 16px 10px 0;
  }
}

.table-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;

  // 覆盖 Card 组件的默认样式
  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0;
    overflow: hidden;
  }
}

.handsontable-container {
  position: relative;
  flex: 1;
  width: 100%;
  min-height: 0;
  overflow: hidden;

  :deep(.handsontable) {
    font-size: 13px;

    .htCore {
      td {
        padding: 6px 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: middle;
        white-space: nowrap;
      }

      tr:not([data-group-row='true']) td {
        cursor: pointer;
      }

      th {
        padding: 6px 4px;
        font-weight: 600;
        vertical-align: middle;
        cursor: pointer; /* 默认指针，表示可点击排序 */

        /* 拖拽手柄样式 */
        .drag-handle {
          cursor: grab !important;

          &:hover {
            background-color: rgb(255 255 255 / 20%);
            border-radius: 3px;
            opacity: 1 !important;
          }

          &:active {
            cursor: grabbing !important;
          }
        }
      }
    }

    :deep(tr[data-group-row='true']) {
      font-weight: bold;
      background-color: #fafafa29 !important;
    }

    :deep(tr[data-detail-row='true']) {
      background-color: #fafafa29 !important;
    }

    :deep(tr[data-total-row='true']) {
      font-weight: bold !important;
      background-color: #f0f0f0 !important;
    }
  }
}

/* 原生拖拽样式 */
.group-area-tags {
  min-height: 32px;
  padding: 4px;
  transition: all 0.3s;

  /* 当有元素拖拽经过时高亮 */
  &.sortable-over {
    background-color: #e6f7ff !important;
    border: 2px dashed #1890ff !important;
  }

  :deep(.ant-tag) {
    transition: all 0.3s;

    &:hover {
      box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
      transform: translateY(-2px);
    }
  }
}
</style>
