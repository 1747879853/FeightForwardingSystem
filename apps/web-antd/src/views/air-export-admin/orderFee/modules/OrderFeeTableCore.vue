<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import type { SeaExportAdminApi } from '#/api/sea-export/sea-export-admin';

import { ref, onMounted, onBeforeUnmount } from 'vue';

import { HotTable } from '@handsontable/vue3';
interface Props {
  dataSource: OrderFeeAdminApi.OrderFeeDto[];
  selectedRowKeys: (string | number)[];
  hotSettings: any;
  dropdownSources?: {
    feeCodeList: Array<{ label: string; value: any }>;
    industryCategoryList: Array<{ label: string; value: any }>;
    currencyList: Array<{ label: string; value: any }>;
    unitList: Array<{ label: string; value: any }>;
  };
  orderDetail?: SeaExportAdminApi.SeaExportDto | null; // 新增：订单详情
  sortableFields?: Set<string>; // 可排序字段列表
  sortState?: {
    field: string | null;
    order: 'asc' | 'desc' | null;
  }; // 排序状态
}

const props = defineProps<Props>();

const emit = defineEmits([
  'update:selectedRowKeys',
  'column-sort',
  'add-new-row',
]);

const hotTableRef = ref<any>(null);

// ✅ 新增：跟踪当前编辑的单元格
const currentEditingCell = ref<{
  row: number;
  col: number;
  td: HTMLElement | null;
} | null>(null);

// ✅ 新增：清除编辑状态的辅助函数
const clearEditingState = () => {
  if (currentEditingCell.value?.td) {
    const td = currentEditingCell.value.td;
    td.style.color = '';
    td.style.opacity = '';
    td.style.visibility = '';

    // 恢复文本节点的显示
    const textNodes = Array.from(td.childNodes).filter(
      (node) => node.nodeType === Node.TEXT_NODE,
    );
    textNodes.forEach((node) => {
      (node as Text).textContent =
        (node as Text).textContent?.replace(/^\s*$/, '') || '';
    });
  }
  currentEditingCell.value = null;
};

// ✅ 新增：添加缺失的状态变量
const isClosed = ref(false);
const currentSelectContainer = ref<HTMLElement | null>(null);
const currentCloseHandler = ref<((e: MouseEvent) => void) | null>(null);
// ==================== 数据缓存 ====================

// 客户列表缓存（按行业类别分类）
const clientListCache = ref<
  Record<string, Array<{ label: string; value: any }>>
>({});
const clientListLoading = ref<Record<string, boolean>>({});

// 费用代码列表缓存
const feeCodeListCache = ref<Array<{ label: string; value: any }>>([]);

// ✅ 新增：获取费用代码标签
const getFeeCodeLabel = (value: any): string => {
  if (!value) return '';
  const option = props.dropdownSources?.feeCodeList?.find(
    (item) => item.value === value,
  );
  return option?.label || String(value);
};

// ✅ 新增：获取行业类别标签
const getIndustryCategoryLabel = (value: any): string => {
  if (!value) return '';
  const option = props.dropdownSources?.industryCategoryList?.find(
    (item) => item.value === value,
  );
  return option?.label || String(value);
};

// ✅ 新增：获取币别标签
const getCurrencyLabel = (value: any): string => {
  if (!value) return '';
  const option = props.dropdownSources?.currencyList?.find(
    (item) => item.value === value,
  );
  return option?.label || String(value);
};

// ✅ 新增：获取费用状态标签
const getFeeStatusLabel = (value: any): string => {
  const statusMap: Record<number, string> = {
    0: '未发生',
    1: '已发生',
    2: '待核销',
    3: '已核销',
  };
  return statusMap[value] || '';
};

// ✅ 新增：获取开票状态标签
const getInvoiceStatusLabel = (value: any): string => {
  const statusMap: Record<number, string> = {
    0: '未开票',
    1: '部分开票',
    2: '已开票',
  };
  return statusMap[value] || '';
};

// ✅ 新增：获取数据录入方式标签
const getDataEntryMethodLabel = (value: any): string => {
  const methodMap: Record<number, string> = {
    0: '手工录入',
    1: '模板导入',
    2: '系统生成',
  };
  return methodMap[value] || '';
};

// ✅ 新增：格式化日期时间
const formatDateTime = (value: any): string => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('zh-CN');
  } catch (error) {
    return String(value);
  }
};

// ✅ 新增：获取排序图标
const getSortIcon = (field: string): string => {
  if (!props.sortState?.field || props.sortState.field !== field) {
    return ''; // 未排序状态不显示箭头
  }
  return props.sortState.order === 'asc'
    ? '<span style="color: #1890ff; font-size: 12px;">▼</span>' // 升序显示向下箭头（实心三角形）
    : '<span style="color: #1890ff; font-size: 12px;">▲</span>'; // 降序显示向上箭头（实心三角形）
};

/**
 * 处理行选择
 */
const handleAfterSelection = (
  row: number,
  column: number,
  row2: number,
  column2: number,
) => {
  const selectedRows = props.dataSource.slice(row, row2 + 1);
  const keys = selectedRows.map((r) => (r as any)._rowKey);
  emit('update:selectedRowKeys', keys);
};

/**
 * 处理数据变化
 */
const handleAfterChange = (
  changes: any,
  source: string,
  syncFee: () => void,
) => {
  if (source !== 'loadData') {
    syncFee();
  }
};

// ✅ 新增：处理自定义的新增行事件
const handleAddNewRowEvent = (event: Event) => {
  const customEvent = event as CustomEvent;
  console.log('📍 [OrderFeeTableCore] 接收到新增行事件', customEvent.detail);
  emit('add-new-row', customEvent.detail);
};

onMounted(() => {
  // 延迟监听，确保 hotInstance 已完全初始化
  setTimeout(() => {
    if (hotTableRef.value?.hotInstance) {
      const container = hotTableRef.value.hotInstance.rootElement;
      if (container) {
        container.addEventListener(
          'addNewRow',
          handleAddNewRowEvent as EventListener,
        );
        console.log('✅ [OrderFeeTableCore] 已添加 addNewRow 事件监听器');
      } else {
        console.warn('⚠️ [OrderFeeTableCore] rootElement 不存在');
      }
    } else {
      console.warn('⚠️ [OrderFeeTableCore] hotInstance 不存在');
    }
  }, 100);
});

onBeforeUnmount(() => {
  // 清理事件监听器
  if (hotTableRef.value?.hotInstance) {
    const container = hotTableRef.value.hotInstance.rootElement;
    if (container) {
      container.removeEventListener(
        'addNewRow',
        handleAddNewRowEvent as EventListener,
      );
    }
  }
});

defineExpose({
  hotTableRef,
  clearEditingState, // ✅ 暴露给父组件
});
</script>

<template>
  <HotTable
    ref="hotTableRef"
    :settings="hotSettings"
    class="handsontable-wrapper"
    @after-selection="handleAfterSelection"
  />
</template>

<style scoped lang="scss">
.handsontable-wrapper {
  flex: 1; // ✅ 使用 flex 布局自动填充剩余空间
  height: 500px; // ✅ 新增:固定容器高度,与 hotSettings.height 保持一致
  min-height: 0; // ✅ 防止 flex 子项溢出
  overflow: hidden; // ✅ 修复:改为 hidden,由 Handsontable 内部处理滚动

  :deep(.htCore) {
    width: 100% !important;
  }

  :deep(.ht_master) {
    // ✅ 修复:设置固定高度,避免滚动时高度变化
    height: 600px !important;
    overflow: auto !important;
  }

  :deep(::-webkit-scrollbar) {
    width: 16px;
    height: 16px;
  }

  :deep(::-webkit-scrollbar-track) {
    background: #f5f5f5;
    border-radius: 8px;
  }

  :deep(::-webkit-scrollbar-thumb) {
    min-width: 40px;
    min-height: 40px;
    background: #c1c1c1;
    border-radius: 8px;

    &:hover {
      background: #a8a8a8;
    }

    &:active {
      background: #8a8a8a;
    }
  }
}

:deep(.handsontable) {
  font-size: 13px;

  .htCore {
    border-collapse: collapse;
  }

  th {
    font-weight: 500;
    color: #262626;
    background: #fafafa;
    border-color: #e8e8e8;
  }

  td {
    border-color: #e8e8e8;
  }

  .htSelected {
    background: #e6f7ff !important;
  }

  .htCurrent {
    outline: 2px solid #1890ff !important;
    outline-offset: -2px;
  }
}
</style>

<style lang="scss" scoped>
:deep(.handsontable) {
  /* ✅ 确保只读单元格的背景色不被 Handsontable 默认样式覆盖 */
  td.htReadOnly,
  td.readOnly,
  td[readonly],
  .htCore td.readOnly,
  .htCore td.htReadOnly,
  td.htDimmed,
  .htCore td.htDimmed {
    /* 不设置 background，让 afterRenderer 设置的内联样式生效 */
  }

  /* 编辑器激活状态 */
  td.ht__active_highlight {
    color: transparent !important;
    background-color: transparent !important;
  }

  /* 确保编辑器完全覆盖 */
  .handsontableEditor,
  .htAutocompleteEditor {
    z-index: 9999 !important;
    background: white !important;
    border: 1px solid #1890ff !important;
    box-shadow: 0 2px 8px rgb(0 0 0 / 15%) !important;
    opacity: 1 !important;
  }

  /* 下拉列表 */
  .htAutocompleteList {
    z-index: 10000 !important;
    background: white !important;
    border: 1px solid #d9d9d9 !important;
    box-shadow: 0 2px 8px rgb(0 0 0 / 15%) !important;

    .htAutocompleteItem {
      padding: 4px 11px;

      &.htAutocompleteActiveItem {
        color: #1890ff;
        background-color: #e6f7ff;
      }
    }
  }

  /* 下拉箭头 */
  .htAutocompleteArrow {
    z-index: 10001;
    color: rgb(0 0 0 / 25%);

    &:hover {
      color: rgb(0 0 0 / 45%);
    }
  }
}
</style>
