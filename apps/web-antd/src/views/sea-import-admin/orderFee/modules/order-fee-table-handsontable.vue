<script lang="ts" setup>
import type { SeaImportAdminApi } from '#/api/sea-import/sea-import-admin';
import { computed, nextTick, onMounted, ref, watch, shallowRef } from 'vue';
import {
  Button,
  Space,
  message,
  DropdownButton,
  MenuItem,
  Menu,
  Card,
} from 'ant-design-vue';
import { IconifyIcon } from '@vben/icons';
import { $t } from '#/locales';
import weiwanjie from '#/assets/img/base/weiwanjie.png';
import yiwanjie from '#/assets/img/base/yiwanjie.png';
// 导入拆分后的组件和 composables
import OrderFeeTableCore from './OrderFeeTableCore.vue';
import OrderFeeEditorModal from './order-fee-editor-modal.vue';
import OrderFeeAuditHistoryModal from './order-fee-audit-history-modal.vue';
import BatchImportFeeModal from './batch-import-fee-modal.vue';
import { useOrderFeeData } from './composables/useOrderFeeData.js';
import { useOrderFeeActions } from './composables/useOrderFeeActions.js';
import { useOrderFeeLinkage } from './composables/useOrderFeeLinkage.js';
import { useFinishStatus } from './composables/useFinishStatus.js';
import { useOrderFeePrint } from './composables/useOrderFeePrint.js';
import { useDropdownSources } from './composables/useDropdownSources.js';
import { useOrderFeeSort } from './composables/useOrderFeeSort.js';
import { useHotColumns } from './composables/useHotColumns.js';
import { useHotSettings } from './composables/useHotSettings.js';
import { useModals } from './composables/useModals.js';
import { initOrderFeeEnumCache } from '../data.js';

const props = defineProps<{
  type: number; // 收付类型 0 应收 1 应付
  mode?: string; // changeOrder 更改单
  parentChangeOrderId?: string;
  recAmountMap?: Record<string, any>;
  payAmountMap?: Record<string, any>;
  orderDetail?: SeaImportAdminApi.SeaImportDto | null;
  allClientsByIndustry?: Record<string, Array<{ label: string; value: any }>>; // ✅ 新增：从父组件传入的客户缓存
}>();

const emit = defineEmits([
  'sync-fee',
  'update-amount',
  'refresh-opposite-table',
  'selection-change',
]);

// ==================== 使用 Composables ====================

// 数据管理
const {
  dataSource,
  selectedRowKeys,
  orderBaseData,
  orderCtnList,
  editId,
  getTableDate,
  syncFee,
  sanitizeOrderFee,
} = useOrderFeeData(props, emit as any);

// 下拉框数据源（需要先初始化）
const {
  dropdownSources,
  currentOptionsCache,
  allClientsByIndustry: localAllClientsByIndustry, // ✅ 本地缓存
  feeCodeDetailCache, // ✅ 新增：费用代码详情缓存
  exchangeRateCache, // ✅ 新增：汇率缓存
  getExchangeRateFromCache, // ✅ 新增：获取汇率的方法
  initDropdownSources,
  updateUnitList,
  getFeeCodeList,
  loadAllClients, // ✅ 新增：一次性加载全部客户
  loadClientList,
  getSettlementIndustryCategory,
} = useDropdownSources(orderCtnList);

// ✅ 修复：添加标志位防止循环触发
const isConvertingIds = ref(false);

// ✅ 关键修改：如果父组件传入了客户缓存，则使用父组件的数据
watch(
  () => props.allClientsByIndustry,
  (newVal) => {
    if (newVal && Object.keys(newVal).length > 0) {
      console.log('✅ [OrderFeeTable] 使用父组件传入的客户缓存');
      // 将父组件的缓存赋值给本地的 allClientsByIndustry
      Object.assign(localAllClientsByIndustry.value, newVal);
    }
  },
  { immediate: true, deep: true },
);

// ✅ 新增：在组件挂载时初始化下拉框数据源
onMounted(async () => {
  console.log('🔄 [OrderFeeTable] 开始初始化下拉框数据源...');
  await initDropdownSources();
  console.log('✅ [OrderFeeTable] 下拉框数据源初始化完成');
});

// 字段联动
const linkage = useOrderFeeLinkage(
  props,
  { dataSource, editId, orderBaseData },
  () => ({
    industryCategoryList: dropdownSources.value.industryCategoryList,
    currencyList: dropdownSources.value.currencyList,
    feeCodeDetailCache: feeCodeDetailCache.value, // ✅ 直接使用解构出来的缓存
    exchangeRateCache: exchangeRateCache.value, // ✅ 新增：传递汇率缓存
    getExchangeRateFromCache, // ✅ 新增：传递获取汇率的方法
    allClientsByIndustry: localAllClientsByIndustry.value, // ✅ 新增：传递全量客户缓存
  }),
);

// 操作逻辑
const actions = useOrderFeeActions(
  props,
  {
    dataSource,
    selectedRowKeys,
    editId,
    getTableDate,
    syncFee,
    sanitizeOrderFee,
  },
  emit as any,
);

// 完结状态
const {
  isFinished,
  loadingFinishStatus,
  loadFinishStatus,
  toggleFinishStatus,
} = useFinishStatus(editId);

// 打印功能
const { printing, handlePrint } = useOrderFeePrint();
const selectedFeeIds = computed(() => {
  const selectedKeys = new Set(selectedRowKeys.value);
  return dataSource.value
    .filter((row) => selectedKeys.has((row as any)._rowKey))
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id && String(id).trim()));
});

// 排序功能
const { sortState, sortableFieldsSet, getSortIcon, handleColumnSort } =
  useOrderFeeSort(getTableDate);

// Handsontable 列配置
const { hotColumns } = useHotColumns(
  props,
  dropdownSources,
  dataSource,
  selectedRowKeys,
  sortableFieldsSet,
  sortState,
  getSortIcon,
  currentOptionsCache,
);

// Core Table 引用（需要在 handleOpenDropdown 之前定义）
const coreTableRef = ref<InstanceType<typeof OrderFeeTableCore>>();

// 获取列索引的辅助函数（需要在 handleOpenDropdown 之前定义）
const getColumnIndex = (field: string): number => {
  const columns = hotColumns.value;
  if (!columns || !Array.isArray(columns)) return -1;
  return columns.findIndex((col: any) => col.data === field);
};

// 下拉框打开回调函数（需要在 useHotSettings 之前定义）
const handleOpenDropdown = (
  rowIndex: number,
  colIndex: number,
  field: string,
  source: string[],
) => {
  const hotInstance = coreTableRef.value?.hotTableRef?.hotInstance;
  if (!hotInstance) {
    console.warn('⚠️ [handleOpenDropdown] hotInstance 不存在');
    return;
  }

  // ✅ 关键修复：在打开下拉框前，先获取并保存原值
  const originalValue = hotInstance.getDataAtCell(rowIndex, colIndex);
  console.log(
    `💾 [handleOpenDropdown] ${field} - 保存原值: "${originalValue}"`,
  );

  // 保存到单元格元数据中，以便用户取消编辑时可以恢复
  hotInstance.setCellMeta(rowIndex, colIndex, 'originalValue', originalValue);

  // ❌ 不要清空数据模型，这会导致单元格值也被清空
  // 改为在 afterBeginEditing 中使用 setTimeout 延迟清空 TD 的 innerHTML

  // ✅ 关键修复：设置单元格的 source，确保 autocomplete 编辑器有下拉列表
  hotInstance.setCellMeta(rowIndex, colIndex, 'source', source);
  console.log(
    `✅ [handleOpenDropdown] 已设置 source，共 ${source.length} 个选项`,
  );

  // 强制刷新单元格以确保 meta 生效
  hotInstance.render();
};

// 模态框管理（需要在 useHotSettings 之前定义）
const {
  modifyModalRef,
  auditHistoryModalRef,
  batchImportModalRef,
  openAuditHistoryModal,
  handleModalConfirm,
} = useModals();

// Handsontable 设置
const { hotSettings: rawHotSettings } = useHotSettings(
  dataSource,
  selectedRowKeys,
  hotColumns,
  sortableFieldsSet,
  handleColumnSort,
  linkage,
  dropdownSources,
  currentOptionsCache,
  loadClientList,
  getColumnIndex,
  getSettlementIndustryCategory,
  handleOpenDropdown,
  getSortIcon, // ✅ 新增：传递排序图标函数
  openAuditHistoryModal, // ✅ 修复：传递双击费用状态的回调
);

// 使用 shallowRef 包装 hotSettings，避免对大型配置对象进行深度响应式追踪
const hotSettings = shallowRef(rawHotSettings.value);

// ==================== 费用合计计算 ====================

/**
 * 计算选中行的费用合计（按币别分组）
 */
const feeSummary = computed(() => {
  if (!selectedRowKeys.value.length || !dataSource.value.length) {
    return null;
  }

  const summaryMap: Record<string, number> = {};

  selectedRowKeys.value.forEach((key: string | number) => {
    const row: any = dataSource.value.find((r: any) => r._rowKey === key);
    if (row && row.amount) {
      // ✅ 优先使用已转换的币别标签，其次使用币别ID转换，最后使用原始值
      let currencyLabel = '';

      if (row.currencyId_label_converted && row.currencyId) {
        // 已经转换为label的情况
        currencyLabel = row.currencyId;
      } else if (row.currencyId_value) {
        // 有保存的原始ID值
        currencyLabel =
          getCurrencyLabel(row.currencyId_value) ||
          String(row.currencyId_value);
      } else if (row.currencyId) {
        // 直接使用currencyId尝试转换
        currencyLabel =
          getCurrencyLabel(row.currencyId) || String(row.currencyId);
      } else {
        currencyLabel = '未知';
      }

      if (!summaryMap[currencyLabel]) {
        summaryMap[currencyLabel] = 0;
      }
      summaryMap[currencyLabel] =
        (summaryMap[currencyLabel] || 0) + (Number(row.amount) || 0);
    }
  });

  // 转换为数组格式，便于渲染
  return Object.entries(summaryMap)
    .filter(([_, amount]) => amount !== 0) // 过滤掉金额为0的币别
    .map(([currency, amount]) => ({
      currency,
      amount: amount.toFixed(2),
    }));
});

// ==================== 工具栏操作 ====================

const ImportOther = async (e: any) => {
  if (e.key === 'submit') {
    actions.generateOppositeFees();
  }
};

const SubmittedOther = async (e: any) => {
  switch (e.key) {
    case 'modify':
      actions.openModifyModal(modifyModalRef, orderBaseData);
      break;
    case 'delete':
      actions.showDeleteWithRemark();
      break;
    case 'withdraw':
      actions.orderFeeWithdraw();
  }
};

const openBatchImportModal = async () => {
  if (!editId.value) {
    message.warning('请先保存业务信息');
    return;
  }

  const orderDetail = orderBaseData.value;
  if (!orderDetail) {
    message.warning('订单详情未加载');
    return;
  }

  batchImportModalRef.value?.modalApi.setData({
    transportOrderId: editId.value,
    paySide: props.type,
    carrierId: orderDetail.carrierId,
    polId: orderDetail.polId,
    podId: orderDetail.podId,
  });

  batchImportModalRef.value?.modalApi.open();
};

const handleBatchImportConfirm = () => {
  getTableDate();
  syncFee();
  emit('refresh-opposite-table');
};

// ==================== ID 到 Label 转换辅助函数 ====================

/**
 * 根据费用代码ID获取显示标签
 */
const getFeeCodeLabel = (feeCodeId: any): string => {
  if (!feeCodeId) return '';
  const item = dropdownSources.value.feeCodeList.find(
    (f: any) => String(f.value) === String(feeCodeId),
  );
  if (!item) return '';
  return item.label || '';
};

/**
 * 根据行业类别值获取显示标签
 */
const getIndustryCategoryLabel = (industryCategory: any): string => {
  if (!industryCategory) return '';
  const option = dropdownSources.value.industryCategoryList.find(
    (opt: any) => String(opt.value) === String(industryCategory),
  );
  return option?.label || '';
};

/**
 * 根据币种ID获取显示标签
 */
const getCurrencyLabel = (currencyId: any): string => {
  if (!currencyId) return '';
  const currencyIdStr = String(currencyId);
  const option = dropdownSources.value.currencyList.find(
    (opt: any) => String(opt.value) === currencyIdStr,
  );
  return option?.label || '';
};

/**
 * 根据单位值获取显示标签
 */
const getUnitLabel = (unit: any): string => {
  if (!unit) return '';
  const option = dropdownSources.value.unitList.find(
    (opt: any) => opt.value === unit,
  );
  return option?.label || String(unit);
};

/**
 * 将数据源中的ID字段转换为Label显示
 */
const convertIdsToLabels = () => {
  if (!dataSource.value || dataSource.value.length === 0) return;

  let convertedCount = 0;

  dataSource.value.forEach((row: any, rowIndex: number) => {
    // 费用代码ID -> label
    if (row.feeCodeId && !row.feeCodeId_label_converted) {
      const label = getFeeCodeLabel(row.feeCodeId);
      if (label) {
        row.feeCodeId_value = row.feeCodeId;
        row.feeCodeId = label;
        row.feeCodeId_label_converted = true;
        convertedCount++;
      }
    }

    // 行业类别ID -> label
    if (
      row.industryCategory !== undefined &&
      row.industryCategory !== null &&
      !row.industryCategory_label_converted
    ) {
      const label = getIndustryCategoryLabel(row.industryCategory);
      if (label) {
        row.industryCategory_value = row.industryCategory;
        row.industryCategory = label;
        row.industryCategory_label_converted = true;
        convertedCount++;
      }
    }

    // 币别ID -> label
    if (row.currencyId && !row.currencyId_label_converted) {
      const label = getCurrencyLabel(row.currencyId);
      if (label) {
        row.currencyId_value = row.currencyId;
        row.currencyId = label;
        row.currencyId_label_converted = true;
        convertedCount++;
      }
    }

    // 单位 -> label
    if (row.unit && !row.unit_label_converted) {
      const label = getUnitLabel(row.unit);
      if (label) {
        row.unit_value = row.unit;
        row.unit = label;
        row.unit_label_converted = true;
        convertedCount++;
      }
    }

    // 结算对象ID -> label
    if (row.settlementId && !row.settlementId_label_converted) {
      const label = row.settlementName;
      if (label) {
        //row.settlementId_value = row.settlementId;
        row.settlementId = label;
        row.settlementId_label_converted = true;
        convertedCount++;
      }
    }
  });

  if (convertedCount > 0) {
    console.log(
      `✅ [convertIdsToLabels] 转换完成，共转换 ${convertedCount} 个字段`,
    );
  }
};

// ==================== 新增功能：滚动到最后一行并选中费用名称单元格 ====================

/**
 * 滚动到最后一行并选中费用名称单元格
 */
const scrollToLastAndSelectFeeName = async () => {
  await nextTick(); // 等待DOM更新

  const hotInstance = coreTableRef.value?.hotTableRef?.hotInstance;
  if (!hotInstance) {
    console.warn('⚠️ [scrollToLastAndSelectFeeName] hotInstance 不存在');
    return;
  }

  const rowCount = hotInstance.countRows();
  if (rowCount <= 0) {
    console.warn('⚠️ [scrollToLastAndSelectFeeName] 没有行数据');
    return;
  }

  // 获取费用名称字段的列索引
  const feeNameColIndex = getColumnIndex('feeCodeId');
  if (feeNameColIndex === -1) {
    console.warn('⚠️ [scrollToLastAndSelectFeeName] 未找到费用名称字段列');
    return;
  }

  // 获取最后一行的索引（减去1因为索引从0开始）
  const lastRowIndex = rowCount - 1;

  // 滚动到最后一行
  hotInstance.scrollViewportTo(lastRowIndex, 0);

  // 确保表格处于监听状态
  hotInstance.listen();

  // 选中费用名称单元格
  hotInstance.selectCell(lastRowIndex, feeNameColIndex);

  // 使用 setDataAtCell 并指定编辑模式
  //hotInstance.setDataAtCell(lastRowIndex, feeNameColIndex, '', 'edit');

  // 获取单元格元素并尝试激活编辑
  // const cell = hotInstance.getCell(lastRowIndex, feeNameColIndex);
  // if (cell) {
  //   // 通过模拟双击来激活编辑器
  //   const dblClickEvent = new MouseEvent('dblclick', {
  //     view: window,
  //     bubbles: true,
  //     cancelable: true
  //   });
  //   cell.dispatchEvent(dblClickEvent);
  // }
};

// 扩展 actions 对象，添加滚动和选中功能
const extendedActions = {
  ...actions,
  addRow: async () => {
    console.log('🚀 [extendedActions.addRow] 开始执行新增行操作');
    actions.addRow();
    // 在添加新行后延迟执行滚动和选中操作
    setTimeout(() => {
      scrollToLastAndSelectFeeName();
    }, 150);
  },
};

// ==================== 生命周期 ====================

onMounted(async () => {
  initOrderFeeEnumCache();
  await initDropdownSources();
  await getFeeCodeList();

  // ✅ 关键修改：只有当父组件没有传入客户缓存时，才在子组件中加载
  if (
    !props.allClientsByIndustry ||
    Object.keys(props.allClientsByIndustry).length === 0
  ) {
    console.log('⚠️ [OrderFeeTable] 父组件未传入客户缓存，将在子组件中加载');
    await loadAllClients();
  } else {
    console.log('✅ [OrderFeeTable] 使用父组件传入的客户缓存，跳过加载');
  }

  getTableDate();
  loadFinishStatus();
});

// 监听器
watch(
  () => orderCtnList.value,
  () => updateUnitList(),
  { deep: true },
);

watch(
  () => dataSource.value,
  (newData) => {
    // ✅ 修复：防止循环触发
    if (isConvertingIds.value) {
      console.log('⏭️ [watch dataSource] 正在转换ID，跳过本次触发');
      return;
    }

    // ✅ 关键修复：在更新 hotSettings 之前，先将ID转换为Label
    isConvertingIds.value = true;
    try {
      convertIdsToLabels();
    } finally {
      isConvertingIds.value = false;
    }

    // 直接修改 hotSettings.data 属性而不触发Vue深度响应
    hotSettings.value.data = newData;

    nextTick(() => {
      if (coreTableRef.value?.hotTableRef?.hotInstance) {
        // ✅ 优化：只调用 loadData，它会自动触发渲染，无需单独调用 render()
        coreTableRef.value.hotTableRef.hotInstance.loadData(newData);
      }
    });
  },
  { deep: true },
);

watch(
  () => hotColumns.value,
  (newColumns) => {
    // 直接修改 hotSettings.columns 属性而不触发Vue深度响应
    hotSettings.value.columns = newColumns;
    nextTick(() => {
      if (coreTableRef.value?.hotTableRef?.hotInstance) {
        // 使用 updateSettings 更新列配置而不是重新渲染整个设置
        coreTableRef.value.hotTableRef.hotInstance.updateSettings({
          columns: newColumns,
        });
      }
    });
  },
  { deep: true },
);

watch(
  () => selectedRowKeys.value,
  () => {
    nextTick(() => {
      if (coreTableRef.value?.hotTableRef?.hotInstance) {
        coreTableRef.value.hotTableRef.hotInstance.render();
      }
    });
  },
  { deep: true },
);

watch(
  () => editId.value,
  async (newEditId, oldEditId) => {
    if (newEditId && newEditId !== oldEditId) {
      loadFinishStatus();
    }
  },
);

// ==================== 暴露方法给父组件 ====================

/**
 * 获取选中费用的ID数组
 */
const getSelectedFeeIds = (): string[] => {
  const selectedKeys = new Set(selectedRowKeys.value);
  return dataSource.value
    .filter((row) => selectedKeys.has((row as any)._rowKey))
    .map((row) => row.id)
    .filter((id): id is string => Boolean(id && String(id).trim()));
};

/**
 * 获取选中费用的完整信息（将label转换回ID）
 */
const getSelectedFees = (): OrderFeeAdminApi.OrderFeeDto[] => {
  const selectedKeys = new Set(selectedRowKeys.value);
  const selectedRows = dataSource.value
    .filter((row) => selectedKeys.has((row as any)._rowKey))
    .filter((row) => row.id && String(row.id).trim());

  // 需要将label转换回ID
  return selectedRows.map((row: any) => {
    const restoredRow = { ...row };

    // 恢复费用代码ID
    if (restoredRow.feeCodeId_value) {
      restoredRow.feeCodeId = restoredRow.feeCodeId_value;
    }

    // 恢复行业类别
    if (restoredRow.industryCategory_value !== undefined) {
      restoredRow.industryCategory = restoredRow.industryCategory_value;
    }

    // 恢复币别ID
    if (restoredRow.currencyId_value) {
      restoredRow.currencyId = restoredRow.currencyId_value;
    }

    // 恢复单位
    if (restoredRow.unit_value) {
      restoredRow.unit = restoredRow.unit_value;
    }

    // 恢复结算对象ID
    if (restoredRow.settlementId_value) {
      restoredRow.settlementId = restoredRow.settlementId_value;
    }

    return restoredRow;
  });
};

// 监听选中行变化，发射事件通知父组件
watch(
  () => selectedRowKeys.value,
  (newKeys) => {
    console.log('📋 [selectedRowKeys] 选中状态变化:', newKeys.length, '条');
    emit('selection-change', {
      type: props.type,
      selectedIds: getSelectedFeeIds(),
    });
  },
  { deep: true },
);

defineExpose({
  getTableDate,
  getSelectedFeeIds,
  getSelectedFees,
});
</script>

<template>
  <Card class="order-fee-card">
    <div v-if="!isFinished" class="finish-status-badge" title="业务未完结">
      <img
        v-show="type === 0"
        :src="weiwanjie"
        alt="未完结"
        class="w-46 h-46"
      />
    </div>
    <!-- <div v-else class="finish-status-badge" title="业务未完结">
      <img v-show="type === 0" :src="yiwanjie" alt="已完结" class="w-46 h-46" />
    </div> -->

    <div class="px-1">
      <div class="order-ctn-table">
        <div class="handsontable-container">
          <div class="table-header">
            <span class="table-title">
              {{
                type === 0
                  ? $t('seaExport.export.orderFee.receivableCharges')
                  : $t('seaExport.export.orderFee.payableCharges')
              }}
            </span>
            <Space class="toolbar-actions">
              <Button type="primary" @click="extendedActions.addRow">{{
                $t('common.create')
              }}</Button>
              <Button
                type="primary"
                @click="actions.saveRow"
                v-show="props.mode !== 'changeOrder'"
              >
                {{ $t('common.save') }}
              </Button>
              <Button
                v-show="props.mode !== 'changeOrder'"
                :loading="printing"
                @click="
                  handlePrint({
                    feeType: type,
                    transportOrderId: editId,
                    orderDetail: orderBaseData,
                    selectedFeeIds,
                  })
                "
              >
                <IconifyIcon
                  icon="mdi:printer-outline"
                  class="mr-1 inline-block size-3.5 align-middle"
                />
                打印
              </Button>
              <Button
                danger
                :disabled="!selectedRowKeys.length"
                @click="actions.removeSelectedRows"
              >
                {{ $t('common.delete') }}
              </Button>

              <DropdownButton @click="openBatchImportModal" type="primary">
                {{ $t('seaExport.export.orderFee.batchImport') }}
                <template #overlay>
                  <Menu @click="ImportOther">
                    <MenuItem key="submit">{{
                      type === 0 ? '应收生成应付' : '应付生成应收'
                    }}</MenuItem>
                  </Menu>
                </template>
              </DropdownButton>

              <!-- <DropdownButton
                @click="actions.Submitted"
                type="primary"
                :disabled="!selectedRowKeys.length"
              >
                {{ $t('auditApproval.status.Submitted') }}
                <template #overlay>
                  <Menu @click="SubmittedOther">
                    <MenuItem key="modify">{{
                      $t('auditApproval.ApplyModification')
                    }}</MenuItem>
                    <MenuItem key="delete">{{
                      $t('auditApproval.ApplyDeletion')
                    }}</MenuItem>
                    <MenuItem key="withdraw">{{
                      $t('auditApproval.withdraw')
                    }}</MenuItem>
                  </Menu>
                </template>
              </DropdownButton> -->

              <!-- <Button
                type="primary"
                :disabled="!selectedRowKeys.length"
                @click="actions.orderFeeWithdraw"
              >
                {{ $t('auditApproval.withdraw') }}
              </Button> -->

              <Button
                v-show="type === 0"
                type="default"
                :loading="loadingFinishStatus"
                @click="toggleFinishStatus"
                class="finish-status-btn"
              >
                {{ isFinished ? '设为未完结' : '设为已完结' }}
              </Button>
            </Space>
          </div>

          <OrderFeeTableCore
            ref="coreTableRef"
            :data-source="dataSource"
            :selected-row-keys="selectedRowKeys"
            :hot-settings="hotSettings"
            :dropdown-sources="dropdownSources"
            :order-detail="orderBaseData"
            :sortable-fields="sortableFieldsSet"
            :sort-state="sortState"
            @update:selected-row-keys="selectedRowKeys = $event"
            @column-sort="handleColumnSort"
            @add-new-row="extendedActions.addRow"
          />

          <!-- 费用合计显示 -->
          <div v-if="feeSummary && feeSummary.length > 0" class="fee-summary">
            <div class="fee-summary-content">
              <!-- <span class="summary-label">费用合计：</span> -->
              <Space :size="16">
                <span
                  v-for="(item, index) in feeSummary"
                  :key="index"
                  class="summary-item"
                >
                  {{ item.currency }}: {{ item.amount }}
                </span>
              </Space>
            </div>
          </div>
        </div>
      </div>
    </div>

    <OrderFeeEditorModal
      ref="modifyModalRef"
      :rec-amount-map="recAmountMap || {}"
      :pay-amount-map="payAmountMap || {}"
      @confirm="actions.handleModalConfirm"
    />

    <OrderFeeAuditHistoryModal ref="auditHistoryModalRef" />

    <BatchImportFeeModal
      ref="batchImportModalRef"
      @confirm="handleBatchImportConfirm"
    />
  </Card>
</template>

<style scoped lang="scss">
.order-fee-card {
  position: relative;

  :deep(.ant-card-body) {
    padding: 0 2px 12px !important;
  }

  .order-ctn-table {
    display: flex;
    flex-direction: column;
    height: 515px;
  }

  .handsontable-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 500px;
    overflow: hidden;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
  }

  .table-header {
    display: flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: #fafafa;
    border-bottom: 1px solid #e8e8e8;

    .table-title {
      font-size: 14px;
      font-weight: 500;
      color: #262626;
    }

    .toolbar-actions {
      display: flex;
      gap: 8px;

      // ✅ 完结状态按钮特殊样式
      :deep(.finish-status-btn) {
        color: #faad14;
        background: linear-gradient(
          135deg,
          rgb(250 173 20 / 8%) 0%,
          rgb(250 173 20 / 4%) 100%
        );
        border-color: #faad14;

        &:hover:not(:disabled) {
          color: #ffc53d;
          background: linear-gradient(
            135deg,
            rgb(250 173 20 / 15%) 0%,
            rgb(250 173 20 / 8%) 100%
          );
          border-color: #ffc53d;
          box-shadow: 0 2px 8px rgb(250 173 20 / 20%);
        }

        &:active:not(:disabled) {
          color: #d48806;
          background: linear-gradient(
            135deg,
            rgb(250 173 20 / 20%) 0%,
            rgb(250 173 20 / 12%) 100%
          );
          border-color: #d48806;
        }

        &:disabled {
          color: rgb(0 0 0 / 25%);
          background: #f5f5f5;
          border-color: #d9d9d9;
        }
      }
    }
  }
}

.finish-status-badge {
  position: absolute;
  top: 20px;
  right: 0;
  z-index: 999;

  img {
    display: block;
    width: 104px;
    height: 104px;
    object-fit: contain;
  }
}

:deep(.handsontable) {
  td.htCenter {
    vertical-align: middle !important;
    text-align: center !important;
  }

  th .select-all-checkbox {
    cursor: pointer;

    &:hover {
      accent-color: #1890ff;
    }
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

// 费用合计样式
.fee-summary {
  position: absolute;
  top: 10px;
  right: 120px;
  left: 70px;
  z-index: 10;
  max-width: 600px;
  padding: 8px 20px;
  pointer-events: none; // ✅ 允许鼠标事件穿透，不影响滚动条操作
  // background: linear-gradient(
  //   135deg,
  //   rgb(255 255 255 / 98%) 0%,
  //   rgb(245 248 255 / 95%) 100%
  // );
  //border: 1px solid rgb(24 144 255 / 20%);
  border-radius: 8px;
  // box-shadow:
  //   0 4px 12px rgb(24 144 255 / 15%),
  //   0 2px 4px rgb(0 0 0 / 8%),
  //   inset 0 1px 0 rgb(255 255 255 / 80%);
  // backdrop-filter: blur(8px);
  // transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  // &:hover {
  //   border-color: rgb(24 144 255 / 35%);
  //   box-shadow:
  //     0 6px 20px rgb(24 144 255 / 25%),
  //     0 3px 8px rgb(0 0 0 / 12%),
  //     inset 0 1px 0 rgb(255 255 255 / 90%);
  //   transform: translateY(-2px);
  // }

  .fee-summary-content {
    display: flex;
    gap: 12px;
    align-items: center;
    font-size: 14px;
    pointer-events: auto; // ✅ 恢复内容区域的鼠标事件

    .summary-label {
      padding: 0;
      font-weight: 600;
      color: #1f2937;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .summary-item {
      padding: 4px 10px;
      font-weight: 600;
      color: #1890ff;
      white-space: nowrap;
      background: linear-gradient(
        135deg,
        rgb(24 144 255 / 8%) 0%,
        rgb(24 144 255 / 4%) 100%
      );
      border: 1px solid rgb(24 144 255 / 15%);
      border-radius: 4px;
      transition: all 0.2s ease;

      &:hover {
        background: linear-gradient(
          135deg,
          rgb(24 144 255 / 15%) 0%,
          rgb(24 144 255 / 8%) 100%
        );
        border-color: rgb(24 144 255 / 30%);
        box-shadow: 0 2px 8px rgb(24 144 255 / 20%);
        transform: scale(1.05);
      }
    }
  }
}
</style>
