<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue';
import { useVbenModal } from '@vben/common-ui';
import { Plus, Copy, IconifyIcon } from '@vben/icons';
import dayjs from 'dayjs';
import {
  Button,
  message,
  Select,
  Modal as AntModal,
  InputNumber,
  DropdownButton,
  Menu,
  MenuItem,
  Popover,
} from 'ant-design-vue';

// 导入 composables
import { useBatchAddData } from './composables/useBatchAddData';
import { useBatchAddDropdownSources } from './composables/useBatchAddDropdownSources';
import { useBatchAddColumns } from './composables/useBatchAddColumns';
import { useBatchAddSettings } from './composables/useBatchAddSettings';
import { useBatchAddActions } from './composables/useBatchAddActions';
import { usePortRemoteAutocomplete } from './composables/usePortRemoteAutocomplete';
import { useCarrierRemoteAutocomplete } from './composables/useCarrierRemoteAutocomplete';
import { useBookingAgentRemoteAutocomplete } from './composables/useBookingAgentRemoteAutocomplete';

// 导入核心表格组件
import BatchAddTableCore from './batch-add-table-core.vue';
// 导入列配置组件
import ColumnConfigModal from './column-config-modal.vue';

// 导入编辑接口
import { batchEditSimpleSeFreiPrice } from '#/api/sea-export/freight-rate-admin';

// 导入 store
import { useBaseStore } from '#/store/base';

const emit = defineEmits<{ success: [] }>();

// ==================== 使用 Composables ====================

const {
  dataSource,
  selectedRowKeys,
  addedCtnTypes,
  defaultCurrencyId,
  addRow,
  deleteSelectedRows,
  copySelectedRows,
  validateForm,
  prepareSubmitData,
  reset,
} = useBatchAddData();

// ==================== 编辑模式管理 ====================

// 是否为编辑模式
const isEditMode = ref(false);

// ==================== AI 数据管理 ====================

// 存储AI识别的数据
const aiData = ref<any[] | undefined>(undefined);

/**
 * 生成唯一行 key
 */
function generateRowKey(): string {
  return `freight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 处理 AI 识别的数据
 */
async function handleAIData(aiDataList: any[]) {
  console.log('🤖 开始处理 AI 数据:', aiDataList);

  // 确保下拉选项已加载
  if (allCtnOptions.value.length === 0) {
    await initDropdownSources(defaultCurrencyId);
  }

  // 收集 AI 数据中的所有箱型
  const aiCtnTypes = new Set<string>();
  aiDataList.forEach((row: any, index: number) => {
    console.log(`🔍 检查第${index + 1}条数据的箱型:`, row.seFreiPriceCtns);
    if (row.seFreiPriceCtns && Array.isArray(row.seFreiPriceCtns)) {
      row.seFreiPriceCtns.forEach((ctn: any) => {
        if (ctn.ctnCodeId) {
          aiCtnTypes.add(String(ctn.ctnCodeId));
        }
      });
    }
  });

  console.log('📊 AI 数据中发现的箱型 IDs:', Array.from(aiCtnTypes));

  // 将 AI 数据中的箱型添加到 addedCtnTypes
  const newAddedCtnTypes: Array<{ ctnCodeId: string; ctnName: string }> = [];
  aiCtnTypes.forEach((ctnCodeId) => {
    // 检查是否已添加
    const exists = addedCtnTypes.value.some(
      (ctn) => String(ctn.ctnCodeId) === String(ctnCodeId),
    );

    if (!exists) {
      // 查找箱型名称
      const ctnOption = allCtnOptions.value.find(
        (c) => String(c.ctnCodeId) === String(ctnCodeId),
      );
      if (ctnOption) {
        newAddedCtnTypes.push({
          ctnCodeId: String(ctnOption.ctnCodeId), // ✅ 转换为字符串类型
          ctnName: ctnOption.ctnName,
        });
      } else {
        console.warn(`⚠️ 未找到箱型ID ${ctnCodeId} 对应的名称`);
      }
    }
  });

  // 如果有新的箱型需要添加
  if (newAddedCtnTypes.length > 0) {
    addedCtnTypes.value.push(...newAddedCtnTypes);
    console.log('✅ 添加了', newAddedCtnTypes.length, '个新箱型到列配置');
  }

  // 等待列配置更新
  await nextTick();
  await nextTick();

  // 港口/船公司：嵌套 DTO 优先，否则按 id 拉详情写入远程缓存
  await ensurePortLabelsByIds(
    aiDataList.flatMap((row) => [row.polId, row.podId, row.poT1Id, row.poT2Id]),
  );
  await ensureCarrierLabelsByIds(aiDataList.map((row) => row.carrierId));
  for (const row of aiDataList) {
    resolveBookingAgentLabelFromRow(row);
  }

  // ⚠️ 关键修复：辅助函数 - 将 ID 转换为显示名称（用于 Handsontable 下拉框）
  const convertIdToLabel = (
    id: any,
    type: 'carriers' | 'ports' | 'currencies' | 'clients',
  ): string => {
    if (!id) return '';

    switch (type) {
      case 'carriers':
        return getCachedCarrierLabel(id) || getCarrierName(id);
      case 'ports':
        return getCachedPortLabel(id) || getPortName(id, portIdToLabel.value);
      case 'currencies':
        return getCurrencyName(id);
      case 'clients':
        return getCachedBookingAgentLabel(id) || getClientName(id);
      default:
        return String(id);
    }
  };

  // 转换 AI 数据格式以适应表格结构
  const transformedAiData = aiDataList.map((row, index) => {
    console.log(`🔍 转换第 ${index + 1} 条数据:`, {
      id: row.id,
      carrierId: row.carrierId,
    });

    // ⚠️ 关键修复：将所有 ID 字段转换为对应的显示名称（Handsontable 下拉框需要名称而非 ID）
    const carrierName =
      resolveCarrierLabelFromRow(row) ||
      convertIdToLabel(row.carrierId, 'carriers');
    const polName =
      resolvePortLabelFromRow(row, 'pol') ||
      convertIdToLabel(row.polId, 'ports');
    const podName =
      resolvePortLabelFromRow(row, 'pod') ||
      convertIdToLabel(row.podId, 'ports');
    const currencyName = convertIdToLabel(row.currencyId, 'currencies');
    const bookingAgentName =
      resolveBookingAgentLabelFromRow(row) ||
      convertIdToLabel(row.bookingAgentId, 'clients');
    const poT1Name =
      resolvePortLabelFromRow(row, 'poT1') ||
      convertIdToLabel(row.poT1Id, 'ports');
    const poT2Name =
      resolvePortLabelFromRow(row, 'poT2') ||
      convertIdToLabel(row.poT2Id, 'ports');

    // 构建行对象，包含所有字段（使用名称而非 ID）
    const transformedRow: any = {
      _rowKey: generateRowKey(),
      _isCopied: false,
      _originalId: row.id, // ✅ 保留原始 ID 用于编辑模式
      recommend: row.recommend || false,
      carrierId: carrierName, // ✅ 使用名称
      polId: polName, // ✅ 使用名称
      podId: podName, // ✅ 使用名称
      isDirect: (row.isDirect ?? true) ? '是' : '否', // ✅ 转换为"是/否"文本
      poT1Id: poT1Name, // ✅ 使用名称
      poT2Id: poT2Name, // ✅ 使用名称
      polFreeDays: row.polFreeDays,
      podFreeDays: row.podFreeDays,
      poddem: row.poddem,
      poddet: row.poddet,
      voyage: row.voyage || '',
      contractNo: row.contractNo || '',
      etd: row.etd || '',
      closeDocTime: row.closeDocTime || '',
      closingTime: row.closingTime || '',
      etdDayOfWeek: row.etdDayOfWeek,
      closeDocDayOfWeek: row.closeDocDayOfWeek,
      closeDocDayTime: row.closeDocDayTime || '',
      closingDayOfWeek: row.closingDayOfWeek,
      closingDayTime: row.closingDayTime || '',
      validTimeStart: row.validTimeStart
        ? dayjs(row.validTimeStart).format('YYYY-MM-DD')
        : '',
      validTimeEnd: row.validTimeEnd
        ? dayjs(row.validTimeEnd).format('YYYY-MM-DD')
        : '',
      remark: row.remark || '',
      currencyId: currencyName, // ✅ 使用名称
      bookingAgentId: bookingAgentName, // ✅ 使用名称
      seFreiPriceCtns: row.seFreiPriceCtns || [],
    };

    // ⚠️ 关键修复：为每个箱型设置动态字段值（Handsontable 使用这些字段）
    if (row.seFreiPriceCtns && Array.isArray(row.seFreiPriceCtns)) {
      row.seFreiPriceCtns.forEach((ctn: any) => {
        const dynamicField = `ctn_${String(ctn.ctnCodeId)}`;
        transformedRow[dynamicField] = ctn.cost;
      });
    }

    console.log(
      `✅ 转换后的第 ${index + 1} 条数据 _originalId:`,
      transformedRow._originalId,
    );
    return transformedRow;
  });

  console.log('🔄 转换后的 AI 数据:', transformedAiData);

  // 替换 dataSource
  dataSource.value = transformedAiData;

  // 等待数据更新后，同步到 Handsontable
  await nextTick();

  if (coreTableRef.value?.hotTableRef?.hotInstance) {
    const hotInstance = coreTableRef.value.hotTableRef.hotInstance;

    // 更新 Handsontable 的数据和列配置
    hotInstance.updateSettings({
      data: transformedAiData,
      columns: hotColumns.value,
    });

    console.log(
      '✅ AI 数据已加载到 Handsontable，共',
      transformedAiData.length,
      '条记录',
    );
  }

  message.success(`已加载 ${transformedAiData.length} 条数据`);
}

const {
  allCtnOptions,
  labelCache,
  updateLabelCache,
  getCarrierName,
  getPortName,
  getCurrencyName,
  getClientName,
  initDropdownSources,
} = useBatchAddDropdownSources();

const {
  portLabelToId,
  portIdToLabel,
  createPortSource,
  resolvePortLabelFromRow,
  ensurePortLabelsByIds,
  clearPortCache,
  getCachedPortLabel,
} = usePortRemoteAutocomplete();

const {
  carrierLabelToId,
  createCarrierSource,
  resolveCarrierLabelFromRow,
  ensureCarrierLabelsByIds,
  clearCarrierCache,
  getCachedCarrierLabel,
} = useCarrierRemoteAutocomplete();

const {
  bookingAgentLabelToId,
  createBookingAgentSource,
  resolveBookingAgentLabelFromRow,
  clearBookingAgentCache,
  getCachedBookingAgentLabel,
} = useBookingAgentRemoteAutocomplete();

interface BatchAddTableCoreInstance {
  hotTableRef: any;
  handleOpenDropdown: (
    rowIndex: number,
    colIndex: number,
    field: string,
    source: string[],
  ) => void;
}

const coreTableRef = ref<BatchAddTableCoreInstance | null>(null);

function resolveActiveAutocompleteEditor() {
  const table = coreTableRef.value?.hotTableRef;
  const hot =
    table?.hotInstance ??
    table?.value?.hotInstance ??
    table?.hot?.hotInstance ??
    null;
  const editor = hot?.getActiveEditor?.() ?? null;
  if (editor?.htEditor && editor?.updateChoicesList) {
    return editor;
  }
  return null;
}

const portSource = createPortSource(resolveActiveAutocompleteEditor);
const carrierSource = createCarrierSource(resolveActiveAutocompleteEditor);
const bookingAgentSource = createBookingAgentSource(
  resolveActiveAutocompleteEditor,
);

const actions = useBatchAddActions(
  dataSource,
  selectedRowKeys,
  addedCtnTypes,
  allCtnOptions,
  validateForm,
  prepareSubmitData,
  reset,
  emit,
);

const currentOptionsCache = computed(() => ({
  carriers: Array.from(labelCache.value.carriers.entries()).map(
    ([id, name]) => ({
      label: name,
      value: Number(id),
    }),
  ),
  ports: Array.from(labelCache.value.ports.entries()).map(([id, name]) => ({
    label: name,
    value: id,
  })),
  currencies: Array.from(labelCache.value.currencies.entries()).map(
    ([id, code]) => ({
      label: code,
      value: Number(id),
    }),
  ),
  clients: Array.from(labelCache.value.clients.entries()).map(([id, name]) => ({
    label: name,
    value: Number(id),
  })),
}));

// Handsontable 下拉框需要的字符串数组格式
const dropdownSourceCache = computed(() => {
  // Map 对象需要使用 Array.from() 或展开运算符转换为数组
  const result = {
    carriers: Array.from(labelCache.value.carriers.values()),
    ports: Array.from(labelCache.value.ports.values()),
    currencies: Array.from(labelCache.value.currencies.values()),
    clients: Array.from(labelCache.value.clients.values()),
  };

  return result;
});

// Label 到 ID 的反向映射（港口/船公司/订舱代理优先用远程搜索运行时缓存）
const labelToIdMap = computed(() => {
  const ports = new Map<string, string>(
    Array.from(labelCache.value.ports.entries()).map(([id, name]) => [
      name,
      id,
    ]),
  );
  for (const [label, id] of portLabelToId.value.entries()) {
    ports.set(label, id);
  }

  const carriers = new Map<string, string>(
    Array.from(labelCache.value.carriers.entries()).map(([id, name]) => [
      name,
      id,
    ]),
  );
  for (const [label, id] of carrierLabelToId.value.entries()) {
    carriers.set(label, id);
  }

  const clients = new Map<string, string>(
    Array.from(labelCache.value.clients.entries()).map(([id, name]) => [
      name,
      id,
    ]),
  );
  for (const [label, id] of bookingAgentLabelToId.value.entries()) {
    clients.set(label, id);
  }

  return {
    carriers,
    ports,
    currencies: new Map<string, string>(
      Array.from(labelCache.value.currencies.entries()).map(([id, code]) => [
        code,
        id,
      ]),
    ),
    clients,
  };
});

const sortableFieldsSet = new Set<string>([
  'carrierId',
  'polId',
  'podId',
  'currencyId',
]);
const sortState = ref<{ field: string | null; order: 'asc' | 'desc' | null }>({
  field: null,
  order: null,
});

const getSortIcon = (field: string): string => {
  if (sortState.value.field !== field) return '';
  return sortState.value.order === 'asc' ? '↑' : '↓';
};

const handleColumnSort = (field: string, order: 'asc' | 'desc') => {
  sortState.value = { field, order };
};

const getColumnIndex = (field: string): number => {
  const columns = hotColumns.value;
  if (!columns || !Array.isArray(columns)) return -1;
  return columns.findIndex((col: any) => col.data === field);
};

const handleOpenDropdown = (
  rowIndex: number,
  colIndex: number,
  field: string,
  source: string[],
) => {
  coreTableRef.value?.handleOpenDropdown(rowIndex, colIndex, field, source);
};

const linkage = {
  handleIsDirectChange: (row: any, value: boolean) => {
    if (value) {
      row.poT1Id = undefined;
      row.poT2Id = undefined;
    }
  },
  handleSwitchToDateTimeMode: (row: any) => {
    row.etdDayOfWeek = undefined;
    row.closeDocDayOfWeek = undefined;
    row.closeDocDayTime = undefined;
    row.closingDayOfWeek = undefined;
    row.closingDayTime = undefined;
  },
  handleSwitchToWeekMode: (row: any) => {
    row.etd = '';
    row.closeDocTime = '';
    row.closingTime = '';
  },
};

const { hotColumns } = useBatchAddColumns(
  addedCtnTypes,
  { getCarrierName, getPortName, getCurrencyName, getClientName },
  dataSource,
  selectedRowKeys,
  sortableFieldsSet,
  sortState,
  getSortIcon,
  currentOptionsCache,
  dropdownSourceCache,
  labelToIdMap,
  getColumnIndex,
  handleOpenDropdown,
  linkage,
  portSource,
  carrierSource,
  bookingAgentSource,
);

const { hotSettings: rawHotSettings } = useBatchAddSettings(
  dataSource,
  selectedRowKeys,
  hotColumns,
  handleColumnSort,
  linkage,
  { getCarrierName, getPortName, getCurrencyName, getClientName },
  currentOptionsCache,
  dropdownSourceCache,
  getColumnIndex,
  handleOpenDropdown,
  getSortIcon,
);

// ==================== 列配置管理 ====================

// 列配置弹窗可见性
const columnConfigVisible = ref(false);

// 存储用户自定义的列配置
const userColumnConfig = ref<Map<string, any>>(new Map());

// 应用列配置到Handsontable
const applyColumnConfig = (config: any[]) => {
  // 更新用户配置
  config.forEach((colConfig) => {
    userColumnConfig.value.set(colConfig.data, {
      visible: colConfig.visible,
      fixed: colConfig.fixed,
      order: colConfig.order,
    });
  });

  // 获取当前的hotSettings值
  const currentSettings = { ...rawHotSettings.value };

  // 过滤可见列
  const visibleColumns = hotColumns.value.filter((col) => {
    const config = userColumnConfig.value.get(col.data);
    return config ? config.visible !== false : true;
  });

  // 分离不同类型的列
  const leftFixedColumns: any[] = [];
  const rightFixedColumns: any[] = [];
  const normalColumns: any[] = [];

  visibleColumns.forEach((col) => {
    const config = userColumnConfig.value.get(col.data);
    if (config?.fixed === 'left') {
      leftFixedColumns.push(col);
    } else if (config?.fixed === 'right') {
      rightFixedColumns.push(col);
    } else {
      normalColumns.push(col);
    }
  });

  // 按order排序每种类型的列
  const sortColumnsByOrder = (cols: any[]) => {
    return [...cols].sort((a, b) => {
      const orderA = userColumnConfig.value.get(a.data)?.order ?? 999;
      const orderB = userColumnConfig.value.get(b.data)?.order ?? 999;
      return orderA - orderB;
    });
  };

  const sortedLeftFixed = sortColumnsByOrder(leftFixedColumns);
  const sortedNormal = sortColumnsByOrder(normalColumns);
  const sortedRightFixed = sortColumnsByOrder(rightFixedColumns);

  // 组合最终的列顺序：左侧固定 + 普通 + 右侧固定
  const finalColumns = [
    ...sortedLeftFixed,
    ...sortedNormal,
    ...sortedRightFixed,
  ];

  // 计算固定列数量
  const fixedColumnsLeft = sortedLeftFixed.length;
  const fixedColumnsRight = sortedRightFixed.length;

  // 创建新的hotSettings
  const newHotSettings = {
    ...currentSettings,
    columns: finalColumns,
    fixedColumnsLeft: fixedColumnsLeft,
    fixedColumnsRight: fixedColumnsRight,
  };

  // 更新shallowRef
  hotSettings.value = newHotSettings;

  // 更新Handsontable实例
  if (coreTableRef.value?.hotTableRef?.hotInstance) {
    coreTableRef.value.hotTableRef.hotInstance.updateSettings({
      columns: finalColumns,
      fixedColumnsLeft: fixedColumnsLeft,
      fixedColumnsRight: fixedColumnsRight,
    });
  }
};

const hotSettings = shallowRef(rawHotSettings.value);

// 当前列配置（用于列配置弹窗）
const currentColumnConfig = computed(() => {
  return hotColumns.value.map((col: any, index: number) => {
    const config = userColumnConfig.value.get(col.data) || {};
    return {
      data: col.data,
      title: typeof col.title === 'function' ? col.title() : col.title,
      visible: config.visible ?? true,
      fixed: config.fixed ?? false,
      order: config.order ?? index,
    };
  });
});

// 保存列配置
const saveColumnConfig = (config: any[]) => {
  console.log('💾 保存列配置:', config);

  // 验证是否有可见列
  const visibleCount = config.filter((col) => col.visible).length;
  if (visibleCount === 0) {
    message.warning('至少需要保留一列可见');
    return;
  }

  applyColumnConfig(config);
  columnConfigVisible.value = false;
  message.success('列配置已保存');
};

// 定义 BatchAddTableCore 组件的类型
const loading = computed(() => actions.loading.value);
const customRowCountVisible = computed({
  get: () => actions.customRowCountVisible.value,
  set: (val) => {
    actions.customRowCountVisible.value = val;
  },
});
const customRowCount = computed({
  get: () => actions.customRowCount.value,
  set: (val) => {
    actions.customRowCount.value = val;
  },
});
const selectedCtnId = computed({
  get: () => actions.selectedCtnId.value,
  set: (val) => {
    actions.selectedCtnId.value = val;
  },
});
const availableCtnOptions = computed(() => actions.availableCtnOptions.value);

const [Modal, modalApi] = useVbenModal({
  title: '批量新增运价', // 标题将在模板中动态设置
  confirmLoading: false,
  closeOnClickModal: false,
  draggable: true,
  onConfirm: async () => {
    // ⚠️ 关键修复：在提交前，先从 Handsontable 同步最新数据到 dataSource
    if (coreTableRef.value?.hotTableRef?.hotInstance) {
      const hotInstance = coreTableRef.value.hotTableRef.hotInstance;

      const hotData = hotInstance.getSourceData();
      console.log(
        '🔍 Handsontable getSourceData() 返回的数据类型:',
        Array.isArray(hotData) ? '数组' : '其他',
        hotData,
      );

      if (hotData && hotData.length > 0) {
        // ⚠️ 关键修复：getSourceData() 返回的是对象数组，不是二维数组
        // 直接使用这些数据，但需要保留额外字段
        const objectData = hotData.map((hotRow: any, rowIndex: number) => {
          const rowObject: any = {};

          // 如果 hotRow 已经是对象，直接复制所有字段
          if (typeof hotRow === 'object' && !Array.isArray(hotRow)) {
            Object.assign(rowObject, hotRow);
          } else if (Array.isArray(hotRow)) {
            // 如果是数组（兼容旧逻辑），按列映射
            const columns = hotInstance.getSettings().columns;
            columns.forEach((col: any, index: number) => {
              if (col.data && hotRow[index] !== undefined) {
                rowObject[col.data] = hotRow[index];
              }
            });
          }

          // ⚠️ 关键修复：从 dataSource 中保留额外字段（如 _originalId, _rowKey, seFreiPriceCtns 等）
          const originalRow = dataSource.value[rowIndex];
          if (originalRow) {
            // 保留以下关键字段（优先级：原始数据 > Handsontable 数据）
            if (originalRow._originalId && !rowObject._originalId) {
              rowObject._originalId = originalRow._originalId;
            }
            if (originalRow._rowKey && !rowObject._rowKey) {
              rowObject._rowKey = originalRow._rowKey;
            }
            if (
              originalRow._isCopied !== undefined &&
              rowObject._isCopied === undefined
            ) {
              rowObject._isCopied = originalRow._isCopied;
            }
            if (originalRow.seFreiPriceCtns && !rowObject.seFreiPriceCtns) {
              rowObject.seFreiPriceCtns = originalRow.seFreiPriceCtns;
            }
          }

          return rowObject;
        });

        console.log(
          '📊 同步后的数据（检查 _originalId 和其他字段）:',
          objectData.map((row: any) => ({
            _originalId: row._originalId,
            carrierId: row.carrierId,
            polId: row.polId,
            podId: row.podId,
          })),
        );

        dataSource.value = objectData;
      }
    }

    // 根据模式调用不同的提交逻辑；仅成功时关弹窗
    if (isEditMode.value) {
      await handleEditSubmit(labelToIdMap.value);
    } else {
      const ok = await actions.handleSubmit(labelToIdMap.value);
      if (ok) {
        modalApi.close();
      }
    }
  },
  onCancel: () => {
    modalApi.close();
  },
  onOpened: async () => {
    console.log('📦 弹窗已打开');

    // 获取传递的数据
    const data = modalApi.getData<any>();
    aiData.value = data.aiData;
    isEditMode.value = data.isEditMode || false; // 设置编辑模式标志
    console.log('当前 AI 数据:', aiData.value);
    console.log('是否为编辑模式:', isEditMode.value);

    // Clear remote-search caches each open
    clearPortCache();
    clearCarrierCache();
    clearBookingAgentCache();

    // ✅ 关键修复：确保下拉选项已加载
    if (allCtnOptions.value.length === 0) {
      await initDropdownSources(defaultCurrencyId);
    }

    // ✅ 关键修复：每次打开弹窗时都重新初始化默认箱型
    // 从 allCtnOptions 中筛选出 status 为 0 且 isDefault 为 true 的箱型
    // 注意：由于 store 中只缓存了必要字段，这里简化处理，使用所有箱型作为默认箱型
    if (addedCtnTypes.value.length === 0 && allCtnOptions.value.length > 0) {
      // 尝试从 baseStore 获取原始箱型数据以筛选默认箱型
      const baseStore = useBaseStore();
      const defaultCtns = baseStore.ctnOptions
        .filter((ctn) => ctn.isDefault === true)
        .map((ctn) => ({
          ctnCodeId: String(ctn.ctnCodeId),
          ctnName: ctn.ctnName,
        }));

      addedCtnTypes.value = defaultCtns;
      console.log('✅ 已初始化默认箱型:', addedCtnTypes.value.length, '个');
    }

    // 等待 DOM 和列配置完全初始化
    await nextTick();
    await nextTick();

    // 如果有 AI 数据，则处理并填充表格
    if (aiData.value && aiData.value.length > 0) {
      console.log(
        '✅ 检测到 AI 数据，开始处理:',
        aiData.value.length,
        '条记录',
      );
      await handleAIData(aiData.value);
    } else {
      // 如果没有 AI 数据且表格为空，则添加一行空数据（仅在新增模式下）
      if (dataSource.value.length === 0 && !isEditMode.value) {
        addRow(1);
        await nextTick();
      }
    }

    // 确保 Handsontable 使用最新的数据源和列配置
    if (coreTableRef.value?.hotTableRef?.hotInstance) {
      coreTableRef.value.hotTableRef.hotInstance.updateSettings({
        columns: hotColumns.value,
      });
    }
  },
});

// ==================== 编辑提交处理 ====================

/**
 * 处理编辑提交
 */
async function handleEditSubmit(labelToIdMapValue: any) {
  console.log('📝 开始编辑提交');

  // 验证表单
  if (!validateForm()) {
    return;
  }

  try {
    // 设置加载状态
    actions.loading.value = true;

    // 准备提交数据
    const submitDataList: any[] = [];

    dataSource.value.forEach((row: any) => {
      // 检查是否有原始 ID（编辑模式必须有 ID）
      if (!row._originalId) {
        console.warn('⚠️ 跳过没有 ID 的行:', row);
        return;
      }

      // 将 Label 转换回 ID
      const carrierId = labelToIdMapValue.carriers.get(row.carrierId);
      const polId = labelToIdMapValue.ports.get(row.polId);
      const podId = labelToIdMapValue.ports.get(row.podId);
      const currencyId = labelToIdMapValue.currencies.get(row.currencyId);
      const bookingAgentId = labelToIdMapValue.clients.get(row.bookingAgentId);
      const poT1Id = labelToIdMapValue.ports.get(row.poT1Id);
      const poT2Id = labelToIdMapValue.ports.get(row.poT2Id);

      // 构建提交数据（使用 SeFreiPriceSimpleEditDto 格式）
      const submitData: any = {
        id: row._originalId,
        recommend: row.recommend,
        carrierId: carrierId,
        polId: polId,
        podId: podId,
        isDirect: row.isDirect === '是',
        poT1Id: poT1Id,
        poT2Id: poT2Id,
        polFreeDays: row.polFreeDays,
        podFreeDays: row.podFreeDays,
        poddem: row.poddem,
        poddet: row.poddet,
        voyage: row.voyage || undefined,
        contractNo: row.contractNo || undefined,
        validTimeStart: row.validTimeStart || undefined,
        validTimeEnd: row.validTimeEnd || undefined,
        remark: row.remark || undefined,
        currencyId: currencyId,
        bookingAgentId: bookingAgentId || null,
      };

      // 辅助函数：将星期字符串转换为数字 (DayOfWeek 枚举)
      const convertDayOfWeekToNumber = (dayStr: any): number | undefined => {
        if (dayStr === undefined || dayStr === null || dayStr === '')
          return undefined;

        const dayMap: Record<string, number> = {
          星期日: 0,
          星期一: 1,
          星期二: 2,
          星期三: 3,
          星期四: 4,
          星期五: 5,
          星期六: 6,
        };

        return dayMap[dayStr];
      };

      // 处理日期时间模式
      if (row.etd || row.closeDocTime || row.closingTime) {
        submitData.seFreiPriceDays = [
          {
            etd: row.etd || undefined,
            closeDocTime: row.closeDocTime || undefined,
            closingTime: row.closingTime || undefined,
          },
        ];
      }

      // 处理星期模式（转换星期为数字）
      if (
        row.etdDayOfWeek !== undefined ||
        row.closeDocDayOfWeek !== undefined ||
        row.closingDayOfWeek !== undefined
      ) {
        submitData.seFreiPriceWeekDays = [
          {
            etdDayOfWeek: convertDayOfWeekToNumber(row.etdDayOfWeek),
            etdDayTime: row.etdDayTime || undefined,
            closeDocDayOfWeek: convertDayOfWeekToNumber(row.closeDocDayOfWeek),
            closeDocDayTime: row.closeDocDayTime || undefined,
            closingDayOfWeek: convertDayOfWeekToNumber(row.closingDayOfWeek),
            closingDayTime: row.closingDayTime || undefined,
          },
        ];
      }

      // 处理箱型成本 - 从动态字段中提取
      const seFreiPriceCtns: any[] = [];
      Object.keys(row).forEach((key) => {
        if (key.startsWith('ctn_')) {
          const ctnCodeId = key.replace('ctn_', '');
          const cost = row[key];

          if (cost !== undefined && cost !== null && cost !== '') {
            seFreiPriceCtns.push({
              ctnCodeId,
              cost: Number(cost),
            });
          }
        }
      });

      if (seFreiPriceCtns.length > 0) {
        submitData.seFreiPriceCtns = seFreiPriceCtns;
      }

      submitDataList.push(submitData);
    });

    if (submitDataList.length === 0) {
      message.warning('没有需要提交的数据');
      actions.loading.value = false;
      return;
    }

    console.log('📤 提交编辑数据:', submitDataList);

    // 调用批量编辑接口
    await batchEditSimpleSeFreiPrice(submitDataList);

    message.success('批量编辑成功');
    modalApi.close();
    emit('success');
  } catch (error) {
    console.error('❌ 批量编辑失败:', error);
    message.error('批量编辑失败');
  } finally {
    actions.loading.value = false;
  }
}

watch(
  addedCtnTypes,
  async (newVal, oldVal) => {
    await nextTick();

    if (coreTableRef.value?.hotTableRef?.hotInstance) {
      // ⚠️ 关键修复：直接更新列配置，Handsontable 会自动处理数据绑定
      // 不要使用 getData/loadData，因为这会丢失行对象中的额外字段（如 _rowKey, seFreiPriceCtns 等）
      coreTableRef.value.hotTableRef.hotInstance.updateSettings({
        columns: hotColumns.value,
      });
    }
  },
  { deep: true },
);

defineExpose({
  open: () => {
    if (allCtnOptions.value.length === 0) {
      initDropdownSources(defaultCurrencyId);
    }
    modalApi.open();
  },
  close: () => {
    modalApi.close();
  },
  setData: (data: { aiData?: any[]; isEditMode?: boolean }) => {
    console.log('收到外部设置的数据:', data);
    if (data.aiData && data.aiData.length > 0) {
      aiData.value = data.aiData;
      isEditMode.value = data.isEditMode || false;
      // 如果模态框已经打开，立即处理数据
      handleAIData(data.aiData);
    }
  },
});
</script>

<template>
  <Modal
    :title="isEditMode ? '编辑数据' : '批量新增运价'"
    class="freight-batch-add-modal w-[1400px]"
    :confirm-loading="loading"
  >
    <div class="batch-add">
      <header class="batch-add__hero">
        <div class="batch-add__hero-main">
          <span class="batch-add__hero-icon" aria-hidden="true">
            <IconifyIcon
              :icon="isEditMode ? 'mdi:table-edit' : 'mdi:table-plus'"
            />
          </span>
          <div class="batch-add__hero-text">
            <div class="batch-add__hero-title">
              {{ isEditMode ? '批量编辑运价明细' : '批量新增运价' }}
            </div>
            <p class="batch-add__hero-sub">
              {{
                isEditMode
                  ? '每一行独立修改后统一提交；带 * 的列为必填'
                  : '可一次录入多行运价；支持复制行、追加箱型列与列配置'
              }}
            </p>
          </div>
        </div>
        <div class="batch-add__hero-meta">
          <span class="batch-add__count-chip">
            当前
            <em>{{ dataSource.length }}</em>
            行
          </span>
          <span
            v-if="selectedRowKeys.length > 0"
            class="batch-add__count-chip batch-add__count-chip--selected"
          >
            已选
            <em>{{ selectedRowKeys.length }}</em>
          </span>
          <Popover placement="bottomRight">
            <template #content>
              <ul class="batch-add__tips">
                <li v-if="!isEditMode">「新增行」可一次追加 1 / 5 / 10 行</li>
                <li v-if="!isEditMode">选中行后可复制或删除</li>
                <li>「添加箱型」可为表格追加箱型成本列</li>
                <li>齿轮按钮可配置列显隐与顺序</li>
              </ul>
            </template>
            <button type="button" class="batch-add__help-btn" title="操作说明">
              <IconifyIcon icon="mdi:help-circle-outline" />
            </button>
          </Popover>
        </div>
      </header>

      <section class="batch-add__section">
        <header class="batch-add__section-head">
          <div class="batch-add__section-title">
            <span class="batch-add__section-icon">
              <IconifyIcon icon="mdi:view-list-outline" />
            </span>
            <span class="batch-add__section-text">运价明细</span>
            <span class="batch-add__section-hint">
              共 {{ addedCtnTypes.length }} 个箱型列
            </span>
          </div>

          <div class="batch-add__section-actions">
            <template v-if="!isEditMode">
              <DropdownButton type="primary" size="small" @click="addRow(1)">
                <template #icon><Plus class="size-4" /></template>
                新增行
                <template #overlay>
                  <Menu>
                    <MenuItem @click="addRow(5)">新增 5 行</MenuItem>
                    <MenuItem @click="addRow(10)">新增 10 行</MenuItem>
                    <MenuItem @click="actions.showCustomRowCountModal">
                      新增自定义行数
                    </MenuItem>
                  </Menu>
                </template>
              </DropdownButton>
              <Button
                size="small"
                :disabled="selectedRowKeys.length === 0"
                @click="actions.handleCopyRows(copySelectedRows)"
              >
                <Copy class="size-4" />
                复制选中行
              </Button>
              <Button
                danger
                size="small"
                :disabled="selectedRowKeys.length === 0"
                @click="actions.handleDeleteRows(deleteSelectedRows)"
              >
                删除选中行
              </Button>
              <span class="batch-add__action-divider" aria-hidden="true" />
            </template>

            <span class="batch-add__action-label">添加箱型</span>
            <Select
              v-model:value="selectedCtnId"
              class="batch-add__ctn-select"
              placeholder="选择箱型"
              show-search
              size="small"
              :filter-option="actions.filterCtnOption"
              :options="availableCtnOptions"
              :field-names="{ label: 'ctnName', value: 'ctnCodeId' }"
              @change="actions.handleAddCtnType"
            />
            <div class="batch-add__column-config">
              <Button
                shape="circle"
                size="small"
                class="batch-add__column-config-btn"
                title="表格列配置"
                @click="columnConfigVisible = !columnConfigVisible"
              >
                <span class="icon-[ant-design--setting-outlined]"></span>
              </Button>
              <ColumnConfigModal
                v-model="columnConfigVisible"
                :columns="currentColumnConfig"
                @save="saveColumnConfig"
              />
            </div>
          </div>
        </header>

        <div class="batch-add__section-body">
          <BatchAddTableCore
            ref="coreTableRef"
            v-model:selected-row-keys="selectedRowKeys"
            :data-source="dataSource"
            :hot-settings="hotSettings"
            :label-to-id-map="labelToIdMap"
          />
        </div>
      </section>
    </div>

    <AntModal
      v-model:open="customRowCountVisible"
      title="设置新增行数"
      :mask-closable="false"
      @ok="actions.handleConfirmCustomRowCount(addRow)"
    >
      <div class="batch-add__custom-rows">
        <label class="batch-add__custom-rows-label">
          请输入要新增的行数（1–100）
        </label>
        <InputNumber
          v-model:value="customRowCount"
          :min="1"
          :max="100"
          class="batch-add__custom-rows-input"
          placeholder="请输入行数"
        />
      </div>
    </AntModal>
  </Modal>
</template>

<style scoped lang="scss">
@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.batch-add {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 600px;
  padding: 2px 2px 4px;
}

.batch-add__hero {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 12px 16px;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 12%) 0%,
    hsl(var(--primary) / 4%) 55%,
    #fff 100%
  );
  border: 1px solid hsl(var(--primary) / 22%);
  border-radius: 12px;
  box-shadow: 0 2px 8px hsl(var(--primary) / 8%);
  animation: fade-in 0.35s ease;
}

.batch-add__hero-main {
  display: flex;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.batch-add__hero-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: #006ce6;
  background: #fff;
  border: 1px solid hsl(var(--primary) / 20%);
  border-radius: 10px;
}

.batch-add__hero-text {
  min-width: 0;
}

.batch-add__hero-title {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: #1a2332;
}

.batch-add__hero-sub {
  margin: 2px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: #8c95a3;
}

.batch-add__hero-meta {
  display: flex;
  flex-shrink: 0;
  gap: 8px;
  align-items: center;
}

.batch-add__count-chip {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 500;
  color: #006ce6;
  background: #eaf2ff;
  border: 1px solid #d6e6ff;
  border-radius: 999px;

  em {
    font-style: normal;
    font-weight: 700;
  }

  &--selected {
    color: #0d9488;
    background: #e6fffa;
    border-color: #99f6e4;
  }
}

.batch-add__help-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  font-size: 16px;
  color: #8c95a3;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e4e8ef;
  border-radius: 8px;
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease;

  &:hover {
    color: #006ce6;
    background: #f4f8ff;
    border-color: #c9dcff;
  }
}

.batch-add__tips {
  padding: 0 0 0 18px;
  font-size: 12px;
  line-height: 1.7;
  color: #64748b;
  list-style: disc;
}

.batch-add__section {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e8ecf3;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgb(16 42 83 / 5%);
  transition: box-shadow 0.25s ease;

  &:hover {
    box-shadow: 0 4px 14px rgb(16 42 83 / 8%);
  }
}

.batch-add__section-head {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  gap: 10px 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 52px;
  padding: 10px 14px;
  background: linear-gradient(90deg, #f4f8ff 0%, #fafbfd 55%, #fff 100%);
  border-bottom: 1px solid #e4e8ef;
}

.batch-add__section-title {
  display: flex;
  gap: 8px;
  align-items: center;
  min-width: 0;
}

.batch-add__section-icon {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: 15px;
  color: #006ce6;
  background: #eaf2ff;
  border-radius: 8px;
}

.batch-add__section-text {
  font-size: 14px;
  font-weight: 600;
  color: #252a31;
  white-space: nowrap;
}

.batch-add__section-hint {
  font-size: 12px;
  color: #9aa3af;
}

.batch-add__section-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.batch-add__action-label {
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
  white-space: nowrap;
}

.batch-add__action-divider {
  width: 1px;
  height: 20px;
  margin: 0 2px;
  background: #e4e8ef;
}

.batch-add__ctn-select {
  width: 180px;
}

.batch-add__column-config {
  position: relative;
  display: inline-block;
}

.batch-add__column-config-btn {
  transition:
    color 0.2s ease,
    border-color 0.2s ease,
    background 0.2s ease,
    transform 0.2s ease;

  &:hover {
    color: #006ce6;
    background: #f4f8ff;
    border-color: #c9dcff;
    transform: rotate(45deg);
  }

  span[class^='icon-'] {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 2px;
    font-size: 16px;
  }
}

.batch-add__section-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  padding: 12px;
  overflow: hidden;

  :deep(.handsontable-container) {
    flex: 1;
    overflow: hidden;
    border: 1px solid #e4e8ef;
    border-radius: 8px;
  }

  :deep(.ht_master .wtHolder),
  :deep(.ht_clone_top .wtHolder) {
    border-radius: 8px;
  }

  :deep(.handsontable thead th) {
    font-weight: 600;
    color: #252a31;
    background: #f4f8ff !important;
  }

  :deep(.handsontable tbody tr:hover td) {
    background: #fafbfd;
  }
}

.batch-add__custom-rows {
  padding: 8px 0 4px;
}

.batch-add__custom-rows-label {
  display: block;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 500;
  color: #475569;
}

.batch-add__custom-rows-input {
  width: 100%;
}
</style>
