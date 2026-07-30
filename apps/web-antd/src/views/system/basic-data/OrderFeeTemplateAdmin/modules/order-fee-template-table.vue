<script lang="ts" setup>
import { ref, watch, shallowRef, nextTick } from 'vue';
import Handsontable from 'handsontable';
import { useDropdownSources } from './composables/useDropdownSources';
import { useFieldLinkage } from './composables/useFieldLinkage';
import { useHotSettings } from './composables/useHotSettings';

const props = defineProps<{
  dataSource: any[];
}>();

const emit = defineEmits(['update:dataSource']);

// ==================== Composables ====================

// 下拉数据源管理
const dropdownSources = useDropdownSources();

// 字段联动逻辑
const linkage = useFieldLinkage(dropdownSources);

// Handsontable 配置
const { hotSettings } = useHotSettings(
  props.dataSource,
  dropdownSources,
  linkage,
);

// Handsontable 实例引用
const hotContainer = ref<HTMLDivElement>();
let hotInstance: Handsontable | null = null;

// ==================== Handsontable 初始化 ====================

function initHotTable() {
  if (!hotContainer.value) return;

  // 销毁旧实例
  if (hotInstance) {
    hotInstance.destroy();
  }

  // 创建新实例
  hotInstance = new Handsontable(hotContainer.value, {
    ...hotSettings.value,
    data: props.dataSource,
  });
}

// ==================== 数据同步 ====================

/**
 * 从 Handsontable 同步数据到父组件
 */
function syncDataToParent() {
  if (!hotInstance) return;

  const data = hotInstance.getData();
  const columns = hotInstance.getSettings().columns as any[];

  // 将数组格式转换为对象格式，并将 Label 转换回 ID
  const result = data.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: any, index: number) => {
      if (!col.data) return;

      const value = row[index];

      // ✅ 关键修复：根据字段类型进行 Label → ID 转换
      switch (col.data) {
        case 'feeCodeId': {
          // 费用代码：Label → ID
          if (value) {
            const feeCodeItem = dropdownSources.feeCodeList.value.find(
              (item: any) => item.label === value,
            );
            obj[col.data] = feeCodeItem?.value || null;
          } else {
            obj[col.data] = null;
          }
          break;
        }

        case 'industryCategory': {
          // 行业类别：Label → 枚举值
          if (value) {
            const industryOptions = [
              { label: '发货人', value: 'b' },
              { label: '收货人', value: 'e' },
              { label: '通知人', value: 'h' },
              { label: '委托单位', value: 'p' },
            ];
            const industryItem = industryOptions.find(
              (item) => item.label === value,
            );
            obj[col.data] = industryItem?.value || null;
          } else {
            obj[col.data] = null;
          }
          break;
        }

        case 'settlementId': {
          // 结算对象：Label → ID（需要从对应的行业类别客户列表中查找）
          if (value) {
            const industryValue = obj.industryCategory;
            if (industryValue) {
              const clientList =
                dropdownSources.getSettlementList(industryValue);
              const clientItem = clientList.find(
                (item: any) => item.label === value,
              );
              obj[col.data] = clientItem?.value || null;
            } else {
              obj[col.data] = null;
            }
          } else {
            obj[col.data] = null;
          }
          break;
        }

        case 'currencyId': {
          // 币别：Label → ID
          if (value) {
            const currencyItem = dropdownSources.currencyList.value.find(
              (item: any) => item.label === value,
            );
            obj[col.data] = currencyItem?.value || null;
          } else {
            obj[col.data] = null;
          }
          break;
        }

        default: {
          // 其他字段直接使用原值
          obj[col.data] = value;
        }
      }
    });

    return obj;
  });

  emit('update:dataSource', result);
}

// ==================== 监听器 ====================

// 监听数据源变化，更新 Handsontable
watch(
  () => props.dataSource,
  (newData) => {
    if (hotInstance) {
      hotInstance.loadData(newData);
    }
  },
  { deep: true },
);

// 监听下拉数据源变化，重新渲染
watch(
  () => [dropdownSources.feeCodeList.value, dropdownSources.currencyList.value],
  () => {
    if (hotInstance) {
      hotInstance.render();
    }
  },
  { deep: true },
);

// ==================== 生命周期 ====================

// 组件挂载后初始化 Handsontable
nextTick(() => {
  initHotTable();
});

// 组件卸载时销毁 Handsontable
import { onUnmounted } from 'vue';
onUnmounted(() => {
  if (hotInstance) {
    hotInstance.destroy();
    hotInstance = null;
  }
});

// ==================== 暴露方法 ====================

/**
 * 更新表格数据（将 ID 转换为 Label 后显示）
 */
function updateData(newData: any[]) {
  if (!hotInstance) return;

  // ✅ 行业类别选项（需要在此定义）
  const industryOptions = [
    { label: '发货人', value: 'b' },
    { label: '收货人', value: 'e' },
    { label: '通知人', value: 'h' },
    { label: '委托单位', value: 'p' },
  ];

  // ✅ 关键修复：将 ID 转换为 Label，以便在表格中正确显示
  const convertedData = newData.map((item: any) => {
    const converted = { ...item };

    // 费用代码 ID → Label
    if (converted.feeCodeId) {
      const feeCodeItem = dropdownSources.feeCodeList.value.find(
        (f: any) => f.value === converted.feeCodeId,
      );
      if (feeCodeItem) {
        converted.feeCodeId = feeCodeItem.label;
      }
    }

    // 行业类别枚举值 → Label
    if (converted.industryCategory) {
      const industryItem = industryOptions.find(
        (opt: any) => opt.value === converted.industryCategory,
      );
      if (industryItem) {
        converted.industryCategory = industryItem.label;
      }
    }

    // 结算对象 ID → Label
    if (converted.settlementId && converted.industryCategory) {
      // 需要根据行业类别找到对应的客户列表
      const industryValue = industryOptions.find(
        (opt: any) => opt.label === converted.industryCategory,
      )?.value;

      if (industryValue) {
        const clientList = dropdownSources.getSettlementList(industryValue);
        const clientItem = clientList.find(
          (c: any) => c.value === converted.settlementId,
        );
        if (clientItem) {
          converted.settlementId = clientItem.label;
        }
      }
    }

    // 币别 ID → Label
    if (converted.currencyId) {
      const currencyItem = dropdownSources.currencyList.value.find(
        (c: any) => c.value === converted.currencyId,
      );
      if (currencyItem) {
        converted.currencyId = currencyItem.label;
      }
    }

    return converted;
  });

  hotInstance.loadData(convertedData);
}

defineExpose({
  syncDataToParent,
  updateData,
  hotInstance,
});
</script>

<template>
  <div class="order-fee-template-table">
    <div ref="hotContainer" class="handsontable-container"></div>
  </div>
</template>

<style scoped lang="scss">
.order-fee-template-table {
  width: 100%;

  .handsontable-container {
    :deep(.htCore) {
      th,
      td {
        vertical-align: middle !important;
        text-align: center !important;
      }
    }
  }
}
</style>
