<script lang="ts" setup>
import { ref, watch } from 'vue';
import { HotTable } from '@handsontable/vue3';

interface Props {
  dataSource: any[];
  selectedRowKeys: (string | number)[];
  hotSettings: any;
  labelToIdMap?: {
    carriers: Map<string, number>;
    ports: Map<string, number>;
    currencies: Map<string, number>;
    clients: Map<string, number>;
  };
}

const props = defineProps<Props>();
const emit = defineEmits(['update:selectedRowKeys']);

const hotTableRef = ref<any>(null);

/**
 * 获取列索引的辅助函数
 */
const getColumnIndex = (field: string): number => {
  const columns = props.hotSettings?.columns;
  if (!columns || !Array.isArray(columns)) return -1;
  return columns.findIndex((col: any) => col.data === field);
};

/**
 * 下拉框打开回调函数
 */
const handleOpenDropdown = (
  rowIndex: number,
  colIndex: number,
  field: string,
  source: string[],
) => {
  const hotInstance = hotTableRef.value?.hotInstance;
  if (!hotInstance) {
    console.warn('⚠️ [handleOpenDropdown] hotInstance 不存在');
    return;
  }

  // 保存原值
  const originalValue = hotInstance.getDataAtCell(rowIndex, colIndex);
  console.log(
    `💾 [handleOpenDropdown] ${field} - 保存原值: "${originalValue}"`,
  );

  // 保存到单元格元数据中
  hotInstance.setCellMeta(rowIndex, colIndex, 'originalValue', originalValue);

  // 设置单元格的 source
  hotInstance.setCellMeta(rowIndex, colIndex, 'source', source);
  console.log(
    `✅ [handleOpenDropdown] 已设置 source，共 ${source.length} 个选项`,
  );

  // 强制刷新单元格
  hotInstance.render();
};

// 暴露 hotInstance 和 handleOpenDropdown 方法给父组件
defineExpose({
  hotTableRef,
  handleOpenDropdown,
});

/**
 * 处理下拉选择后的值转换（将 Label 转换为 ID）
 */
const handleAfterChange = (changes: any, source: string) => {
  if (source === 'edit' && changes && props.labelToIdMap) {
    const hotInstance = hotTableRef.value?.hotInstance;
    if (!hotInstance) return;

    changes.forEach(([row, prop, oldValue, newValue]: any) => {
      if (!newValue || !prop) return;

      // 确定字段类型和对应的映射表
      let labelMap: Map<string, number> | undefined;
      if (prop === 'carrierId') {
        labelMap = props.labelToIdMap?.carriers;
      } else if (
        prop === 'polId' ||
        prop === 'podId' ||
        prop === 'poT1Id' ||
        prop === 'poT2Id'
      ) {
        labelMap = props.labelToIdMap?.ports;
      } else if (prop === 'currencyId') {
        labelMap = props.labelToIdMap?.currencies;
      } else if (prop === 'bookingAgentId') {
        labelMap = props.labelToIdMap?.clients;
      }

      // 如果找到映射表，将 Label 转换为 ID
      if (labelMap && typeof newValue === 'string') {
        const id = labelMap.get(newValue);
        if (id !== undefined) {
          console.log(`🔄 [handleAfterChange] ${prop}: "${newValue}" -> ${id}`);
          // 更新单元格的实际值为 ID
          hotInstance.setDataAtCell(row, hotInstance.propToCol(prop), id);
        }
      }
    });
  }
};

// 监听数据变化，同步到 Handsontable
watch(
  () => props.dataSource,
  (newData) => {
    const hotInstance = hotTableRef.value?.hotInstance;
    if (hotInstance) {
      hotInstance.loadData(newData);
    }
  },
  { deep: true },
);

// 监听选中状态变化
watch(
  () => props.selectedRowKeys,
  (newKeys) => {
    emit('update:selectedRowKeys', newKeys);
  },
);
</script>

<template>
  <div class="batch-add-table-container">
    <HotTable
      ref="hotTableRef"
      :settings="hotSettings"
      @after-change="handleAfterChange"
      class="handsontable-container"
    />
  </div>
</template>

<style scoped lang="scss">
.batch-add-table-container {
  flex: 1;
  overflow: auto;

  :deep(.handsontable) {
    .htCenter {
      vertical-align: middle !important;
      text-align: center !important;
    }

    .htLeft {
      text-align: left !important;
    }

    .htRight {
      text-align: right !important;
    }

    .disabled-cell {
      color: #999 !important;
      cursor: not-allowed !important;
      background-color: #f5f5f5 !important;
    }

    td input[type='checkbox'] {
      width: 16px;
      height: 16px;
      cursor: pointer;

      &:hover {
        accent-color: #1890ff;
      }

      &:checked {
        accent-color: #1890ff;
      }
    }
  }
}
</style>
