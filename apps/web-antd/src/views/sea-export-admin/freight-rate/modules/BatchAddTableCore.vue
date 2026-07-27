<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import { HotTable } from '@handsontable/vue3';

interface Props {
  dataSource: any[];
  selectedRowKeys: (string | number)[];
  hotSettings: any;
  labelToIdMap?: {
    carriers: Map<string, string>;
    ports: Map<string, string>;
    currencies: Map<string, string>;
    clients: Map<string, string>;
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

// ⚠️ 关键修复：在组件挂载时加载初始数据
onMounted(() => {
  const hotInstance = hotTableRef.value?.hotInstance;
  if (hotInstance && props.dataSource.length > 0) {
    console.log('📊 [onMounted] 加载初始数据，行数:', props.dataSource.length);
    hotInstance.loadData(props.dataSource);
  }
});

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
    return;
  }

  // 保存原值
  const originalValue = hotInstance.getDataAtCell(rowIndex, colIndex);

  // 保存到单元格元数据中
  hotInstance.setCellMeta(rowIndex, colIndex, 'originalValue', originalValue);

  // 设置单元格的 source
  hotInstance.setCellMeta(rowIndex, colIndex, 'source', source);

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
  if (source === 'edit' && changes) {
    const hotInstance = hotTableRef.value?.hotInstance;
    if (!hotInstance) return;

    changes.forEach(([row, prop, oldValue, newValue]: any) => {
      if (!prop) return;

      // ⚠️ 关键修复：不再在 handleAfterChange 中同步 seFreiPriceCtns
      // 因为修改 rowData.seFreiPriceCtns 会触发 Vue 响应式，导致 hotSettings 重新计算
      // 箱型列的数据会在提交时从 Handsontable 中直接提取
      if (prop.startsWith('ctn_')) {
        // 箱型列的值已经保存在 Handsontable 内部，不需要额外同步
        // prepareSubmitData 时会从 dataSource（即 Handsontable 的数据源）中提取
        return; // 箱型列不需要进行 Label 到 ID 的转换
      }

      // 原有的 Label 到 ID 转换逻辑
      if (props.labelToIdMap && newValue) {
        // 确定字段类型和对应的映射表
        let labelMap: Map<string, string> | undefined;
        if (prop === 'carrierId') {
          labelMap = props.labelToIdMap.carriers;
        } else if (
          prop === 'polId' ||
          prop === 'podId' ||
          prop === 'poT1Id' ||
          prop === 'poT2Id'
        ) {
          labelMap = props.labelToIdMap.ports;
        } else if (prop === 'currencyId') {
          labelMap = props.labelToIdMap.currencies;
        } else if (prop === 'bookingAgentId') {
          labelMap = props.labelToIdMap.clients;
        }

        // 如果找到映射表，将 Label 转换为 ID
        if (labelMap && typeof newValue === 'string') {
          const id = labelMap.get(newValue);
          if (id !== undefined) {
            // 更新单元格的实际值为 ID
            hotInstance.setDataAtCell(row, hotInstance.propToCol(prop), id);
          }
        }
      }
    });
  }
};

// 监听数据变化，同步到 Handsontable
// ️ 关键修复：移除深监听，避免 handleAfterChange 修改 seFreiPriceCtns 时触发 loadData
// Handsontable 本身已经管理了数据，不需要额外的同步
// 只在 dataSource 引用变化时才更新（如添加/删除行）
watch(
  () => props.dataSource,
  (newData, oldData) => {
    // 只有在数据引用真正变化时才更新（添加/删除行）
    if (newData !== oldData) {
      const hotInstance = hotTableRef.value?.hotInstance;
      if (hotInstance) {
        hotInstance.loadData(newData);
      }
    }
  },
  // 不使用 deep: true，避免内部属性变化触发更新
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
