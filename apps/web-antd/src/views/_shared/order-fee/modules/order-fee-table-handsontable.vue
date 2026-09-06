<script lang="ts" setup>
import type { OrderFeeAdminApi } from '#/api/sea-export/order-fee-admin';
import {
  computed,
  nextTick,
  onActivated,
  onMounted,
  onUnmounted,
  ref,
  watch,
  shallowRef,
} from 'vue';
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
import { orderFeeDataT, clientDataT } from '../data';
import weiwanjie from '#/assets/img/base/weiwanjie.png';
import yiwanjie from '#/assets/img/base/yiwanjie.png';
// 导入拆分后的组件和 composables
import OrderFeeTableCore from './OrderFeeTableCore.vue';
import OrderFeeEditorModal from './order-fee-editor-modal.vue';
import OrderFeeAuditHistoryModal from './order-fee-audit-history-modal.vue';
import BatchImportFeeModal from './batch-import-fee-modal.vue';
import AiBillFeeUploadModal from './ai-bill-fee-upload-modal.vue';
import AiBillFeeResultModal from './ai-bill-fee-result-modal.vue';
import { useOrderFeeData } from './composables/useOrderFeeData';
import { useOrderFeeActions } from './composables/useOrderFeeActions';
import { useOrderFeeLinkage } from './composables/useOrderFeeLinkage';
import { useFinishStatus } from './composables/useFinishStatus';
import { useOrderFeePrint } from './composables/useOrderFeePrint';
import { useDropdownSources } from './composables/useDropdownSources';
import { useOrderFeeSort } from './composables/useOrderFeeSort';
import { useHotColumns } from './composables/useHotColumns';
import { useHotSettings } from './composables/useHotSettings';
import { useModals } from './composables/useModals';
import { initOrderFeeEnumCache } from '../data';
import { ensureExchangeRateCache } from '#/utils/exchange-rate-cache';
import { useOrderFeeAdapter } from '../use-adapter';
import { extractBillFees } from '#/api/sea-export/gemini-admin';
import { consumePendingBillFees } from '../ai-bill-fee-pending';

const props = defineProps<{
  type: number; // 收付类型 0 应收 1 应付
  mode?: string; // changeOrder 更改单
  parentChangeOrderId?: string;
  recAmountMap?: Record<string, any>;
  payAmountMap?: Record<string, any>;
  orderDetail?: any | null;
  allClientsByIndustry?: Record<string, Array<{ label: string; value: any }>>; // ✅ 新增：从父组件传入的客户缓存
}>();

const adapter = useOrderFeeAdapter();

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
  isFeeDirty,
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
  localAllClientsByIndustry, // ✅ 传入全量客户缓存：结算对象列拖拽填充时的 strict 校验兜底
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
  openModifyModal,
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

// ==================== 批量导入功能 ====================

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
    bizType: adapter.bizType, // 按当前模块适配器取业务类型（0=海运出口，1=海运进口，2=空运出口）
  });

  batchImportModalRef.value?.modalApi.open();
};

const handleBatchImportConfirm = () => {
  getTableDate();
  syncFee();
  emit('refresh-opposite-table');
};

// ==================== AI 识别账单费用（仅应付表 type===1） ====================

/** 上传弹窗开关 */
const aiUploadOpen = ref(false);
/** 识别中：驱动上传弹窗 Spin，并防止重复提交 */
const aiRecognizing = ref(false);
/** 结果确认弹窗（useVbenModal，通过 modalApi 打开） */
const aiResultModalRef = ref<InstanceType<typeof AiBillFeeResultModal>>();

/** 打开结果确认弹窗 */
const openAiBillFeeResultModal = (data: {
  mblNum?: null | string;
  orderFees: any[];
  transportOrder: any;
  transportOrderId: string;
}) => {
  aiResultModalRef.value?.modalApi.setData(data);
  aiResultModalRef.value?.modalApi.open();
};

/** 打开 AI 识别上传弹窗 */
const openAiBillFeeModal = () => {
  if (!editId.value) {
    message.warning('请先保存业务信息');
    return;
  }
  aiUploadOpen.value = true;
};

/**
 * 上传弹窗选中文件 → 带当前业务 id 识别。
 * 费用页已打开某一票，传 transportOrderId，后端会校验账单主提单号须与本票一致。
 */
const handleAiBillFeeFile = async (file: File) => {
  if (aiRecognizing.value) return;
  aiRecognizing.value = true;
  const hideLoading = message.loading({
    content: 'AI识别中，请稍候...',
    duration: 0,
    key: 'ai_bill_fee_page',
  });
  try {
    const result = await extractBillFees(file, editId.value);
    hideLoading();
    aiUploadOpen.value = false;
    const fees = result?.orderFees ?? [];
    if (fees.length === 0) {
      message.info('未从账单中识别出费用行');
      return;
    }
    openAiBillFeeResultModal({
      transportOrderId: result.transportOrder?.id || editId.value || '',
      transportOrder: result.transportOrder,
      mblNum: result.mblNum,
      orderFees: fees,
    });
  } catch (error) {
    // 后端错误文案（如账单提单号与本票不一致）已由全局拦截器提示，此处仅关闭 loading
    hideLoading();
    console.error('[OrderFeeTable] 账单识别失败:', error);
  } finally {
    aiRecognizing.value = false;
  }
};

/** 结果弹窗提交成功 → 刷新应付表（与批量导入一致） */
const handleAiBillFeeResultConfirm = () => {
  getTableDate();
  syncFee();
  emit('refresh-opposite-table');
};

/**
 * 消费列表页跨页暂存的识别费用（仅应付表）。
 * 列表页识别→跳转后，应付表挂载 / 激活 / 切票时按业务 id 精确读取并清除暂存，
 * 命中则自动弹出确认弹窗，避免用户二次上传、二次等待 AI。
 */
const tryConsumePendingBillFees = () => {
  if (props.type !== 1) return;
  const orderId = editId.value;
  if (!orderId) return;
  const pending = consumePendingBillFees(orderId);
  if (!pending || !pending.orderFees || pending.orderFees.length === 0) return;
  nextTick(() => {
    openAiBillFeeResultModal({
      transportOrderId: pending.transportOrderId,
      transportOrder: pending.transportOrder,
      mblNum: pending.transportOrder?.mblNum,
      orderFees: pending.orderFees,
    });
  });
};

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

/**
 * 获取所有费用数据（用于整票提交时获取未提交的费用）
 */
const getAllFees = (): OrderFeeAdminApi.OrderFeeDto[] => {
  return dataSource.value
    .filter((row) => row.id && String(row.id).trim())
    .map((row: any) => {
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

      return restoredRow as OrderFeeAdminApi.OrderFeeDto;
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
  getAllFees, // 新增：获取所有费用
  isFeeDirty,
  openModifyModal,
});

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
      const label = row.settlement?.name ?? row.__settlementName;
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

/**
 * 处理键盘快捷键 Ctrl+S 保存
 */
const handleKeyDown = (event: KeyboardEvent) => {
  // 检查是否按下了 Ctrl+S (或 Cmd+S on Mac)
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault(); // 阻止浏览器默认的保存行为
    actions.saveRow();
    // 只有在有选中行且不是只读模式时才执行保存
    // const isReadonly = props.mode === 'changeOrder' && props.parentChangeOrderId;
    // if (!isReadonly && selectedRowKeys.value.length > 0) {
    //   console.log('⌨️ [键盘快捷键] 检测到 Ctrl+S，执行保存操作');
    //   actions.saveRow();
    // } else if (isReadonly) {
    //   message.warning('当前为只读模式，无法保存');
    // } else {
    //   message.warning('请先选择要保存的费用行');
    // }
  }
};

onMounted(async () => {
  initOrderFeeEnumCache();
  // 列表页 AI 识别跳转而来：应付表挂载即消费跨页暂存，命中则自动弹出确认弹窗
  tryConsumePendingBillFees();
  // 本次进入费用页重新拉一遍汇率，避免用到上一次会话缓存的旧汇率（ETD+本位币匹配用）
  await ensureExchangeRateCache(true);
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

  // ✅ 关键修复：初始化时也调用 updateUnitList，确保 unit 下拉框有数据
  updateUnitList();
  console.log(
    `✅ [onMounted] 已初始化单位列表，共 ${dropdownSources.value.unitList.length} 个选项`,
  );

  getTableDate();
  loadFinishStatus();

  // 添加键盘事件监听器
  document.addEventListener('keydown', handleKeyDown);
  console.log('✅ [键盘快捷键] 已注册 Ctrl+S 保存快捷键');
});

onUnmounted(() => {
  // 移除键盘事件监听器，防止内存泄漏
  document.removeEventListener('keydown', handleKeyDown);
  console.log('✅ [键盘快捷键] 已移除 Ctrl+S 保存快捷键');

  console.log('🧹 [OrderFeeTable] 组件卸载，清理缓存');
  localAllClientsByIndustry.value = {};
  feeCodeDetailCache.value.clear();
  exchangeRateCache.value.clear();
});

// KeepAlive 复用（从列表页识别跳转回已缓存的费用页）时消费跨页暂存
onActivated(() => {
  tryConsumePendingBillFees();
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
      // 切换到另一票时，若存在该票的跨页暂存识别费用则消费
      tryConsumePendingBillFees();
    }
  },
);
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
                  ? orderFeeDataT('receivableCharges')
                  : orderFeeDataT('payableCharges')
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
                {{ orderFeeDataT('batchImport') }}
                <template #overlay>
                  <Menu @click="ImportOther">
                    <MenuItem key="submit">{{
                      type === 0 ? '应收生成应付' : '应付生成应收'
                    }}</MenuItem>
                  </Menu>
                </template>
              </DropdownButton>

              <Button
                v-if="type === 1 && props.mode !== 'changeOrder'"
                type="primary"
                ghost
                @click="openAiBillFeeModal"
              >
                <IconifyIcon
                  icon="mdi:robot-outline"
                  class="mr-1 inline-block size-3.5 align-middle"
                />
                <span class="align-middle">AI识别</span>
              </Button>

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

    <AiBillFeeUploadModal
      v-if="type === 1"
      v-model:open="aiUploadOpen"
      :recognizing="aiRecognizing"
      @file="handleAiBillFeeFile"
    />

    <AiBillFeeResultModal
      v-if="type === 1"
      ref="aiResultModalRef"
      @confirm="handleAiBillFeeResultConfirm"
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

  // 已修改单元格角标：左上角橙色三角，纯 CSS 呈现，无 JS 渲染开销
  td.cell-edited-mark {
    position: relative;

    &::before {
      position: absolute;
      top: 0;
      left: 0;
      z-index: 1;
      pointer-events: none;
      content: '';
      border-top: 7px solid #fa8c16;
      border-right: 7px solid transparent;
    }
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
