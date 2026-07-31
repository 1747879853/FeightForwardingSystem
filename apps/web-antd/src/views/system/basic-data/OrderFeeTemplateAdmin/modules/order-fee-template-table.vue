<script lang="ts" setup>
import { ref, watch, shallowRef, nextTick } from 'vue';
import Handsontable from 'handsontable';
import { useDropdownSources } from './composables/useDropdownSources';
import { useFieldLinkage } from './composables/useFieldLinkage';
import { useHotSettings } from './composables/useHotSettings';
import { getClientGroupedByIndustryCategory } from '#/api/common/client';
import { getIndustryCategoryOptions, getServiceTypeOptions } from '#/views/sea-export-admin/orderFee/data';

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
const localAllClientsByIndustry = ref<Record<string, Array<{ label: string; value: any }>>>({});

// ✅ 新增：服务项下拉选项（使用静态数据）
const serviceTypeOptions = ref<Array<{ label: string; value: number }>>(getServiceTypeOptions());

// ✅ 关键修改：如果父组件传入了客户缓存，则使用父组件的数据
watch(
  () => props.allClientsByIndustry,
  (newVal) => {
    if (newVal && Object.keys(newVal).length > 0) {
      console.log('✅ [OrderFeeTemplateTable] 使用父组件传入的客户缓存');
      // 将父组件的缓存赋值给本地的 allClientsByIndustry
      Object.assign(localAllClientsByIndustry.value, newVal);
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
    afterSelectionEnd(row: number, column: number, row2: number, column2: number) {
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
//  console.log('📊 [syncDataToParent] Handsontable 原始数据:', data);
 // console.log('📊 [syncDataToParent] 数据行数:', data.length);
  
  const columns = hotInstance.value.getSettings().columns as any[];
  console.log('📋 [syncDataToParent] 列配置:', columns.map((col: any) => col.data));

  // 将数组格式转换为对象格式，并将 Label 转换回 ID
  const result = data.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: any, index: number) => {
      if (!col.data) return;

      const value = row[index];

      // ✅ 关键修复：根据字段类型进行 Label → ID 转换
      switch (col.data) {
        case 'serviceType': {
          // ✅ 服务项：Label → 数值枚举值
          if (value !== null && value !== undefined && value !== '') {
            // 如果已经是数值类型，直接使用
            if (typeof value === 'number') {
              obj[col.data] = value;
              console.log('✅ [syncDataToParent] serviceType已是数值:', value);
            } else if (typeof value === 'string') {
              // 如果是字符串Label，转换为数值枚举值
              const serviceTypeItem = serviceTypeOptions.value.find(
                (item) => item.label === value,
              );
              obj[col.data] = serviceTypeItem?.value || null;
              console.log('🔄 [syncDataToParent] serviceType字符串转数值:', value, '→', obj[col.data]);
            } else {
              obj[col.data] = null;
            }
          } else {
            obj[col.data] = null;
          }
          break;
        }

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
          // ✅ 关键修复：行业类别现在直接存储数值枚举值，无需转换
          // 如果值是数值类型，直接使用；如果是字符串Label，才需要转换
          if (value !== null && value !== undefined && value !== '') {
            // 检查是否已经是数值类型
            if (typeof value === 'number') {
              obj[col.data] = value;
              console.log('✅ [syncDataToParent] industryCategory已是数值:', value);
            } else if (typeof value === 'string') {
              // 如果是字符串，尝试转换为数值枚举值
              const industryOptions = getIndustryCategoryOptions();
              const industryItem = industryOptions.find(
                (item) => item.label === value || item.value === value,
              );
              obj[col.data] = industryItem?.key || null;
              console.log('🔄 [syncDataToParent] industryCategory字符串转数值:', value, '→', obj[col.data]);
            } else {
              obj[col.data] = null;
            }
          } else {
            obj[col.data] = null;
          }
          break;
        }

        case 'settlementId': {
          // 结算对象：Label → ID（需要从对应的行业类别客户列表中查找）
          if (value) {
            const industryLabel = obj.industryCategory;
            
            // ✅ 关键修复：将行业类别Label转换为枚举值
            let industryValue = '';
            if (industryLabel) {
              // 使用完整的行业类别选项列表
              const industryOptions = getIndustryCategoryOptions();
              const industryItem = industryOptions.find(
                (item) => item.label === industryLabel,
              );
              industryValue = industryItem?.value || '';
            }
            
            if (industryValue) {
              // ✅ 关键修复：使用缓存的客户数据进行查找
              const clientList = localAllClientsByIndustry.value[industryValue] || [];
              console.log('🔍 [syncDataToParent] settlementId转换 - 行业类别:', industryLabel, '->', industryValue);
              console.log('📊 [syncDataToParent] settlementId转换 - 客户列表数量:', clientList.length);
              console.log(' [syncDataToParent] settlementId转换 - 查找label:', value);
              
              const clientItem = clientList.find(
                (item: any) => item.label === value,
              );
              
              console.log('✅ [syncDataToParent] settlementId转换 - 找到的客户:', clientItem);
              obj[col.data] = clientItem?.value || null;
            } else {
              // ✅ 如果行业类别为空或无法转换，在所有客户中查找
              console.log('⚠️ [syncDataToParent] settlementId转换 - 行业类别为空，在所有客户中查找');
              let allClients: Array<{ label: string; value: any }> = [];
              Object.values(localAllClientsByIndustry.value).forEach((clients) => {
                if (Array.isArray(clients)) {
                  allClients = [...allClients, ...clients];
                }
              });
              // 去重
              const uniqueMap = new Map();
              allClients.forEach((client) => {
                if (!uniqueMap.has(client.value)) {
                  uniqueMap.set(client.value, client);
                }
              });
              allClients = Array.from(uniqueMap.values());
              
              console.log('📊 [syncDataToParent] settlementId转换 - 全部客户数量:', allClients.length);
              
              const clientItem = allClients.find(
                (item: any) => item.label === value,
              );
              
              console.log('✅ [syncDataToParent] settlementId转换 - 找到的客户:', clientItem);
              obj[col.data] = clientItem?.value || null;
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

  //console.log('📤 [syncDataToParent] 转换后的数据:', result);
 // console.log('📤 [syncDataToParent] 数据行数:', result.length);
  
  emit('update:dataSource', result);
 // console.log('✅ [syncDataToParent] 数据已emit到父组件');
}

// ==================== 监听器 ====================

// 监听数据源变化，更新 Handsontable
watch(
  () => props.dataSource,
  (newData) => {
    //console.log('📥 [watch dataSource] 父组件数据变化:', newData);
   // console.log('📥 [watch dataSource] 数据行数:', newData.length);
    
    // ✅ 关键修复：检查实例是否仍然有效
    if (hotInstance.value && !hotInstance.value.isDestroyed) {
      hotInstance.value.loadData(newData);
  //    console.log('✅ [watch dataSource] 数据已加载到 Handsontable');
      
      // 验证数据是否真的加载了
      const currentData = hotInstance.value.getData();
     // console.log('📊 [watch dataSource] Handsontable 当前数据行数:', currentData.length);
    } else {
    //  console.warn('⚠️ [watch dataSource] hotInstance 未初始化或已被销毁');
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
 * 更新表格数据（将 ID 转换为 Label 后显示）
 */
function updateData(newData: any[]) {
  if (!hotInstance.value) return;

  // ✅ 关键修复：使用完整的行业类别选项列表
  const industryOptions = getIndustryCategoryOptions();

  // ✅ 关键修复：先收集所有需要转换的行业类别枚举值，避免重复转换
  const convertedData = newData.map((item: any) => {
    const converted = { ...item };

    // ✅ 服务项数值枚举值 → Label
    if (converted.serviceType !== null && converted.serviceType !== undefined && converted.serviceType !== '') {
      let displayLabel = '';
      
      // 如果已经是字符串Label，直接使用
      if (typeof converted.serviceType === 'string') {
        const serviceTypeItem = serviceTypeOptions.value.find(
          (opt: any) => opt.label === converted.serviceType || opt.value === Number(converted.serviceType),
        );
        displayLabel = serviceTypeItem?.label || converted.serviceType;
      } 
      // 如果是数值枚举值，转换为Label
      else if (typeof converted.serviceType === 'number') {
        const serviceTypeItem = serviceTypeOptions.value.find(
          (opt: any) => opt.value === converted.serviceType,
        );
        displayLabel = serviceTypeItem?.label || '';
      }
      
      if (displayLabel) {
        converted.serviceType = displayLabel;
        console.log('🔄 [updateData] serviceType转换:', converted.serviceType);
      }
    }

    // 费用代码 ID → Label
    if (converted.feeCodeId) {
      const feeCodeItem = dropdownSources.feeCodeList.value.find(
        (f: any) => f.value === converted.feeCodeId,
      );
      if (feeCodeItem) {
        converted.feeCodeId = feeCodeItem.label;
      }
    }

    // ✅ 关键修复：行业类别枚举值 → Label（支持数值和字符串）
    let industryValueForClient: string | undefined; // 保存用于查找客户的枚举值
    
    if (converted.industryCategory !== null && converted.industryCategory !== undefined && converted.industryCategory !== '') {
      let displayLabel = '';
      
      // 如果已经是字符串Label，直接使用
      if (typeof converted.industryCategory === 'string') {
        const industryItem = industryOptions.find(
          (opt: any) => opt.label === converted.industryCategory || opt.value === converted.industryCategory,
        );
        displayLabel = industryItem?.label || converted.industryCategory;
        industryValueForClient = industryItem?.value; // 保存枚举值
      } 
      // 如果是数值枚举值，转换为Label
      else if (typeof converted.industryCategory === 'number') {
        const industryItem = industryOptions.find(
          (opt: any) => opt.value === converted.industryCategory || opt.value === String(converted.industryCategory),
        );
        displayLabel = industryItem?.label || '';
        industryValueForClient = industryItem?.value; // 保存枚举值
      }
      
      if (displayLabel) {
        converted.industryCategory = displayLabel;
        console.log('🔄 [updateData] industryCategory转换:', converted.industryCategory);
      }
    }

    // 结算对象 ID → Label
    if (converted.settlementId) {
      let clientItem: any = null;
      
      // ✅ 关键修复：优先使用之前保存的行业类别枚举值
      if (industryValueForClient) {
        const clientList = localAllClientsByIndustry.value[industryValueForClient] || [];
        console.log('🔍 [updateData] settlementId转换 - 使用行业类别枚举值:', industryValueForClient);
        console.log('📊 [updateData] settlementId转换 - 客户列表数量:', clientList.length);
        
        clientItem = clientList.find(
          (c: any) => c.value === converted.settlementId,
        );
        
        if (clientItem) {
          console.log('✅ [updateData] settlementId找到客户:', clientItem.label);
        }
      }
      
      // ✅ 如果按行业类别没找到，尝试在所有客户中查找
      if (!clientItem) {
        console.log('⚠️ [updateData] settlementId转换 - 按行业类别未找到，在所有客户中查找');
        let allClients: Array<{ label: string; value: any }> = [];
        Object.values(localAllClientsByIndustry.value).forEach((clients) => {
          if (Array.isArray(clients)) {
            allClients = [...allClients, ...clients];
          }
        });
        // 去重
        const uniqueMap = new Map();
        allClients.forEach((client) => {
          if (!uniqueMap.has(client.value)) {
            uniqueMap.set(client.value, client);
          }
        });
        allClients = Array.from(uniqueMap.values());
        
        console.log('📊 [updateData] settlementId转换 - 全部客户数量:', allClients.length);
        
        clientItem = allClients.find(
          (c: any) => c.value === converted.settlementId,
        );
        
        if (clientItem) {
          console.log('✅ [updateData] settlementId在全部客户中找到:', clientItem.label);
        }
      }
      
      // 设置结算对象的 Label
      if (clientItem) {
        converted.settlementId = clientItem.label;
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

  hotInstance.value.loadData(convertedData);
}

defineExpose({
  syncDataToParent,
  updateData,
  hotInstance,
  selectedRows,  // ✅ 暴露选中的行
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
