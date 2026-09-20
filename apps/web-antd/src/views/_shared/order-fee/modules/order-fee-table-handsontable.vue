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
  Dropdown,
  MenuItem,
  Menu,
  Card,
  Modal,
} from 'ant-design-vue';
import { ChevronDown, IconifyIcon } from '@vben/icons';
import { $t } from '#/locales';
import { orderFeeDataT, clientDataT } from '../data';
import { createAbpPermission } from '#/utils/abp-permission';
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
import {
  applyHotWarningHighlightClasses,
  refreshHotVisualRows,
  resolveVisualRowsForSelectionChange,
} from './utils/hot-refresh';
import { useThrottleFn } from '@vueuse/core';
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
import {
  restoreOrderFeeSort,
  sortOrderFees,
} from '#/api/sea-export/order-fee-admin';

const props = defineProps<{
  type: number; // 收付类型 0 应收 1 应付
  mode?: string; // changeOrder 更改单
  parentChangeOrderId?: string;
  readonly?: boolean; // 当前更改单费用锁定时统一只读
  recAmountMap?: Record<string, any>;
  payAmountMap?: Record<string, any>;
  orderDetail?: any | null;
  allClientsByIndustry?: Record<string, Array<{ label: string; value: any }>>; // ✅ 新增：从父组件传入的客户缓存
  /** 预警悬停高亮的费用 id */
  highlightFeeIds?: string[];
}>();

const isChangeOrderMode = computed(() => props.mode === 'changeOrder');
const isTableReadonly = computed(() => Boolean(props.readonly));
const orderFeePerm = createAbpPermission('Admin.OrderFee');

const adapter = useOrderFeeAdapter();

const emit = defineEmits([
  'sync-fee',
  'update-amount',
  'refresh-opposite-table',
  'selection-change',
  'change',
]);

// ==================== 使用 Composables ====================

// 数据管理
const {
  dataSource,
  selectedRowKeys,
  orderBaseData,
  orderCtnList,
  editId,
  changeOrderId,
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

  // 保存到单元格元数据中，以便用户取消编辑时可以恢复
  hotInstance.setCellMeta(rowIndex, colIndex, 'originalValue', originalValue);

  // ❌ 不要清空数据模型，这会导致单元格值也被清空
  // 改为在 afterBeginEditing 中使用 setTimeout 延迟清空 TD 的 innerHTML

  // ✅ 关键修复：设置单元格的 source，确保 autocomplete 编辑器有下拉列表
  hotInstance.setCellMeta(rowIndex, colIndex, 'source', source);

  // 强制刷新单元格以确保 meta 生效（仅当前格所属行）
  refreshHotVisualRows(hotInstance, [rowIndex], { fullRenderThreshold: 1 });
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
const feeSortMode = ref(false);
const feeSortDirty = ref(false);
const feeSortSaving = ref(false);
const feeSortResetting = ref(false);

const getHotInstance = () =>
  coreTableRef.value?.hotTableRef?.hotInstance ?? null;

/** ManualRowMove 只改视觉行序，需按 visual→physical 还原当前展示顺序 */
const getFeesInVisualOrder = () => {
  const list = dataSource.value ?? [];
  const hot = getHotInstance();
  if (!hot || list.length === 0) {
    return [...list];
  }

  const ordered: typeof list = [];
  const rowCount = hot.countRows();
  for (let visual = 0; visual < rowCount; visual++) {
    const physical = hot.toPhysicalRow(visual);
    const row =
      typeof physical === 'number' && physical >= 0
        ? (list[physical] ?? hot.getSourceDataAtRow(physical))
        : null;
    if (row) {
      ordered.push(row);
    }
  }
  return ordered.length > 0 ? ordered : [...list];
};

const onAfterFeeRowMove = () => {
  feeSortDirty.value = true;
};

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
  () => feeSortMode.value,
  onAfterFeeRowMove,
  () => props.highlightFeeIds ?? [],
);

// 使用 shallowRef 包装 hotSettings，避免对大型配置对象进行深度响应式追踪
const hotSettings = shallowRef(rawHotSettings.value);

const applyFeeSortModeSettings = (enabled: boolean) => {
  const next = {
    contextMenu: !enabled && !isTableReadonly.value,
    manualRowMove: enabled,
    readOnly: enabled || isTableReadonly.value,
    rowHeaderWidth: 32,
    rowHeaders: enabled,
  };
  // 必须同步进 hotSettings：表头区显隐会触发 ResizeObserver → dynHeight 变化，
  // OrderFeeTableCore 的 mergedSettings 会用 hotSettings 再 updateSettings；
  // 若不写回，会把刚打开的行头/ManualRowMove 盖回 false（⋮⋮ 闪一下消失）。
  Object.assign(hotSettings.value, next);
  const hot = getHotInstance();
  if (!hot) return;
  hot.updateSettings(next);
  hot.render();
};

const enterFeeSortMode = () => {
  if (isTableReadonly.value) {
    message.warning('当前费用只读，无法排序');
    return;
  }
  if (!dataSource.value.length) {
    message.warning('暂无费用可排序');
    return;
  }
  feeSortMode.value = true;
  feeSortDirty.value = false;
  nextTick(() => applyFeeSortModeSettings(true));
};

const exitFeeSortMode = async (reload = false) => {
  feeSortMode.value = false;
  feeSortDirty.value = false;
  applyFeeSortModeSettings(false);
  // 等 ManualRowMove 关闭后再改数据，避免与 loadData 竞态卡死
  await nextTick();
  if (reload) {
    await getTableDate();
  }
};

const cancelFeeSortMode = () => {
  if (feeSortDirty.value) {
    Modal.confirm({
      title: '取消排序',
      content:
        '当前顺序尚未保存，取消后将恢复为进入排序前的列表顺序，是否继续？',
      okText: '放弃调整',
      cancelText: '继续调整',
      onOk: async () => {
        await exitFeeSortMode(true);
      },
    });
    return;
  }
  void exitFeeSortMode(false);
};

const saveFeeSortOrder = async () => {
  // 必须按 Handsontable 当前视觉顺序取行，不能直接用 dataSource 物理下标
  const ordered = getFeesInVisualOrder();
  // 只组 payload，禁止就地改 sortId：deep watch 会在排序模式下 loadData，打乱 ManualRowMove
  const payload = ordered
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => row?.id && String(row.id).trim())
    .map(({ row, index }) => ({
      id: String(row.id),
      sortId: index,
    }));

  if (payload.length === 0) {
    message.warning('没有已保存的费用可写入排序，请先保存费用后再排序');
    return;
  }

  feeSortSaving.value = true;
  try {
    await sortOrderFees({ orderFees: payload });
    message.success('排序已保存');
    feeSortDirty.value = false;
    // 先退出排序模式并释放按钮 loading，再拉列表（避免 updateSettings + loadData 卡死转圈）
    feeSortMode.value = false;
    applyFeeSortModeSettings(false);
  } catch (error) {
    console.error('保存费用排序失败:', error);
    return;
  } finally {
    feeSortSaving.value = false;
  }

  await nextTick();
  await getTableDate();
};

const resetFeeSortOrder = () => {
  if (!editId.value) {
    message.warning('缺少业务 id');
    return;
  }
  Modal.confirm({
    title: '重置排序',
    content: '将恢复为按录入时间的原始顺序，并清空自定义排序，是否继续？',
    okText: '重置',
    cancelText: '取消',
    async onOk() {
      feeSortResetting.value = true;
      try {
        await restoreOrderFeeSort({
          transportOrderId: String(editId.value),
          paySide: props.type ?? 0,
          ...(isChangeOrderMode.value &&
          (changeOrderId.value || props.parentChangeOrderId)
            ? {
                changeOrderId: String(
                  changeOrderId.value || props.parentChangeOrderId,
                ),
              }
            : {}),
        });
        message.success('已恢复原始录入顺序');
        feeSortDirty.value = false;
        feeSortMode.value = false;
        applyFeeSortModeSettings(false);
      } catch (error) {
        console.error('重置费用排序失败:', error);
        return;
      } finally {
        feeSortResetting.value = false;
      }

      await nextTick();
      await getTableDate();
    },
  });
};

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

const handleMoreMenuClick = (info: { key: string | number }) => {
  const key = String(info.key);
  switch (key) {
    case 'print': {
      handlePrint({
        feeType: props.type,
        transportOrderId: editId.value,
        orderDetail: orderBaseData.value,
        selectedFeeIds: selectedFeeIds.value,
        isChangeOrderPrint: isChangeOrderMode.value,
        changeOrderId: isChangeOrderMode.value
          ? changeOrderId.value || props.parentChangeOrderId
          : undefined,
      });
      break;
    }
    case 'batchImport': {
      openBatchImportModal();
      break;
    }
    case 'generateOpposite': {
      ImportOther({ key: 'submit' });
      break;
    }
    case 'finishStatus': {
      toggleFinishStatus();
      break;
    }
  }
};

// ==================== 批量导入功能 ====================

const openBatchImportModal = async () => {
  if (isChangeOrderMode.value) {
    message.warning('批量引入暂不支持更改单');
    return;
  }
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
 * 提单号规范化：去空格 / 横杠并转大写。
 * 后端返回的 result.mblNum 已是此口径，而 transportOrder.mblNum 为库里原值，
 * 比对前需统一规范化，避免因格式差异误判「不一致」。
 */
const normalizeMblNum = (val?: null | string) =>
  (val || '').replace(/[\s-]/g, '').toUpperCase();

/**
 * 上传弹窗选中文件 → 带当前业务 id 识别。
 * 费用页已打开某一票，传 transportOrderId：据 Gemini 对接文档 7.5，后端此时
 * 不再核对比单号（业务存在即返回费用），改由前端用返回的 mblNum 与本票主提单号
 * 比对，对不上只提示用户、由用户确认是否引入，接口本身不会报错。
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

    // 进入结果确认弹窗（由用户勾选要添加的费用行）
    const openResult = () =>
      openAiBillFeeResultModal({
        transportOrderId: result.transportOrder?.id || editId.value || '',
        transportOrder: result.transportOrder,
        mblNum: result.mblNum,
        orderFees: fees,
      });

    // 账单识别提单号 vs 当前业务主提单号（均规范化后比对）
    const billMbl = normalizeMblNum(result.mblNum);
    const currentMbl = normalizeMblNum(result.transportOrder?.mblNum);

    // 一致：直接进入结果确认
    if (billMbl && billMbl === currentMbl) {
      openResult();
      return;
    }

    // 对不上（不一致 / 账单未识别到提单号）：仅提示，由用户确认是否引入
    const currentMblText = result.transportOrder?.mblNum || '空';
    Modal.confirm({
      title: '提单号不一致',
      content: billMbl
        ? `账单识别的提单号为【${result.mblNum}】，与当前业务主提单号【${currentMblText}】不一致，是否确认将识别出的费用引入当前票？`
        : '未能从账单中识别到提单号，无法自动核对，是否确认将识别出的费用引入当前票？',
      okText: '确认引入',
      cancelText: '取消',
      onOk: openResult,
    });
  } catch (error) {
    // 后端错误文案已由全局拦截器提示，此处仅关闭 loading
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

/** 更改单整包保存：含未落库新行，并还原下拉 ID */
const getSanitizedFees = (): OrderFeeAdminApi.OrderFeeEditDto[] =>
  sanitizeOrderFee(dataSource.value);

defineExpose({
  getTableDate,
  getSelectedFeeIds,
  getSelectedFees,
  getAllFees, // 新增：获取所有费用
  getSanitizedFees,
  isFeeDirty,
  openModifyModal,
  remasureTable: () => coreTableRef.value?.remasure?.(),
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
    if (isTableReadonly.value) return;
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
  // 更改单由父页 Ctrl/Cmd+S 整包保存，这里不走费用表 OrderFeeAdmin
  if (isChangeOrderMode.value) return;
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    actions.saveRow();
  }
};

onMounted(() => {
  initOrderFeeEnumCache();
  if (!isChangeOrderMode.value) {
    tryConsumePendingBillFees();
  }

  // 表格先出：费用列表与下拉源并行；主单不阻塞等下拉
  const dropdownReady = (async () => {
    await Promise.all([ensureExchangeRateCache(true), initDropdownSources()]);
    updateUnitList();
  })();

  if (isChangeOrderMode.value) {
    // 更改单：等下拉就绪再拉费用，避免 ID→标签转换缺源
    void (async () => {
      await dropdownReady;
      const id = changeOrderId.value || props.parentChangeOrderId || '';
      if (id) {
        await getTableDate(id);
      }
    })();
  } else {
    void getTableDate();
    void loadFinishStatus();
    void dropdownReady.then(() => {
      // 下拉补齐后把已加载行的 ID 转成标签
      if (dataSource.value?.length) {
        isConvertingIds.value = true;
        try {
          convertIdsToLabels();
        } finally {
          isConvertingIds.value = false;
        }
        getHotInstance()?.render();
      }
    });
  }

  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
  // 客户缓存为模块级共享，卸载单表时不清空
  feeCodeDetailCache.value.clear();
  exchangeRateCache.value.clear();
});

// KeepAlive 复用（从列表页识别跳转回已缓存的费用页）时消费跨页暂存
onActivated(() => {
  if (!isChangeOrderMode.value) {
    tryConsumePendingBillFees();
  }
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

    emit('change');
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

const prevSelectedRowKeys = ref<(string | number)[]>([]);

const scheduleSelectionRefresh = useThrottleFn((visualRows: number[]) => {
  const hot = getHotInstance();
  if (!hot) return;
  refreshHotVisualRows(hot, visualRows);
}, 48);

watch(
  () => selectedRowKeys.value,
  (newKeys) => {
    emit('selection-change', {
      type: props.type,
      selectedIds: getSelectedFeeIds(),
    });

    const hot = getHotInstance();
    const visualRows = resolveVisualRowsForSelectionChange(
      hot,
      dataSource.value ?? [],
      prevSelectedRowKeys.value,
      newKeys,
    );
    prevSelectedRowKeys.value = [...newKeys];
    if (visualRows.length === 0) return;
    nextTick(() => scheduleSelectionRefresh(visualRows));
  },
  { deep: true },
);

watch(
  () => props.highlightFeeIds,
  (ids) => {
    nextTick(() => {
      const hot = getHotInstance();
      if (!hot) return;
      applyHotWarningHighlightClasses(
        hot,
        dataSource.value ?? [],
        (ids ?? []).map(String),
      );
    });
  },
  { deep: true },
);

watch(
  () => editId.value,
  async (newEditId, oldEditId) => {
    if (newEditId && newEditId !== oldEditId) {
      if (!isChangeOrderMode.value) {
        loadFinishStatus();
      }
      // 切换到另一票时，若存在该票的跨页暂存识别费用则消费
      tryConsumePendingBillFees();
    }
  },
);
</script>

<template>
  <Card
    class="order-fee-card"
    :class="{ 'change-order-fee-table': isChangeOrderMode }"
  >
    <div
      v-if="!isChangeOrderMode && !isFinished"
      class="finish-status-badge"
      title="业务未完结"
    >
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

    <div class="flex min-h-0 flex-1 flex-col">
      <div class="order-ctn-table">
        <div class="handsontable-container">
          <div class="table-header">
            <div class="table-header__left">
              <slot name="toolbar-actions">
                <span class="table-title">
                  {{
                    type === 0
                      ? orderFeeDataT('receivableCharges')
                      : orderFeeDataT('payableCharges')
                  }}
                </span>
              </slot>
              <!-- 费用排序：紧贴标题右侧，虚线次要样式，与右侧增删主操作区分 -->
              <div class="fee-sort-actions">
                <template v-if="feeSortMode">
                  <span class="fee-sort-hint">按住左侧 ⋮⋮ 拖动调整顺序</span>
                  <Button
                    size="small"
                    type="link"
                    class="fee-sort-link-btn"
                    :loading="feeSortSaving"
                    :disabled="!feeSortDirty"
                    @click="saveFeeSortOrder"
                  >
                    保存排序
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    class="fee-sort-link-btn"
                    :loading="feeSortResetting"
                    @click="resetFeeSortOrder"
                  >
                    重置排序
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    class="fee-sort-entry-btn"
                    @click="cancelFeeSortMode"
                  >
                    取消
                  </Button>
                </template>
                <Button
                  v-else
                  size="small"
                  type="text"
                  class="fee-sort-entry-btn"
                  :disabled="isTableReadonly || !dataSource.length"
                  @click="enterFeeSortMode"
                >
                  <IconifyIcon
                    icon="mdi:drag"
                    class="mr-0.5 inline-block size-3.5 align-middle"
                  />
                  费用排序
                </Button>
              </div>
              <slot name="title-extra" />
              <!-- 选中行按币别汇总：紧挨预警右侧，保持间距 -->
              <div
                v-if="feeSummary && feeSummary.length > 0"
                class="fee-summary"
              >
                <div class="fee-summary-content">
                  <span
                    v-for="(item, index) in feeSummary"
                    :key="index"
                    class="summary-item"
                  >
                    {{ item.currency }}: {{ item.amount }}
                  </span>
                </div>
              </div>
            </div>
            <Space v-show="!feeSortMode" size="small" class="toolbar-actions">
              <Button
                v-access:code="orderFeePerm.add"
                size="small"
                type="primary"
                :disabled="isTableReadonly"
                @click="extendedActions.addRow"
              >
                {{ $t('common.create') }}
              </Button>
              <Button
                v-show="!isChangeOrderMode"
                v-access:code="orderFeePerm.edit"
                size="small"
                type="primary"
                @click="actions.saveRow"
              >
                {{ $t('common.save') }}
              </Button>
              <Button
                v-access:code="orderFeePerm.delete"
                size="small"
                danger
                ghost
                :disabled="isTableReadonly || !selectedRowKeys.length"
                @click="actions.removeSelectedRows"
              >
                {{ $t('common.delete') }}
              </Button>

              <Button
                v-if="type === 1 && !isChangeOrderMode"
                v-access:code="orderFeePerm.edit"
                size="small"
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

              <Dropdown :trigger="['click']">
                <Button size="small">
                  更多
                  <ChevronDown
                    class="ml-0.5 inline-block size-3.5 align-middle opacity-70"
                  />
                </Button>
                <template #overlay>
                  <Menu @click="handleMoreMenuClick">
                    <MenuItem key="print" :disabled="printing">
                      <IconifyIcon
                        icon="mdi:printer-outline"
                        class="mr-1 inline-block size-3.5 align-middle"
                      />
                      打印
                    </MenuItem>
                    <MenuItem
                      key="batchImport"
                      v-access:code="orderFeePerm.add"
                      :disabled="isTableReadonly || isChangeOrderMode"
                    >
                      {{ orderFeeDataT('batchImport') }}
                    </MenuItem>
                    <MenuItem
                      key="generateOpposite"
                      v-access:code="orderFeePerm.add"
                      :disabled="isTableReadonly"
                    >
                      {{ type === 0 ? '应收生成应付' : '应付生成应收' }}
                    </MenuItem>
                    <MenuItem
                      v-if="type === 0 && !isChangeOrderMode"
                      key="finishStatus"
                      v-access:code="orderFeePerm.edit"
                      :disabled="loadingFinishStatus"
                    >
                      {{ isFinished ? '设为未完结' : '设为已完结' }}
                    </MenuItem>
                  </Menu>
                </template>
              </Dropdown>
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
            :read-only="isTableReadonly"
            @update:selected-row-keys="selectedRowKeys = $event"
            @column-sort="handleColumnSort"
            @add-new-row="extendedActions.addRow"
          />
          <div
            v-if="isTableReadonly"
            class="readonly-fee-mask"
            title="该更改单已锁定，费用仅可查看"
          ></div>
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
  display: flex;
  flex-direction: column;
  min-height: 0;

  :deep(.ant-card-body) {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0 !important;
  }

  .order-ctn-table {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .handsontable-container {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    border: 1px solid #e4e8ef;
    border-radius: 8px;
  }

  .table-header {
    display: flex;
    flex-shrink: 0;
    gap: 6px;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: #fafbfd;
    border-bottom: 1px solid #eef1f6;

    .table-header__left {
      display: flex;
      flex: 1;
      flex-wrap: wrap;
      gap: 4px;
      align-items: center;
      min-width: 0;
    }

    .table-title {
      flex-shrink: 0;
      font-size: 14px;
      font-weight: 500;
      color: #252a31;
    }

    .toolbar-actions {
      display: flex;
      flex-shrink: 0;
      gap: 6px;
      align-items: center;
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

  .fee-reject-help {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    font-size: 10px;
    font-weight: 600;
    line-height: 1;
    color: #fff;
    cursor: help;
    background: #8c8c8c;
    border-radius: 50%;
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
      accent-color: hsl(var(--primary));
    }
  }

  td input[type='checkbox'] {
    width: 16px;
    height: 16px;
    cursor: pointer;

    &:hover {
      accent-color: hsl(var(--primary));
    }

    &:checked {
      accent-color: hsl(var(--primary));
    }
  }
}

// 费用合计：紧挨预警右侧，保持间距；高度随内容展开，不出现滚动条
.fee-summary {
  display: flex;
  flex-shrink: 1;
  align-items: center;
  min-width: 0;
  margin-left: 12px;

  .fee-summary-content {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 13px;
    line-height: 22px;

    .summary-label {
      padding: 0;
      font-weight: 600;
      color: #1f2937;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .summary-item {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      font-weight: 600;
      line-height: 20px;
      color: hsl(var(--primary));
      white-space: nowrap;
      background: linear-gradient(
        135deg,
        hsl(var(--primary) / 8%) 0%,
        hsl(var(--primary) / 4%) 100%
      );
      border: 1px solid hsl(var(--primary) / 15%);
      border-radius: 4px;
      transition: all 0.2s ease;

      &:hover {
        background: linear-gradient(
          135deg,
          hsl(var(--primary) / 15%) 0%,
          hsl(var(--primary) / 8%) 100%
        );
        border-color: hsl(var(--primary) / 30%);
      }
    }
  }
}

.readonly-fee-mask {
  position: absolute;
  inset: 49px 0 0;
  z-index: 5;
  cursor: not-allowed;
  background: rgb(255 255 255 / 25%);
}

.change-order-fee-table {
  overflow: hidden;
  border: 0;
  box-shadow: none;

  :deep(.ant-card-body) {
    padding: 0 0 8px !important;
    overflow: hidden;
  }
}

.fee-sort-actions {
  display: inline-flex;
  flex-shrink: 0;
  gap: 2px;
  align-items: center;
  margin-left: 6px;
}

.fee-sort-hint {
  margin-right: 2px;
  font-size: 12px;
  line-height: 22px;
  color: #8c95a3;
  white-space: nowrap;
}

.fee-sort-entry-btn {
  height: 24px !important;
  padding: 0 8px !important;
  font-size: 12px;
  line-height: 22px;
  color: #64748b !important;
  background: #f8fafc !important;
  border: 1px dashed #cbd5e1 !important;
  border-radius: 4px !important;
  box-shadow: none !important;

  &:hover:not(:disabled) {
    color: hsl(var(--primary)) !important;
    background: hsl(var(--primary) / 8%) !important;
    border-color: hsl(var(--primary) / 45%) !important;
  }

  &:disabled {
    color: #94a3b8 !important;
    background: #f1f5f9 !important;
    border-color: #e2e8f0 !important;
    opacity: 0.7;
  }
}

.fee-sort-link-btn {
  height: 24px !important;
  padding: 0 6px !important;
  font-size: 12px;
}

:deep(.fee-sort-row-header) {
  cursor: grab !important;
  user-select: none;
  background: #f5f7fb !important;
  border-color: #e8ecf3 !important;

  &:active {
    cursor: grabbing !important;
  }
}

:deep(.fee-sort-handle) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  font-size: 14px;
  font-weight: 700;
  color: #8c95a3;
  letter-spacing: -1px;
  transition: color 0.15s ease;
}

:deep(.fee-sort-row-header:hover .fee-sort-handle) {
  color: hsl(var(--primary));
}

/* Handsontable ManualRowMove 占位引导线 */
:deep(.ht__manualRowMove--guideline),
:deep(.ht__manualRowMove--guide) {
  background: hsl(var(--primary)) !important;
  opacity: 0.85;
}

/* 预警悬停：对应费用行底色变红 */
:deep(.handsontable td.ht-fee-warning-highlight) {
  background: #ffccc7 !important;
}
</style>

<style lang="scss">
/* 挂到 body，需非 scoped，避免 Handsontable 裁切单元格内绝对定位提示 */
.fee-reject-help-floating-tip {
  position: fixed;
  z-index: 11000;
  max-width: 320px;
  padding: 8px 10px;
  font-size: 12px;
  line-height: 1.5;
  color: #fff;
  pointer-events: none;
  background: rgb(0 0 0 / 85%);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgb(0 0 0 / 18%);
}
</style>
