<script lang="ts" setup>
import type { ReportApi } from '#/api/system/report';

import { computed, ref, nextTick, onMounted, onUnmounted, watch } from 'vue';

import { HotTable } from '@handsontable/vue3';
import { registerLanguageDictionary, zhCN } from 'handsontable/i18n';

// ✅ 注册中文语言包
registerLanguageDictionary(zhCN);

import { message, Tag, Dropdown, Modal, Checkbox } from 'ant-design-vue';

import {
  getBaseHotColumns,
  getCurrencyColumns,
  getTotalColumns,
} from '../data';

// 导入列配置组件
import ColumnConfigModal from '../modules/ColumnConfigModal.vue';

// 导入 SheetJS
import * as XLSX from 'xlsx';

defineOptions({
  name: 'ProfitReportTable',
});

// Props and emits
const props = defineProps<{
  originalData: ReportApi.ProfitReportDto[];
  groupColumns: string[];
  expandedGroups: Set<string>;
  columnConfigs: any[];
  allCurrencyCodes: Set<string>;
  loading: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:groupColumns', value: string[]): void;
  (e: 'update:expandedGroups', value: Set<string>): void;
  (e: 'update:columnConfigs', value: any[]): void;
  (e: 'viewDetail', record: ReportApi.ProfitReportDto): void;
  (e: 'export'): void;
}>();

// Handsontable 引用
const hotTableRef = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
// 当前显示的列配置
const currentColumnsRef = ref<any[]>([]);
// ✅ 新增：存储隐藏列的状态（索引数组）
const hiddenColumnsRef = ref<number[]>([]);
// ✅ 新增：存储隐藏列的data属性（而不是索引）
const hiddenColumnDataRefs = ref<Set<string>>(new Set());
// 表格数据
const tableData = ref<any[]>([]);

// 分组相关状态
const localGroupColumns = ref<string[]>([...props.groupColumns]);
const localExpandedGroups = ref<Set<string>>(
  new Set([...props.expandedGroups]),
);

// ✅ 新增：存储当前右键点击的列索引
const rightClickColumnIndex = ref<number | null>(null);

// ✅ 分组标签拖拽状态
const draggedGroupIndex = ref<number | null>(null);
const dragOverGroupIndex = ref<number | null>(null);

// ✅ 新增：悬停提示状态
const hoverColumnData = ref<string | null>(null);

// Handsontable 基础列配置
const baseHotColumns = getBaseHotColumns();
// Handsontable 合计列配置
const totalHotColumns = getTotalColumns();

// 动态列配置计算属性
const dynamicHotColumns = computed(() => {
  return [
    ...baseHotColumns,
    ...getCurrencyColumns(Array.from(props.allCurrencyCodes)),
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
  props.allCurrencyCodes.forEach((code) => {
    cols.add(`${code}_receivable`);
    cols.add(`${code}_payable`);
    cols.add(`${code}_profit`);
  });

  return cols;
});

// ✅ 新增：数据处理缓存
const groupingCache = new Map<string, any[]>();
const treeStructureCache = new Map<string, any[]>();

// ✅ 重新添加 clearCaches 函数，确保展开/折叠操作时数据正确性
function clearCaches() {
  groupingCache.clear();
  treeStructureCache.clear();
}

// ✅ 新增：计算可用于分组的列（排除已在分组中的列）
const availableGroupColumns = computed(() => {
  const groupedSet = new Set(localGroupColumns.value);
  return dynamicHotColumns.value.filter(
    (col) =>
      !groupedSet.has(col.data) &&
      col.data !== '_groupDisplay' &&
      !col.data.startsWith('total'), // 排除合计列
  );
});

// ✅ 新增：切换分组展开状态
function toggleGroupExpand(groupKey: string) {
  if (localExpandedGroups.value.has(groupKey)) {
    localExpandedGroups.value.delete(groupKey);
  } else {
    localExpandedGroups.value.add(groupKey);
  }

  // 更新父组件的状态
  emit('update:expandedGroups', Array.from(localExpandedGroups.value));

  // ✅ 重新添加 clearCaches 调用，确保展开/折叠操作时数据正确性
  clearCaches();

  // 重新应用分组（这会触发表格数据更新）
  if (props.originalData.length > 0) {
    applyGrouping([...props.originalData]);
  }
}

// 列选择器相关状态
const showColumnSelector = ref(false);
const selectedColumnsForGroup = ref<string[]>([]);

// 监听动态列变化，更新默认配置
watch(dynamicHotColumns, () => {
  if (props.originalData.length > 0) {
    applyGrouping([...props.originalData]);
  }
});

// 监听外部 props 变化
watch(
  () => props.groupColumns,
  (newVal) => {
    localGroupColumns.value = [...newVal];
  },
);

watch(
  () => props.expandedGroups,
  (newVal) => {
    localExpandedGroups.value = new Set([...newVal]);
  },
);

// 在 setup 函数中添加对组件实例的引用，用于 contextMenu
const componentInstance = {
  localGroupColumns,
  localExpandedGroups,
  currentColumnsRef,
  props,
  emit,
  applyGrouping,
  rightClickColumnIndex,
};

// Handsontable 配置（改为计算属性）
const hotSettings = computed(() => {
  // 获取可见列并按order排序
  // 如果有分组，使用currentColumnsRef（包含分组列），否则使用columnConfigs
  const visibleColumns =
    localGroupColumns.value.length > 0
      ? [...currentColumnsRef.value]
      : [...props.columnConfigs]
          .filter((col) => col.visible)
          .sort((a, b) => a.order - b.order);

  // 计算固定列数量 - 移除固定列以提高性能
  // const leftFixedColumns = visibleColumns.filter((col) => col.fixed === 'left');
  // const rightFixedColumns = visibleColumns.filter(
  //   (col) => col.fixed === 'right',
  // );

  // const fixedColumnsLeft = leftFixedColumns.length;
  // const fixedColumnsRight = rightFixedColumns.length;

  return {
    data: tableData.value,
    columns: visibleColumns.map((col) => {
      const isNumeric = numericColumns.value.has(col.data);
      return {
        ...col,
        className: isNumeric ? 'htRight' : 'htLeft',
        // ✅ 分组时确保每列都有明确的宽度，防止自适应
        width:
          col.width || (localGroupColumns.value.length > 0 ? 150 : undefined),
      };
    }),
    rowHeaders: true,
    colHeaders: true,
    height: '100%', // 使用百分比高度，配合 CSS 实现自适应
    width: '100%',
    // ✅ 分组时禁用 stretchH，防止列宽度根据内容自适应
    stretchH: localGroupColumns.value.length > 0 ? 'none' : 'all',
    manualColumnResize: true,
    manualRowResize: true,

    // ✅ 启用手动列移动功能 - 允许拖拽列头调整列顺序
    manualColumnMove: true,

    // ✅ 重新启用列排序功能
    columnSorting: {
      indicator: true,
      sortEmptyCells: false,
    },

    // ✅ 启用右键菜单和列隐藏/显示功能，使用中文标签
    contextMenu: {
      items: {
        hidden_columns_show: {
          name: '显示隐藏的列',
        },
        hidden_columns_hide: {
          name: '隐藏列',
        },
        // ✅ 添加分隔线
        separator1: '---------',
        // ✅ 添加分组菜单项
        add_to_group: {
          name: '添加到分组',
          callback: function (key, selection, clickEvent) {
            const instance = componentInstance;
            let col = selection[0].start.col;

            // 获取当前列的data属性
            const currentColumns = instance.currentColumnsRef.value;
            if (col < 0 || col >= currentColumns.length) {
              return;
            }

            const columnData = currentColumns[col]?.data;
            const columnTitle = currentColumns[col]?.title || columnData;

            if (!columnData || columnData === '_groupDisplay') {
              message.warning('该列不能用于分组');
              return;
            }

            // 检查是否已经在分组中
            if (instance.localGroupColumns.value.includes(columnData)) {
              message.warning(`"${columnTitle}" 已在分组中`);
              return;
            }

            // 添加到分组
            instance.localGroupColumns.value.push(columnData);
            instance.emit('update:groupColumns', [
              ...instance.localGroupColumns.value,
            ]);

            // 清空展开状态
            instance.localExpandedGroups.value = new Set();
            instance.emit('update:expandedGroups', new Set());

            if (instance.props.originalData.length > 0) {
              instance.applyGrouping([...instance.props.originalData]);
            }

            message.success(`已将 "${columnTitle}" 添加到分组`);
          },
          disabled: function () {
            const instance = componentInstance;
            const col = instance.rightClickColumnIndex.value;

            // 如果没有有效的列索引，启用菜单项（让callback处理验证）
            // 这解决了第一次右键时菜单项灰色的问题
            if (col === null || col < 0) {
              return false;
            }

            // 获取当前列的data属性
            const currentColumns = instance.currentColumnsRef.value;
            if (col >= currentColumns.length) {
              return false; // 启用菜单项，让callback处理
            }

            const columnData = currentColumns[col]?.data;

            // 如果列数据无效，启用菜单项，让callback处理
            if (!columnData) {
              return false;
            }

            // 如果是分组列（_groupDisplay），禁用分组功能
            if (columnData === '_groupDisplay') {
              return true;
            }

            // 如果是合计列（以total开头），禁用分组功能
            if (columnData.startsWith('total')) {
              return true;
            }

            // 如果已经在分组中，禁用
            return instance.localGroupColumns.value.includes(columnData);
          },
        },
      },
    },

    // ✅ 配置隐藏列功能
    hiddenColumns: {
      columns: hiddenColumnsRef.value, // 使用计算后的隐藏列索引
      indicators: true, // 显示隐藏列指示器（小箭头）
      copyPasteEnabled: false, // 隐藏列不参与复制粘贴
    },

    // ✅ 设置语言为中文
    language: zhCN.languageCode,

    readOnly: true,
    licenseKey: 'non-commercial-and-evaluation',
    className: 'htCenter htMiddle',
    rowHeight: 28,
    autoWrapRow: false,
    autoWrapCol: false,

    // ✅ 移除固定列以提高滚动性能
    fixedColumnsLeft: 0, // Math.min(fixedColumnsLeft, visibleColumns.length - 1), // 确保不超过总列数
    fixedColumnsRight: 0, // Math.min(
    // fixedColumnsRight,
    // visibleColumns.length - fixedColumnsLeft,
    // ),

    afterGetColHeader: (col: number, TH: HTMLTableCellElement) => {
      TH.style.backgroundColor = '#1890ff';
      TH.style.color = '#ffffff';
      TH.style.fontWeight = '600';
      TH.style.textAlign = 'center';

      // ✅ 如果是分组列或序号列，不显示任何特殊功能
      const isGroupColumn = localGroupColumns.value.length > 0 && col === 0;
      const isRowHeaderColumn = col === -1; // Handsontable 的序号列索引为 -1

      if (isGroupColumn || isRowHeaderColumn) {
        TH.style.cursor = 'default';
        TH.title = '';
        return;
      }

      // ✅ 移除拖拽手柄创建逻辑，只保留提示信息
      TH.style.position = 'relative';

      // 提示用户可以使用排序和右键菜单功能
      TH.style.cursor = 'pointer';
      TH.title = '左键单击排序 | 右键菜单可进行分组操作';
    },
    //afterOnCellMouseDown: onAfterOnCellMouseDown,
    afterDblClick: onAfterOnCellDblClick, // 添加双击事件处理
    // 添加单元格渲染后的事件处理（用于分组列的点击和悬浮提示）
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
        if (!TD.parentElement?.hasAttribute('data-total-row')) {
          TD.parentElement?.setAttribute('data-total-row', 'true');
        }
        if (TD.style.fontWeight !== 'bold') {
          TD.style.fontWeight = 'bold';
        }
        return;
      }

      // ✅ 优化：只在必要时设置 title
      const cellValue = value?.toString() || '';
      if (cellValue && cellValue !== '-' && cellValue.trim() !== '') {
        if (TD.title !== cellValue) {
          TD.title = cellValue;
        }
      } else if (TD.title) {
        TD.title = '';
      }

      // 移除分组列的点击事件处理（现在在renderer中处理）
      if (col === 0 && localGroupColumns.value.length > 0) {
        if (rowData?._isGroupRow) {
          if (TD.style.cursor !== 'pointer') {
            TD.style.cursor = 'pointer';
          }
          // 点击事件现在在renderer中处理，这里不再处理
        } else if (TD.style.cursor === 'pointer') {
          TD.style.cursor = 'default';
        }
      } else if (
        TD.style.cursor === 'pointer' &&
        !(rowData?._isGroupRow && col === 0)
      ) {
        TD.style.cursor = 'default';
      }
    },
    // ✅ 添加右键菜单事件处理，捕获点击位置
    afterOnCellContextMenu: (event: MouseEvent, coords: any) => {
      // 存储当前右键点击的列索引
      if (coords && coords.col !== undefined) {
        rightClickColumnIndex.value = coords.col;
      }
    },
    // ✅ 添加列头右键菜单事件处理
    afterOnColumnHeaderContextMenu: (event: MouseEvent, col: number) => {
      // 存储当前右键点击的列索引
      if (col !== undefined) {
        rightClickColumnIndex.value = col;
      }
    },
    // ✅ 监听隐藏列变化
    afterHideColumns: (
      currentHideConfig: number[],
      destinationHideConfig: number[],
    ) => {
      const hotInstance = hotTableRef.value?.hotInstance;
      if (!hotInstance) return;

      const columns = hotInstance.getSettings().columns || [];
      const hiddenData = new Set<string>();
      destinationHideConfig.forEach((colIndex) => {
        const colConfig = columns[colIndex];
        if (colConfig && colConfig.data) {
          hiddenData.add(colConfig.data);
        }
      });
      hiddenColumnDataRefs.value = hiddenData;
    },
    // ✅ 监听取消隐藏列变化
    afterUnhideColumns: (
      currentHideConfig: number[],
      destinationHideConfig: number[],
    ) => {
      const hotInstance = hotTableRef.value?.hotInstance;
      if (!hotInstance) return;

      const columns = hotInstance.getSettings().columns || [];
      const hiddenData = new Set<string>();
      destinationHideConfig.forEach((colIndex) => {
        const colConfig = columns[colIndex];
        if (colConfig && colConfig.data) {
          hiddenData.add(colConfig.data);
        }
      });
      hiddenColumnDataRefs.value = hiddenData;
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
 * 初始化列头拖拽功能（使用内联事件处理器） - 已完全移除拖拽功能，此函数不再需要
 */
// function initColumnHeaderDrag() {
//   nextTick(() => {
//     const hotInstance = hotTableRef.value?.hotInstance;
//     if (!hotInstance) {
//       console.warn('Handsontable 实例不存在');
//       return;
//     }

//     const container = hotInstance.rootElement;
//     if (!container) {
//       console.warn('Handsontable 根元素不存在');
//       return;
//     }

//     const columnHeader = container.querySelector('thead');
//     if (!columnHeader) {
//       console.warn('未找到 thead 元素');
//       return;
//     }

//     (initColumnHeaderDrag as any).cleanup = () => {
//       console.log('✅ 列头拖拽清理完成');
//     };
//   });
// }

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

  // 如果有数据，应用分组
  if (props.originalData.length > 0) {
    applyGrouping([...props.originalData]);
  }

  // 默认执行一次高度更新
  updateTableHeight();
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

  // ✅ 移除拖拽相关资源清理（已完全移除拖拽功能）
  // if (dragGhostElement) {
  //   dragGhostElement.remove();
  //   dragGhostElement = null;
  // }
  // isDraggingColumn = false;
  // dragColumnData = {};

  // 移除可能残留的全局事件监听器
  document.querySelectorAll('.column-drag-ghost').forEach((el) => el.remove());
  // document.querySelector('.group-area-tags')?.classList.remove('sortable-over');
});

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
        const isExpanded = localExpandedGroups.value.has(rowData._groupKey);
        const expandIcon = isExpanded ? 'v ​' : '> ';
        td.innerHTML = `${indent}${expandIcon} <strong>${rowData._groupName}</strong>`;
        td.style.backgroundColor = '#e6f7ff';
        //td.style.fontWeight = 'bold';
        td.style.cursor = 'pointer';

        // ✅ 直接在renderer中处理点击事件，避免闭包问题
        // 移除之前的事件处理器（如果存在）
        const existingHandler = (td as any)._groupClickHandler;
        if (existingHandler) {
          td.removeEventListener('click', existingHandler);
        }

        // 创建新的点击处理器
        const handleClick = () => {
          toggleGroupExpand(rowData._groupKey);
        };

        // 绑定点击事件
        td.addEventListener('click', handleClick);
        (td as any)._groupClickHandler = handleClick;
      } else if (rowData?._isDataRow) {
        // 数据行：显示缩进
        const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(
          (rowData._groupLevel || 0) + 1,
        );
        td.innerHTML = `${indent}•`;
        td.style.backgroundColor = '#fafafa';
        td.style.cursor = 'default';

        // 移除可能存在的点击事件
        const existingHandler = (td as any)._groupClickHandler;
        if (existingHandler) {
          td.removeEventListener('click', existingHandler);
          delete (td as any)._groupClickHandler;
        }
      } else {
        // 晧行
        td.innerHTML = '';
        td.style.cursor = 'default';

        // 移除可能存在的点击事件
        const existingHandler = (td as any)._groupClickHandler;
        if (existingHandler) {
          td.removeEventListener('click', existingHandler);
          delete (td as any)._groupClickHandler;
        }
      }
      return td;
    },
  };
}

// 应用分组逻辑
function applyGrouping(data: any[]) {
  console.log(
    '应用分组，分组列:',
    localGroupColumns.value,
    '数据长度:',
    data.length,
  );

  // ✅ 修复：缓存键必须包含展开状态，否则展开/折叠操作不会生效
  const expandedGroupsKey = Array.from(localExpandedGroups.value)
    .sort()
    .join('|');
  const cacheKey = `${localGroupColumns.value.join('|')}_${expandedGroupsKey}_${data.length}`;

  // ✅ 使用缓存键避免重复计算
  if (groupingCache.has(cacheKey)) {
    const cachedResult = groupingCache.get(cacheKey);
    if (cachedResult) {
      tableData.value = cachedResult;
      return;
    }
  }

  // 获取可见的列配置
  const visibleColumnConfigs = props.columnConfigs.filter((col) => col.visible);

  let columnsConfig = [];

  if (localGroupColumns.value.length > 0) {
    // 如果有分组，在最前面添加分组列，并过滤掉已用于分组的列
    const groupedColumnSet = new Set(localGroupColumns.value);
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

  // ✅ 计算应该隐藏的列索引
  const newHiddenColumnIndexes: number[] = [];
  columnsConfig.forEach((col, index) => {
    if (hiddenColumnDataRefs.value.has(col.data)) {
      newHiddenColumnIndexes.push(index);
    }
  });
  hiddenColumnsRef.value = newHiddenColumnIndexes;

  if (localGroupColumns.value.length === 0) {
    tableData.value = data.map((item) => ({
      ...item,
      _isDataRow: true,
    }));
    console.log('无分组，显示原始数据');
  } else {
    // 构建树状结构
    const treeData = buildTreeStructure(data, localGroupColumns.value);
    tableData.value = treeData;

    console.log('分组后的数据长度:', treeData.length);
    console.log('前5条数据:', treeData.slice(0, 5));
  }

  // 添加合计行（只要有数据就显示）
  if (props.originalData.length > 0) {
    const totalRow = calculateTotalRow();
    tableData.value = [...tableData.value, totalRow];
  }

  // 更新 Handsontable 数据
  nextTick(() => {
    if (hotTableRef.value && hotTableRef.value.hotInstance) {
      try {
        hotTableRef.value.hotInstance.loadData(tableData.value);
        // 强制重新渲染，确保折叠/展开操作正确显示
        //hotTableRef.value.hotInstance.render();
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

  // ✅ 缓存结果
  groupingCache.set(cacheKey, tableData.value);
}

// 递归构建树状结构（带聚合数据）
function buildTreeStructure(
  data: any[],
  groupCols: string[],
  level: number = 0,
): any[] {
  // ✅ 修复：缓存键必须包含展开状态，否则展开/折叠操作不会生效
  const expandedGroupsKey = Array.from(localExpandedGroups.value)
    .sort()
    .join('|');
  const cacheKey = `${groupCols.join('|')}_${level}_${data.length}_${expandedGroupsKey}`;
  if (treeStructureCache.has(cacheKey)) {
    return treeStructureCache.get(cacheKey)!;
  }

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
    const groupValue = item[currentGroupCol as string] || '空值';
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
    const visibleColumns = props.columnConfigs.filter((col) => col.visible);
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
        // 利润率特殊处理：需要重新计算总利润率
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
          // 多个唯一值，显示为 "값1(번호1), 값2(번호2), ..."
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
    const isExpanded = localExpandedGroups.value.has(aggregatedRow._groupKey);

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

  treeStructureCache.set(cacheKey, result);
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

// 计算合计行数据
function calculateTotalRow(): any {
  const totalRow: any = {
    _isTotalRow: true, // 标记为合计行
  };

  // 初始化所有可见字段为空字符串
  const visibleColumns = props.columnConfigs.filter((col) => col.visible);
  visibleColumns.forEach((col) => {
    totalRow[col.data] = '';
  });

  // 设置分组列显示（如果有分组）
  if (localGroupColumns.value.length > 0) {
    totalRow._groupDisplay = '合计';
  } else {
    // 无分组时，在第一列无需显示"合计"
    if (visibleColumns.length > 0) {
      totalRow[visibleColumns[0].data] = '';
    }
  }

  // 基于原始数据计算合计（originalData.value 包含所有原始数据）
  const originalDataArray = props.originalData;

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

// 移除分组列
function removeGroupColumn(columnName: string) {
  const index = localGroupColumns.value.indexOf(columnName);
  if (index > -1) {
    const newGroupColumns = [...localGroupColumns.value];
    newGroupColumns.splice(index, 1);
    localGroupColumns.value = newGroupColumns;
    emit('update:groupColumns', newGroupColumns);

    // 清空展开状态，因为分组结构已经改变
    localExpandedGroups.value = new Set();
    emit('update:expandedGroups', new Set());

    // ✅ 重新添加 clearCaches 调用，确保移除分组列时数据正确性
    clearCaches();

    if (props.originalData.length > 0) {
      applyGrouping([...props.originalData]);
    }

    message.success(
      `已移除分组 "${columnTitleMap.value[columnName] || columnName}"`,
    );
  }
}

// ✅ 新增：清空所有分组
function clearAllGroups() {
  if (localGroupColumns.value.length === 0) return;

  localGroupColumns.value = [];
  emit('update:groupColumns', []);

  localExpandedGroups.value = new Set();
  emit('update:expandedGroups', new Set());

  // ✅ 重新添加 clearCaches 调用，确保清空分组时数据正确性
  clearCaches();

  if (props.originalData.length > 0) {
    applyGrouping([...props.originalData]);
  }

  message.success('已清空所有分组');
}

// ✅ 新增：处理添加选中的列到分组
function handleAddSelectedColumns() {
  if (selectedColumnsForGroup.value.length === 0) {
    message.warning('请至少选择一个列');
    return;
  }

  // 将选中的列添加到分组
  selectedColumnsForGroup.value.forEach((colData) => {
    if (!localGroupColumns.value.includes(colData)) {
      localGroupColumns.value.push(colData);
    }
  });

  emit('update:groupColumns', [...localGroupColumns.value]);

  // 清空展开状态
  localExpandedGroups.value = new Set();
  emit('update:expandedGroups', new Set());

  // 重新应用分组
  if (props.originalData.length > 0) {
    applyGrouping([...props.originalData]);
  }

  message.success(`已添加 ${selectedColumnsForGroup.value.length} 个分组`);

  // 关闭弹窗并重置选择
  showColumnSelector.value = false;
  selectedColumnsForGroup.value = [];
}

// 监听分组变化
watch(localGroupColumns, (newVal, oldVal) => {
  // 如果分组结构发生变化（不是第一次初始化），清空展开状态
  if (oldVal && oldVal.length > 0 && newVal.length !== oldVal.length) {
    localExpandedGroups.value = new Set();
    emit('update:expandedGroups', new Set());
  }

  if (props.originalData.length > 0) {
    applyGrouping([...props.originalData]);
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
  const newGroupColumns = [...localGroupColumns.value];
  const [movedItem] = newGroupColumns.splice(dragIndex, 1);
  newGroupColumns.splice(dropIndex, 0, movedItem!);

  localGroupColumns.value = newGroupColumns;
  emit('update:groupColumns', newGroupColumns);

  // 清空展开状态
  localExpandedGroups.value = new Set();
  emit('update:expandedGroups', new Set());

  // 重新应用分组
  if (props.originalData.length > 0) {
    applyGrouping([...props.originalData]);
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
 * 清理拖拽相关资源 - 由于移除了拖拽功能，这个函数也不需要了
 */
// function cleanupSortable() {
//   // 清理全局事件监听器
//   const dragCleanup = (initColumnHeaderDrag as any).cleanup;
//   if (typeof dragCleanup === 'function') {
//     dragCleanup();
//     console.log('✅ 已清理拖拽事件监听器');
//   }

//   // 重置状态
//   isDraggingColumn = false;
//   dragColumnData = {};
//   if (dragGhostElement) {
//     dragGhostElement.remove();
//     dragGhostElement = null;
//   }
// }

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
      emit('viewDetail', rowData._originalData);
    }
  }
}

/**
 * 导出当前显示的数据为Excel
 */
function handleExport() {
  if (props.originalData.length === 0) {
    message.warning('没有数据可导出');
    return;
  }

  try {
    let exportData: any[] = [];
    let headers: string[] = [];
    let headerTitles: string[] = [];

    if (localGroupColumns.value.length > 0) {
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
        [...props.originalData],
        localGroupColumns.value,
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
      const allData = [...props.originalData, totalRow];

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
  <!-- 分组区域 -->
  <div
    class="group-area mb-2 flex items-center rounded border bg-gradient-to-r from-blue-50 to-indigo-50 px-4 transition-all duration-300"
    :class="{
      'border-gray-200': true,
    }"
    style="flex-shrink: 0; width: 100%; min-height: 48px; padding: 8px 16px"
  >
    <div class="flex w-full items-center gap-2">
      <!-- 分组标签图标 -->
      <span class="flex items-center text-sm font-medium text-gray-700">
        <svg
          class="mr-1 h-4 w-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M4 6h16M4 12h16M4 18h7"
          />
        </svg>
        分组
      </span>

      <!-- 空状态提示 - 增强视觉效果 -->
      <div
        v-if="localGroupColumns.length === 0"
        class="group-area-tags flex flex-1 items-center justify-center rounded border-2 border-dashed border-gray-300 bg-white py-2 text-sm text-gray-500 transition-all duration-300"
      >
        <div class="flex items-center gap-2">
          <!-- <svg
            class="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
            />
          </svg> -->
          <span class="font-medium"> 右键点击列标题可添加分组 </span>
        </div>
      </div>

      <!-- 分组标签列表 - 增强交互反馈 -->
      <div
        v-else
        class="group-area-tags flex flex-1 flex-wrap gap-2"
        :class="{
          'sortable-over': dragOverGroupIndex !== null,
        }"
      >
        <Tag
          v-for="(col, index) in localGroupColumns"
          :key="col"
          closable
          draggable="true"
          @dragstart="handleGroupTagDragStart($event, col, index)"
          @dragover.prevent="handleGroupTagDragOver($event, index)"
          @drop="handleGroupTagDrop($event, index)"
          @dragend="handleGroupTagDragEnd"
          @mouseenter="hoverColumnData = col"
          @mouseleave="hoverColumnData = null"
          @close="
            (e: Event) => {
              e.preventDefault();
              removeGroupColumn(col);
            }
          "
          class="group-tag cursor-grab rounded-md border transition-all duration-200 hover:shadow-md"
          :class="{
            'scale-95 opacity-50': draggedGroupIndex === index,
            'ring-2 ring-blue-400 ring-offset-2': dragOverGroupIndex === index,
            'border-blue-600 bg-gradient-to-r from-blue-500 to-indigo-500 text-white':
              hoverColumnData === col,
            'border-gray-200 bg-white hover:border-blue-300':
              hoverColumnData !== col,
          }"
          style="min-height: 28px; padding: 4px 8px"
        >
          <span class="inline-flex items-center gap-1 whitespace-nowrap">
            <!-- 拖拽手柄图标 -->
            <svg
              v-if="hoverColumnData === col || draggedGroupIndex === index"
              class="h-3 w-3 flex-shrink-0 cursor-grab active:cursor-grabbing"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M4 8h16M4 16h16"
              />
            </svg>
            <span class="font-medium">{{ columnTitleMap[col] || col }}</span>
            <span
              class="ml-1 flex-shrink-0 rounded bg-white/20 px-1.5 py-0.5 text-xs"
              :class="{
                'text-white/80': hoverColumnData === col,
                'text-gray-500': hoverColumnData !== col,
              }"
            >
              {{ index + 1 }}级
            </span>
          </span>
        </Tag>
      </div>

      <!-- 操作按钮组 -->
      <div class="flex items-center gap-2">
        <!-- 清空分组按钮 -->
        <Button
          v-if="localGroupColumns.length > 0"
          size="small"
          type="text"
          danger
          @click="clearAllGroups"
          class="text-xs"
        >
          清空
        </Button>

        <!-- 导出按钮 -->
        <Button
          type="primary"
          size="small"
          @click="handleExport"
          :disabled="tableData.length === 0"
        >
          导出
        </Button>
      </div>
    </div>
  </div>

  <!-- 列选择器弹窗 -->
  <Modal
    v-model:open="showColumnSelector"
    title="选择分组列"
    width="600px"
    @ok="handleAddSelectedColumns"
  >
    <div class="max-h-96 overflow-y-auto">
      <Checkbox.Group
        v-model:value="selectedColumnsForGroup"
        class="flex flex-col gap-3"
      >
        <Checkbox
          v-for="col in availableGroupColumns"
          :key="col.data"
          :value="col.data"
          class="rounded border p-2 hover:bg-gray-50"
        >
          <div class="flex items-center gap-2">
            <span class="font-medium">{{ col.title }}</span>
            <span class="text-xs text-gray-500">({{ col.data }})</span>
          </div>
        </Checkbox>
      </Checkbox.Group>
    </div>
  </Modal>

  <!-- 表格区域 -->
  <Card class="table-card" :bordered="false">
    <div ref="containerRef" class="handsontable-container">
      <HotTable ref="hotTableRef" :settings="hotSettings" />
    </div>
  </Card>
</template>

<style scoped lang="scss">
/* ✅ 新增：拖拽提示动画 */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.group-area {
  flex-shrink: 0;
  min-width: 200px;

  // ✅ 恢复分组标签拖拽样式增强
  :deep(.ant-tag) {
    display: inline-flex;
    align-items: center;
    max-width: 100%;
    white-space: nowrap;
    cursor: grab;
    user-select: none;
    transition: all 0.2s ease;

    // 确保关闭按钮和内容在一行
    .ant-tag-close-icon {
      display: inline-flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 22px; // 进一步增大宽度
      height: 22px; // 进一步增大高度
      margin-left: 6px; // 增加左边距，避免与文字重叠
      font-size: 16px; // 进一步增大字体大小（图标大小）
      line-height: 22px; // 确保垂直居中
      cursor: pointer; // 确保有手型光标
      border-radius: 50%; // 圆形背景
      transition: all 0.2s ease;

      &:hover {
        color: #ff4d4f; // 悬停时显示红色
        background-color: rgb(0 0 0 / 15%);
        transform: scale(1.15);
      }

      // 点击时的反馈
      &:active {
        background-color: rgb(0 0 0 / 20%);
        transform: scale(0.95);
      }
    }

    &:active {
      cursor: grabbing;
    }

    &.dragging {
      opacity: 0.5;
      transform: scale(0.95);
    }

    // 添加悬停效果
    &:hover {
      box-shadow: 0 2px 8px rgb(0 0 0 / 15%);
      transform: translateY(-1px);
    }
  }
}

// ✅ 恢复分组区域拖拽高亮样式
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

  /* ✅ 添加硬件加速优化 */
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1px;

  :deep(.handsontable) {
    font-size: 13px;

    /* ✅ 为Handsontable根元素添加硬件加速 */
    transform: translateZ(0);
    backface-visibility: hidden;
    perspective: 1px;
    will-change: transform, opacity;

    .htCore {
      /* ✅ 为核心表格区域添加硬件加速 */
      transform: translateZ(0);
      backface-visibility: hidden;
      perspective: 1px;
      will-change: transform, scroll-position;

      td {
        padding: 6px 2px;
        overflow: hidden;
        text-overflow: ellipsis;
        vertical-align: middle;
        white-space: nowrap;

        /* ✅ 为单元格添加硬件加速 */
        transform: translateZ(0);
        backface-visibility: hidden;
      }

      tr:not([data-group-row='true']) td {
        cursor: pointer;
      }

      th {
        padding: 6px 4px;
        font-weight: 600;
        vertical-align: middle;
        cursor: pointer; /* 默认指针，表示可点击排序 */
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
</style>
