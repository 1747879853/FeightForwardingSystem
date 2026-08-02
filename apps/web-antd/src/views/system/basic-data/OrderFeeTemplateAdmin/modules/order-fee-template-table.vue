<script lang="ts" setup>
import { ref, watch, shallowRef, nextTick } from 'vue';
import Handsontable from 'handsontable';
import { useDropdownSources } from './composables/useDropdownSources';
import { useFieldLinkage } from './composables/useFieldLinkage';
import { useHotSettings } from './composables/useHotSettings';
import { getClientGroupedByIndustryCategory } from '#/api/common/client';
import {
  getIndustryCategoryOptions,
  getServiceTypeOptions,
} from '#/views/sea-export-admin/orderFee/data';

const props = defineProps<{
  dataSource: any[];
  dropdownSources: any; // ✅ 新增：从父组件接收下拉数据源
  allClientsByIndustry?: Record<string, Array<{ label: string; value: any }>>; // ✅ 新增：从父组件传入的客户缓存
}>();

const emit = defineEmits(['update:dataSource']);

// ==================== Composables ====================

// ✅ 使用父组件传递的dropdownSources，而不是自己创建
const dropdownSources = props.dropdownSources;

// ✅ 新增：本地客户缓存（如果父组件传入了则使用父组件的）
const localAllClientsByIndustry = ref<
  Record<string, Array<{ label: string; value: any }>>
>({});

// ✅ 新增：服务项下拉选项（使用静态数据）
const serviceTypeOptions = ref<Array<{ label: string; value: number }>>(
  getServiceTypeOptions(),
);

// ✅ 关键修改：如果父组件传入了客户缓存，则使用父组件的数据
watch(
  () => props.allClientsByIndustry,
  (newVal) => {
    if (newVal && Object.keys(newVal).length > 0) {
      console.log('✅ [OrderFeeTemplateTable] 使用父组件传入的客户缓存');
      // ✅ 关键修复：将父组件的缓存同时赋值给 dropdownSources.allClientsByIndustry 和 localAllClientsByIndustry
      Object.assign(dropdownSources.allClientsByIndustry.value, newVal);
      Object.assign(localAllClientsByIndustry.value, newVal);
      console.log(
        `✅ [OrderFeeTemplateTable] allClientsByIndustry 已更新，共 ${Object.keys(dropdownSources.allClientsByIndustry.value).length} 个行业类别`,
      );
    }
  },
  { immediate: true, deep: true },
);

// 字段联动逻辑
const linkage = useFieldLinkage(dropdownSources);

// Handsontable 配置
const { hotSettings } = useHotSettings(
  props.dataSource,
  dropdownSources,
  linkage,
  serviceTypeOptions.value, // ✅ 新增：传递服务项选项
);

// Handsontable 实例引用
const hotContainer = ref<HTMLDivElement>();
const hotInstance = ref<Handsontable | null>(null);

// ==================== Handsontable 初始化 ====================

// ✅ 新增：用于跟踪选中的行
const selectedRows = ref<Set<number>>(new Set());

function initHotTable() {
  if (!hotContainer.value) return;

  // 销毁旧实例
  if (hotInstance.value) {
    hotInstance.value.destroy();
  }

  // 创建新实例
  hotInstance.value = new Handsontable(hotContainer.value, {
    ...hotSettings.value,
    data: props.dataSource,

    // ✅ 新增：监听选中事件
    afterSelectionEnd(
      row: number,
      column: number,
      row2: number,
      column2: number,
    ) {
      //console.log('📍 [afterSelectionEnd] 选中区域:', { row, column, row2, column2 });

      // 清空之前的选中
      selectedRows.value.clear();

      // 计算选中的行范围
      const minRow = Math.min(row, row2);
      const maxRow = Math.max(row, row2);

      // 添加到选中集合
      for (let i = minRow; i <= maxRow; i++) {
        selectedRows.value.add(i);
      }

      // console.log('✅ [afterSelectionEnd] 当前选中的行:', Array.from(selectedRows.value));
    },
  });

  // console.log('✅ [initHotTable] Handsontable 初始化完成');
}

// ==================== 数据同步 ====================

/**
 * 从 Handsontable 同步数据到父组件
 */
function syncDataToParent() {
  if (!hotInstance.value) {
    console.warn('⚠️ [syncDataToParent] hotInstance 未初始化');
    return;
  }

  const data = hotInstance.value.getData();

  const columns = hotInstance.value.getSettings().columns as any[];

  // 将数组格式转换为对象格式，使用 _value 字段中的 ID
  const result = data.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: any, index: number) => {
      if (!col.data) return;

      const value = row[index];

      // ✅ 关键修复：优先使用 _value 字段中的 ID，如果没有则尝试转换
      switch (col.data) {
        case 'serviceType': {
          // ✅ 服务项：优先使用 serviceType_value，否则从 Label 转换
          const valueIndex = columns.findIndex(
            (c: any) => c.data === 'serviceType_value',
          );
          if (
            valueIndex >= 0 &&
            row[valueIndex] !== undefined &&
            row[valueIndex] !== null
          ) {
            obj[col.data] = row[valueIndex];
          } else if (value !== null && value !== undefined && value !== '') {
            // 如果没有 _value 字段，从 Label 转换
            if (typeof value === 'number') {
              obj[col.data] = value;
            } else if (typeof value === 'string') {
              const serviceTypeItem = serviceTypeOptions.value.find(
                (item) => item.label === value,
              );
              obj[col.data] = serviceTypeItem?.value || null;
            }
          } else {
            obj[col.data] = null;
          }
          break;
        }

        case 'feeCodeId': {
          // 费用代码：优先使用 feeCodeId_value
          const valueIndex = columns.findIndex(
            (c: any) => c.data === 'feeCodeId_value',
          );
          if (
            valueIndex >= 0 &&
            row[valueIndex] !== undefined &&
            row[valueIndex] !== null
          ) {
            obj[col.data] = row[valueIndex];
          } else if (value) {
            // 如果没有 _value 字段，从 Label 转换
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
          // ✅ 行业类别：优先使用 industryCategory_value，但需要转换为数字 key
          const valueIndex = columns.findIndex(
            (c: any) => c.data === 'industryCategory_value',
          );
          if (
            valueIndex >= 0 &&
            row[valueIndex] !== undefined &&
            row[valueIndex] !== null
          ) {
            // ✅ 关键修复：industryCategory_value 是字符串（如 'b'），需要转换为数字 key（如 2）
            const stringValue = row[valueIndex];
            const industryOptions = getIndustryCategoryOptions();
            const industryItem = industryOptions.find(
              (item) => item.value === stringValue,
            );
            obj[col.data] = industryItem?.key || null; // 返回数字 key
          } else if (value !== null && value !== undefined && value !== '') {
            // 如果没有 _value 字段，从 Label 转换
            if (typeof value === 'number') {
              obj[col.data] = value;
            } else if (typeof value === 'string') {
              const industryOptions = getIndustryCategoryOptions();
              const industryItem = industryOptions.find(
                (item) => item.label === value || item.value === value,
              );
              obj[col.data] = industryItem?.key || null; // 返回数字 key
            }
          } else {
            obj[col.data] = null;
          }
          break;
        }

        case 'settlementId': {
          // 结算对象：优先使用 settlementId_value
          const valueIndex = columns.findIndex(
            (c: any) => c.data === 'settlementId_value',
          );
          if (
            valueIndex >= 0 &&
            row[valueIndex] !== undefined &&
            row[valueIndex] !== null
          ) {
            obj[col.data] = row[valueIndex];
          } else if (value) {
            // 如果没有 _value 字段，从 Label 转换
            const industryLabel = obj.industryCategory;

            let industryValue = '';
            if (industryLabel) {
              const industryOptions = getIndustryCategoryOptions();
              const industryItem = industryOptions.find(
                (item) => item.label === industryLabel,
              );
              industryValue = industryItem?.value || '';
            }

            if (industryValue) {
              const clientList =
                localAllClientsByIndustry.value[industryValue] || [];
              const clientItem = clientList.find(
                (item: any) => item.label === value,
              );
              obj[col.data] = clientItem?.value || null;
            } else {
              let allClients: Array<{ label: string; value: any }> = [];
              Object.values(localAllClientsByIndustry.value).forEach(
                (clients) => {
                  if (Array.isArray(clients)) {
                    allClients = [...allClients, ...clients];
                  }
                },
              );
              const uniqueMap = new Map();
              allClients.forEach((client) => {
                if (!uniqueMap.has(client.value)) {
                  uniqueMap.set(client.value, client);
                }
              });
              allClients = Array.from(uniqueMap.values());

              const clientItem = allClients.find(
                (item: any) => item.label === value,
              );
              obj[col.data] = clientItem?.value || null;
            }
          } else {
            obj[col.data] = null;
          }
          break;
        }

        case 'currencyId': {
          // 币别：优先使用 currencyId_value
          const valueIndex = columns.findIndex(
            (c: any) => c.data === 'currencyId_value',
          );
          if (
            valueIndex >= 0 &&
            row[valueIndex] !== undefined &&
            row[valueIndex] !== null
          ) {
            obj[col.data] = row[valueIndex];
          } else if (value) {
            // 如果没有 _value 字段，从 Label 转换
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
          // 其他字段直接使用原值（包括 _value 字段）
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
    //console.log('📥 [watch dataSource] 父组件数据变化:', newData);
    //console.log('📥 [watch dataSource] 数据行数:', newData.length);

    // ✅ 关键修复：检查实例是否仍然有效
    if (hotInstance.value && !hotInstance.value.isDestroyed) {
      // ✅ 重要修复：判断数据格式，防止 syncDataToParent 后 Label 被 ID 覆盖
      // 如果第一个记录的 feeCodeId 是数字，说明是 ID 格式（来自父组件保存的数据）
      const isIdFormat =
        newData.length > 0 && typeof newData[0].feeCodeId === 'number';

      // 如果是服务项字段为数字，也认为是 ID 格式
      const isServiceTypeAsNumber =
        newData.length > 0 && typeof newData[0].serviceType === 'number';

      if (isIdFormat || isServiceTypeAsNumber) {
        console.log(
          '⚠️ [watch dataSource] 检测到 ID 格式数据，跳过 loadData，避免覆盖 Label',
        );
        // 不执行 loadData，保持当前 Handsontable 中的 Label 数据
        return;
      }

      // 如果是 Label 格式（新建模式或从父组件传入的已转换数据），正常加载
      hotInstance.value.loadData(newData);
      //console.log('✅ [watch dataSource] Label 格式数据已加载到 Handsontable');
    } else {
      //console.warn('⚠️ [watch dataSource] hotInstance 未初始化或已被销毁');
    }
  },
  { deep: true },
);

// 监听下拉数据源变化，重新渲染
watch(
  () => [dropdownSources.feeCodeList.value, dropdownSources.currencyList.value],
  () => {
    // ✅ 关键修复：检查实例是否仍然有效
    if (hotInstance.value && !hotInstance.value.isDestroyed) {
      hotInstance.value.render();
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
  if (hotInstance.value) {
    hotInstance.value.destroy();
    hotInstance.value = null;
  }
});

// ==================== 暴露方法 ====================

/**
 * 更新表格数据（将 ID 转换为 Label 后显示，并保存 _value 字段）
 */
function updateData(newData: any[]) {
  if (!hotInstance.value) return;

  // ✅ 关键修复：使用完整的行业类别选项列表
  const industryOptions = getIndustryCategoryOptions();

  // ✅ 关键修复：将 ID 转换为 Label，并保存 _value 字段
  const convertedData = newData.map((item: any) => {
    const converted = { ...item };

    // ✅ 服务项：保存枚举值到 serviceType_value，显示 Label
    if (
      converted.serviceType !== null &&
      converted.serviceType !== undefined &&
      converted.serviceType !== ''
    ) {
      let displayLabel = '';
      let enumValue: number | undefined;

      // 如果已经是字符串Label
      if (typeof converted.serviceType === 'string') {
        const serviceTypeItem = serviceTypeOptions.value.find(
          (opt: any) => opt.label === converted.serviceType,
        );
        displayLabel = serviceTypeItem?.label || converted.serviceType;
        enumValue = serviceTypeItem?.value;
      }
      // 如果是数值枚举值
      else if (typeof converted.serviceType === 'number') {
        const serviceTypeItem = serviceTypeOptions.value.find(
          (opt: any) => opt.value === converted.serviceType,
        );
        displayLabel = serviceTypeItem?.label || '';
        enumValue = converted.serviceType;
      }

      if (displayLabel) {
        converted.serviceType = displayLabel;
        if (enumValue !== undefined) {
          converted.serviceType_value = enumValue;
        }
      }
    }

    // 费用代码：保存 ID 到 feeCodeId_value，显示 Label
    if (converted.feeCodeId) {
      const feeCodeItem = dropdownSources.feeCodeList.value.find(
        (f: any) => f.value === converted.feeCodeId,
      );
      if (feeCodeItem) {
        converted.feeCodeId_value = converted.feeCodeId; // 保存原始ID
        converted.feeCodeId = feeCodeItem.label; // 显示Label
      }
    }

    // ✅ 行业类别：保存枚举值到 industryCategory_value，显示 Label
    if (
      converted.industryCategory !== null &&
      converted.industryCategory !== undefined &&
      converted.industryCategory !== ''
    ) {
      let displayLabel = '';
      let enumValue: string | undefined;

      // 如果已经是字符串Label
      if (typeof converted.industryCategory === 'string') {
        const industryItem = industryOptions.find(
          (opt: any) => opt.label === converted.industryCategory,
        );
        displayLabel = industryItem?.label || converted.industryCategory;
        enumValue = industryItem?.value;
      }
      // 如果是数值枚举值（从后端获取的是数字，如 2, 3, 4）
      else if (typeof converted.industryCategory === 'number') {
        // ✅ 关键修复：使用 key 字段匹配，而不是 value 字段
        const industryItem = industryOptions.find(
          (opt: any) => opt.key === converted.industryCategory,
        );
        displayLabel = industryItem?.label || '';
        enumValue = industryItem?.value; // 使用 value 字段（字符串，如 'b', 'c', 'd'）
      }

      if (displayLabel) {
        converted.industryCategory = displayLabel;
        if (enumValue) {
          converted.industryCategory_value = enumValue;
        }
      }
    }

    // 结算对象：保存 ID 到 settlementId_value，显示 Label
    if (converted.settlementId) {
      let clientItem: any = null;
      let industryValueForClient = converted.industryCategory_value;

      // 优先使用行业类别枚举值查找客户
      if (industryValueForClient) {
        const clientList =
          localAllClientsByIndustry.value[industryValueForClient] || [];
        clientItem = clientList.find(
          (c: any) => c.value === converted.settlementId,
        );
      }

      // 如果按行业类别没找到，尝试在所有客户中查找
      if (!clientItem) {
        let allClients: Array<{ label: string; value: any }> = [];
        Object.values(localAllClientsByIndustry.value).forEach((clients) => {
          if (Array.isArray(clients)) {
            allClients = [...allClients, ...clients];
          }
        });
        const uniqueMap = new Map();
        allClients.forEach((client) => {
          if (!uniqueMap.has(client.value)) {
            uniqueMap.set(client.value, client);
          }
        });
        allClients = Array.from(uniqueMap.values());

        clientItem = allClients.find(
          (c: any) => c.value === converted.settlementId,
        );
      }

      // 设置结算对象的 Label 和 _value
      if (clientItem) {
        converted.settlementId_value = converted.settlementId; // 保存原始ID
        converted.settlementId = clientItem.label; // 显示Label
      }
    }

    // 币别：保存 ID 到 currencyId_value，显示 Label
    if (converted.currencyId) {
      const currencyItem = dropdownSources.currencyList.value.find(
        (c: any) => c.value === converted.currencyId,
      );
      if (currencyItem) {
        converted.currencyId_value = converted.currencyId; // 保存原始ID
        converted.currencyId = currencyItem.label; // 显示Label
      }
    }

    return converted;
  });

  hotInstance.value.loadData(convertedData);
}

defineExpose({
  syncDataToParent,
  updateData,
  hotInstance,
  selectedRows, // ✅ 暴露选中的行
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
