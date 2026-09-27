<script lang="ts" setup>
import { ref, watch, onMounted } from 'vue';
import { HotTable } from '@handsontable/vue3';
import { useCtnSugPriceMarkup } from './composables/useCtnSugPriceMarkup';

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
const { calcSugPrice } = useCtnSugPriceMarkup();

const hotTableRef = ref<any>(null);

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
 * 以及箱型成本→指导价自动计算
 */
const handleAfterChange = (changes: any, source: string) => {
  if (!changes || source === 'loadData' || source === 'markup') return;

  const hotInstance = hotTableRef.value?.hotInstance;
  if (!hotInstance) return;

  changes.forEach(([row, prop, oldValue, newValue]: any) => {
    if (!prop) return;
    const propKey = String(prop);

    // 改成本后：若配置了加价则自动填指导价；指导价列仍可再单独改
    if (propKey.startsWith('ctn_') && !propKey.startsWith('ctnSug_')) {
      const ctnCodeId = propKey.slice(4);
      const sug = calcSugPrice(newValue, ctnCodeId);
      if (sug !== undefined) {
        const sugCol = hotInstance.propToCol(`ctnSug_${ctnCodeId}`);
        if (typeof sugCol === 'number' && sugCol >= 0) {
          hotInstance.setDataAtCell(row, sugCol, sug, 'markup');
        }
      }
      return;
    }

    if (propKey.startsWith('ctnSug_')) {
      // 指导价单独修改，不回写成本
      return;
    }

    // 主数据列保留展示文案，提交时经 labelToIdMap 映射；勿在此写回 id
    if (
      prop === 'carrierId' ||
      prop === 'polId' ||
      prop === 'podId' ||
      prop === 'poT1Id' ||
      prop === 'poT2Id' ||
      prop === 'currencyId' ||
      prop === 'bookingAgentId'
    ) {
      return;
    }
  });
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
    // ✅ 所有单元格不换行，超出部分用省略号显示
    td,
    th {
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
    }

    .htCenter {
      vertical-align: middle !important;
      text-align: center !important;
    }

    /* 箱型列标题（含成本+指导合并表头）居中 */
    thead th.htCtnHeader,
    thead th.htCenter,
    thead th[colspan]:not([colspan='1']) {
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
      color: hsl(var(--muted-foreground)) !important;
      cursor: not-allowed !important;
      background-color: #f3f5f8 !important;
    }

    /* 是否直达：是=绿，否=红 */
    .is-direct-yes {
      font-weight: 600;
      color: #52c41a !important;
    }

    .is-direct-no {
      font-weight: 600;
      color: #ff4d4f !important;
    }

    td input[type='checkbox'] {
      width: 15px;
      height: 15px;
      accent-color: hsl(var(--primary));
      cursor: pointer;
    }
  }
}
</style>
